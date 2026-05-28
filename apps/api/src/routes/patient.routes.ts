import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { query, queryOne } from '../db'
import { sendMessage } from '../services/whatsapp.service'
import path from 'path'
import { createReadStream } from 'fs'

// ── Helper: gerar código de convite (6 chars alfanum maiúsculo) ───────────────
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sem 0/O/1/I confusos
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// ── Patient JWT middleware ──────────────────────────────────────────────────
async function authenticatePatient(request: any, reply: any) {
  try {
    await request.jwtVerify()
    if (request.user.role !== 'patient') {
      return reply.code(403).send({ error: 'Acesso negado' })
    }
  } catch {
    return reply.code(401).send({ error: 'Token inválido ou expirado' })
  }
}

// ── Helper: current week start (Monday BRT) ────────────────────────────────
function currentWeekStart(): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const day = now.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return monday.toISOString().slice(0, 10)
}

// ── Routes ─────────────────────────────────────────────────────────────────
export async function patientRoutes(app: FastifyInstance) {

  // ── AUTH ────────────────────────────────────────────────────────────────

  /**
   * POST /api/patient/auth/request
   * Nutritionist-authenticated: generate magic link and send via WhatsApp
   */
  app.post('/auth/request', {
    onRequest: [(app as any).authenticate]
  }, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user

    const schema = z.object({ clientId: z.string().uuid() })
    const { clientId } = schema.parse(request.body)

    // Verify client belongs to this nutritionist
    const client = await queryOne<{ id: string; name: string; phone: string }>(
      `SELECT id, name, phone FROM clients WHERE id = $1 AND nutritionist_id = $2`,
      [clientId, nutritionistId]
    )
    if (!client) return reply.code(404).send({ error: 'Cliente não encontrado' })

    // Invalidate old tokens for this client
    await query(`UPDATE patient_tokens SET used_at = NOW() WHERE client_id = $1 AND used_at IS NULL`, [clientId])

    // Generate new token
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72h

    await query(
      `INSERT INTO patient_tokens (client_id, token, expires_at) VALUES ($1, $2, $3)`,
      [clientId, token, expiresAt]
    )

    // Build link — uses DASHBOARD_URL env var
    const baseUrl = process.env.DASHBOARD_URL || 'http://localhost:3000'
    const link = `${baseUrl}/p?token=${token}`

    const firstName = client.name?.split(' ')[0] ?? 'você'
    const message = `Olá, ${firstName}! 👋\n\nAcesse seu portal de acompanhamento clicando no link abaixo:\n\n🔗 ${link}\n\n_O link é válido por 72 horas._`

    // Send via WhatsApp (best-effort — don't fail if WA is disconnected)
    try {
      await sendMessage(client.phone, message)
    } catch (err) {
      console.error('[patient/auth/request] Erro ao enviar WhatsApp:', err)
    }

    return reply.send({ ok: true, link })
  })

  /**
   * POST /api/patient/auth/verify
   * Public: verify magic-link token → issue patient JWT
   */
  app.post('/auth/verify', async (request, reply) => {
    const schema = z.object({ token: z.string().uuid() })
    const { token } = schema.parse(request.body)

    const row = await queryOne<{
      id: string
      client_id: string
      expires_at: string
      used_at: string | null
    }>(
      `SELECT id, client_id, expires_at, used_at FROM patient_tokens WHERE token = $1`,
      [token]
    )

    if (!row) return reply.code(404).send({ error: 'Link inválido' })
    if (row.used_at) return reply.code(409).send({ error: 'Link já utilizado' })
    if (new Date(row.expires_at) < new Date()) return reply.code(410).send({ error: 'Link expirado' })

    // Mark used
    await query(`UPDATE patient_tokens SET used_at = NOW() WHERE id = $1`, [row.id])

    // Fetch client
    const client = await queryOne<{
      id: string; name: string | null; phone: string; goal: string | null; nutritionist_id: string
    }>(
      `SELECT id, name, phone, goal, nutritionist_id FROM clients WHERE id = $1`,
      [row.client_id]
    )
    if (!client) return reply.code(404).send({ error: 'Cliente não encontrado' })

    // Issue 30-day JWT
    const jwt = app.jwt.sign({
      clientId: client.id,
      nutritionistId: client.nutritionist_id,
      role: 'patient',
    }, { expiresIn: '30d' })

    return reply.send({ token: jwt, client })
  })

  // ── AUTH: REGISTRO COM CÓDIGO DE CONVITE ──────────────────────────────────

  /**
   * POST /api/patient/auth/register
   * Público: paciente cria conta usando código de convite do nutri
   */
  app.post('/auth/register', async (request, reply) => {
    const schema = z.object({
      name:        z.string().min(2),
      phone:       z.string().min(8),
      email:       z.string().email().optional(),
      password:    z.string().min(6),
      invite_code: z.string().length(6),
    })
    const body = schema.parse(request.body)

    const code = await queryOne<any>(
      `SELECT * FROM patient_invite_codes WHERE code = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [body.invite_code.toUpperCase()]
    )
    if (!code) return reply.code(400).send({ error: 'Código de convite inválido ou expirado' })

    const existing = await queryOne(
      `SELECT id FROM patient_accounts WHERE nutritionist_id = $1 AND phone = $2`,
      [code.nutritionist_id, body.phone]
    )
    if (existing) return reply.code(409).send({ error: 'Já existe uma conta com este telefone' })

    const hash = await bcrypt.hash(body.password, 10)

    // Get or create clients record
    let clientId: string | null = code.client_id ?? null
    if (!clientId) {
      const phone = body.phone.replace(/\D/g, '')
      const existingClient = await queryOne<{ id: string }>(
        `SELECT id FROM clients WHERE nutritionist_id = $1 AND phone = $2`,
        [code.nutritionist_id, phone]
      )
      if (existingClient) {
        clientId = existingClient.id
      } else {
        const [newClient] = await query<{ id: string }>(
          `INSERT INTO clients (nutritionist_id, name, phone) VALUES ($1, $2, $3) RETURNING id`,
          [code.nutritionist_id, body.name, phone]
        )
        clientId = newClient.id
      }
    }

    if (clientId && body.name) {
      await query(
        `UPDATE clients SET name = $1 WHERE id = $2 AND (name IS NULL OR name = 'Cliente')`,
        [body.name, clientId]
      )
    }

    const [account] = await query<any>(
      `INSERT INTO patient_accounts (nutritionist_id, client_id, name, phone, email, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nutritionist_id, client_id, name, phone, email`,
      [code.nutritionist_id, clientId, body.name, body.phone, body.email ?? null, hash]
    )

    await query(
      `UPDATE patient_invite_codes SET used_at = NOW(), used_by = $1 WHERE id = $2`,
      [account.id, code.id]
    )

    const token = app.jwt.sign(
      { clientId: account.client_id, patientAccountId: account.id, nutritionistId: account.nutritionist_id, role: 'patient' },
      { expiresIn: '30d' }
    )
    return reply.code(201).send({ token, account })
  })

  /**
   * POST /api/patient/auth/login
   * Público: paciente faz login com telefone/email + senha
   */
  app.post('/auth/login', async (request, reply) => {
    const schema = z.object({ login: z.string(), password: z.string() })
    const body = schema.parse(request.body)

    const account = await queryOne<any>(
      `SELECT * FROM patient_accounts WHERE (phone = $1 OR email = $1) AND is_active = true`,
      [body.login]
    )
    if (!account) return reply.code(401).send({ error: 'Credenciais inválidas' })

    const valid = await bcrypt.compare(body.password, account.password_hash)
    if (!valid) return reply.code(401).send({ error: 'Credenciais inválidas' })

    const token = app.jwt.sign(
      { clientId: account.client_id, patientAccountId: account.id, nutritionistId: account.nutritionist_id, role: 'patient' },
      { expiresIn: '30d' }
    )
    const { password_hash, ...safe } = account
    return reply.send({ token, account: safe })
  })

  // ── INVITE CODES (nutricionista gera) ─────────────────────────────────────

  app.post('/invite-codes', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const schema = z.object({ clientId: z.string().uuid().optional() })
    const { clientId } = schema.parse(request.body)

    if (clientId) {
      const c = await queryOne(`SELECT id FROM clients WHERE id = $1 AND nutritionist_id = $2`, [clientId, nutritionistId])
      if (!c) return reply.code(404).send({ error: 'Cliente não encontrado' })
    }

    let code = generateInviteCode()
    for (let i = 0; i < 10; i++) {
      const exists = await queryOne(`SELECT id FROM patient_invite_codes WHERE code = $1`, [code])
      if (!exists) break
      code = generateInviteCode()
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const [row] = await query<any>(
      `INSERT INTO patient_invite_codes (nutritionist_id, code, client_id, expires_at)
       VALUES ($1, $2, $3, $4) RETURNING id, code, client_id, expires_at, created_at`,
      [nutritionistId, code, clientId ?? null, expiresAt]
    )
    return reply.code(201).send({ invite: row })
  })

  app.get('/invite-codes', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const rows = await query<any>(
      `SELECT pic.id, pic.code, pic.expires_at, pic.used_at, pic.created_at,
              c.name AS client_name, c.phone AS client_phone
       FROM patient_invite_codes pic
       LEFT JOIN clients c ON c.id = pic.client_id
       WHERE pic.nutritionist_id = $1 ORDER BY pic.created_at DESC LIMIT 20`,
      [nutritionistId]
    )
    return reply.send({ codes: rows })
  })

  // ── DISPONIBILIDADE + AGENDAMENTO ─────────────────────────────────────────

  app.get('/availability', { onRequest: [authenticatePatient] }, async (request, reply) => {
    const { nutritionistId } = (request as any).user
    const slots = await query<any>(
      `SELECT day_of_week, start_time, end_time, slot_duration FROM availability
       WHERE nutritionist_id = $1 AND is_active = true`,
      [nutritionistId]
    )
    if (slots.length === 0) return reply.send({ dates: [] })

    const booked = await query<{ scheduled_at: string }>(
      `SELECT scheduled_at FROM appointments
       WHERE nutritionist_id = $1 AND status IN ('scheduled','confirmed')
         AND scheduled_at >= NOW() AND scheduled_at < NOW() + INTERVAL '30 days'`,
      [nutritionistId]
    )
    const bookedSet = new Set(booked.map(b => new Date(b.scheduled_at).toISOString().slice(0, 16)))

    const now = new Date()
    const result: { date: string; slots: string[] }[] = []

    for (let d = 0; d < 30; d++) {
      const day = new Date(now)
      day.setDate(now.getDate() + d + 1)
      day.setHours(0, 0, 0, 0)
      const dow = day.getDay()
      const avail = slots.find((s: any) => s.day_of_week === dow)
      if (!avail) continue

      const dateStr = day.toISOString().slice(0, 10)
      const [sh, sm] = avail.start_time.split(':').map(Number)
      const [eh, em] = avail.end_time.split(':').map(Number)
      const startMin = sh * 60 + sm
      const endMin   = eh * 60 + em
      const dur      = avail.slot_duration || 60

      const daySlots: string[] = []
      for (let t = startMin; t + dur <= endMin; t += dur) {
        const hh = String(Math.floor(t / 60)).padStart(2, '0')
        const mm = String(t % 60).padStart(2, '0')
        const iso = `${dateStr}T${hh}:${mm}`
        if (!bookedSet.has(iso)) daySlots.push(`${hh}:${mm}`)
      }
      if (daySlots.length > 0) result.push({ date: dateStr, slots: daySlots })
    }
    return reply.send({ dates: result })
  })

  app.post('/appointments', { onRequest: [authenticatePatient] }, async (request, reply) => {
    const { clientId, nutritionistId } = (request as any).user
    const schema = z.object({
      date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time:     z.string().regex(/^\d{2}:\d{2}$/),
      modality: z.enum(['online', 'presencial']).default('online'),
    })
    const body = schema.parse(request.body)
    const scheduledAt = `${body.date}T${body.time}:00`

    const conflict = await queryOne(
      `SELECT id FROM appointments WHERE nutritionist_id = $1 AND scheduled_at = $2 AND status IN ('scheduled','confirmed')`,
      [nutritionistId, scheduledAt]
    )
    if (conflict) return reply.code(409).send({ error: 'Horário não disponível' })

    const dow = new Date(scheduledAt).getDay()
    const avail = await queryOne<{ slot_duration: number }>(
      `SELECT slot_duration FROM availability WHERE nutritionist_id = $1 AND day_of_week = $2 AND is_active = true`,
      [nutritionistId, dow]
    )
    const duration = avail?.slot_duration ?? 60

    const [appt] = await query<any>(
      `INSERT INTO appointments (nutritionist_id, client_id, scheduled_at, duration, modality, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'scheduled', 'patient') RETURNING id, scheduled_at, duration, modality, status`,
      [nutritionistId, clientId, scheduledAt, duration, body.modality]
    )
    return reply.code(201).send({ appointment: appt })
  })

  // ── PROFILE ─────────────────────────────────────────────────────────────

  /**
   * GET /api/patient/me
   * Returns patient profile + today's summary
   */
  app.get('/me', { onRequest: [authenticatePatient] }, async (request, reply) => {
    const { clientId } = (request as any).user
    const today = new Date().toISOString().slice(0, 10)

    const client = await queryOne<any>(
      `SELECT id, name, phone, goal, notes, birthdate, email FROM clients WHERE id = $1`,
      [clientId]
    )
    if (!client) return reply.code(404).send({ error: 'Cliente não encontrado' })

    // Today's water total
    const waterRow = await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(amount_ml), 0)::text AS total FROM water_logs WHERE client_id = $1 AND logged_at = $2`,
      [clientId, today]
    )
    const waterToday = parseInt(waterRow?.total ?? '0', 10)

    // Latest weight
    const lastWeight = await queryOne<{ weight_kg: string; logged_at: string }>(
      `SELECT weight_kg::text, logged_at::text FROM weight_logs WHERE client_id = $1 ORDER BY logged_at DESC LIMIT 1`,
      [clientId]
    )

    // Next appointment
    const nextAppt = await queryOne<{ scheduled_at: string; status: string }>(
      `SELECT scheduled_at, status FROM appointments
       WHERE client_id = $1 AND status IN ('scheduled','confirmed') AND scheduled_at > NOW()
       ORDER BY scheduled_at ASC LIMIT 1`,
      [clientId]
    )

    // Check-in this week pending?
    const weekStart = currentWeekStart()
    const checkinDone = await queryOne(
      `SELECT id FROM weekly_checkins WHERE client_id = $1 AND week_start = $2`,
      [clientId, weekStart]
    )

    return reply.send({
      client,
      summary: {
        waterToday,
        waterGoalMl: 2000,
        lastWeight: lastWeight ?? null,
        nextAppointment: nextAppt ?? null,
        checkinPending: !checkinDone,
      },
    })
  })

  // ── APPOINTMENTS ─────────────────────────────────────────────────────────

  /**
   * GET /api/patient/appointments
   */
  app.get('/appointments', { onRequest: [authenticatePatient] }, async (request, reply) => {
    const { clientId } = (request as any).user

    const rows = await query<any>(
      `SELECT id, scheduled_at, duration AS duration_minutes, status, notes, modality
       FROM appointments WHERE client_id = $1
       ORDER BY scheduled_at DESC LIMIT 50`,
      [clientId]
    )

    return reply.send({ appointments: rows })
  })

  // ── WEIGHT ───────────────────────────────────────────────────────────────

  /**
   * POST /api/patient/weight
   */
  app.post('/weight', { onRequest: [authenticatePatient] }, async (request, reply) => {
    const { clientId } = (request as any).user
    const schema = z.object({
      weight_kg: z.number().positive().optional(),
      waist_cm:  z.number().positive().optional(),
      hip_cm:    z.number().positive().optional(),
      notes:     z.string().optional(),
      logged_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
    const body = schema.parse(request.body)
    const date = body.logged_at ?? new Date().toISOString().slice(0, 10)

    const [row] = await query<any>(
      `INSERT INTO weight_logs (client_id, weight_kg, waist_cm, hip_cm, notes, logged_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, weight_kg::text, waist_cm::text, hip_cm::text, notes, logged_at::text`,
      [clientId, body.weight_kg ?? null, body.waist_cm ?? null, body.hip_cm ?? null, body.notes ?? null, date]
    )
    return reply.code(201).send({ entry: row })
  })

  /**
   * GET /api/patient/weight
   */
  app.get('/weight', { onRequest: [authenticatePatient] }, async (request, reply) => {
    const { clientId } = (request as any).user

    const rows = await query<any>(
      `SELECT id, weight_kg::text, waist_cm::text, hip_cm::text, notes, logged_at::text
       FROM weight_logs WHERE client_id = $1
       ORDER BY logged_at DESC LIMIT 60`,
      [clientId]
    )
    return reply.send({ entries: rows })
  })

  // ── WATER ────────────────────────────────────────────────────────────────

  /**
   * POST /api/patient/water
   */
  app.post('/water', { onRequest: [authenticatePatient] }, async (request, reply) => {
    const { clientId } = (request as any).user
    const schema = z.object({ amount_ml: z.number().int().positive().default(250) })
    const { amount_ml } = schema.parse(request.body)
    const today = new Date().toISOString().slice(0, 10)

    await query(
      `INSERT INTO water_logs (client_id, amount_ml, logged_at) VALUES ($1, $2, $3)`,
      [clientId, amount_ml, today]
    )

    const totalRow = await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(amount_ml), 0)::text AS total FROM water_logs WHERE client_id = $1 AND logged_at = $2`,
      [clientId, today]
    )
    return reply.code(201).send({ totalToday: parseInt(totalRow?.total ?? '0', 10) })
  })

  /**
   * GET /api/patient/water/today
   */
  app.get('/water/today', { onRequest: [authenticatePatient] }, async (request, reply) => {
    const { clientId } = (request as any).user
    const today = new Date().toISOString().slice(0, 10)

    const totalRow = await queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(amount_ml), 0)::text AS total FROM water_logs WHERE client_id = $1 AND logged_at = $2`,
      [clientId, today]
    )
    const entries = await query<{ id: string; amount_ml: number; created_at: string }>(
      `SELECT id, amount_ml, created_at FROM water_logs WHERE client_id = $1 AND logged_at = $2 ORDER BY created_at`,
      [clientId, today]
    )
    return reply.send({ total: parseInt(totalRow?.total ?? '0', 10), entries })
  })

  // ── ACTIVITY ─────────────────────────────────────────────────────────────

  /**
   * POST /api/patient/activity
   */
  app.post('/activity', { onRequest: [authenticatePatient] }, async (request, reply) => {
    const { clientId } = (request as any).user
    const schema = z.object({
      activity_type:    z.string().min(1),
      duration_minutes: z.number().int().positive().optional(),
      notes:            z.string().optional(),
      logged_at:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
    const body = schema.parse(request.body)
    const date = body.logged_at ?? new Date().toISOString().slice(0, 10)

    const [row] = await query<any>(
      `INSERT INTO activity_logs (client_id, activity_type, duration_minutes, notes, logged_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, activity_type, duration_minutes, notes, logged_at::text`,
      [clientId, body.activity_type, body.duration_minutes ?? null, body.notes ?? null, date]
    )
    return reply.code(201).send({ entry: row })
  })

  /**
   * GET /api/patient/activity
   */
  app.get('/activity', { onRequest: [authenticatePatient] }, async (request, reply) => {
    const { clientId } = (request as any).user
    const rows = await query<any>(
      `SELECT id, activity_type, duration_minutes, notes, logged_at::text
       FROM activity_logs WHERE client_id = $1
       ORDER BY logged_at DESC, created_at DESC LIMIT 30`,
      [clientId]
    )
    return reply.send({ entries: rows })
  })

  // ── CHECK-IN ─────────────────────────────────────────────────────────────

  /**
   * POST /api/patient/checkin
   */
  app.post('/checkin', { onRequest: [authenticatePatient] }, async (request, reply) => {
    const { clientId } = (request as any).user
    const schema = z.object({
      hunger_score: z.number().int().min(1).max(5),
      energy_score: z.number().int().min(1).max(5),
      sleep_score:  z.number().int().min(1).max(5),
      mood_score:   z.number().int().min(1).max(5),
      notes:        z.string().optional(),
    })
    const body = schema.parse(request.body)
    const weekStart = currentWeekStart()

    const [row] = await query<any>(
      `INSERT INTO weekly_checkins (client_id, week_start, hunger_score, energy_score, sleep_score, mood_score, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (client_id, week_start) DO UPDATE SET
         hunger_score = EXCLUDED.hunger_score,
         energy_score = EXCLUDED.energy_score,
         sleep_score  = EXCLUDED.sleep_score,
         mood_score   = EXCLUDED.mood_score,
         notes        = EXCLUDED.notes
       RETURNING *`,
      [clientId, weekStart, body.hunger_score, body.energy_score, body.sleep_score, body.mood_score, body.notes ?? null]
    )
    return reply.code(201).send({ checkin: row })
  })

  /**
   * GET /api/patient/checkin
   */
  app.get('/checkin', { onRequest: [authenticatePatient] }, async (request, reply) => {
    const { clientId } = (request as any).user
    const rows = await query<any>(
      `SELECT id, week_start::text, hunger_score, energy_score, sleep_score, mood_score, notes, created_at
       FROM weekly_checkins WHERE client_id = $1 ORDER BY week_start DESC LIMIT 12`,
      [clientId]
    )
    return reply.send({ checkins: rows })
  })

  // ── NUTRITIONIST: check-ins dos pacientes ────────────────────────────────

  /**
   * GET /api/patient/checkin/clients
   * Nutritionist authenticated — see all recent check-ins for their clients
   */
  app.get('/checkin/clients', {
    onRequest: [(app as any).authenticate]
  }, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user

    const rows = await query<any>(
      `SELECT wc.id, wc.week_start::text, wc.hunger_score, wc.energy_score, wc.sleep_score, wc.mood_score, wc.notes,
              c.id AS client_id, c.name AS client_name, c.phone AS client_phone
       FROM weekly_checkins wc
       JOIN clients c ON c.id = wc.client_id
       WHERE c.nutritionist_id = $1
       ORDER BY wc.created_at DESC LIMIT 50`,
      [nutritionistId]
    )
    return reply.send({ checkins: rows })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // PATIENT: Plano Alimentar, Documentos, Chat
  // ══════════════════════════════════════════════════════════════════════════

  /** GET /api/patient/meal-plan — paciente vê seu plano ativo */
  app.get('/meal-plan', { onRequest: [authenticatePatient] }, async (request, reply) => {
    const { clientId } = (request as any).user

    const plan = await queryOne<any>(
      'SELECT * FROM meal_plans WHERE client_id = $1 AND is_active = true ORDER BY updated_at DESC LIMIT 1',
      [clientId]
    )
    return reply.send({ plan: plan ?? null })
  })

  /** GET /api/patient/documents — paciente lista seus documentos */
  app.get('/documents', { onRequest: [authenticatePatient] }, async (request, reply) => {
    const { clientId } = (request as any).user

    const docs = await query(
      'SELECT * FROM patient_documents WHERE client_id = $1 ORDER BY created_at DESC',
      [clientId]
    )
    return reply.send({ documents: docs })
  })

  /** GET /api/patient/documents/:id/file — download do documento */
  app.get('/documents/:id/file', { onRequest: [authenticatePatient] }, async (request, reply) => {
    const { clientId } = (request as any).user
    const { id } = request.params as { id: string }

    const doc = await queryOne<any>(
      'SELECT * FROM patient_documents WHERE id = $1 AND client_id = $2',
      [id, clientId]
    )
    if (!doc) return reply.code(404).send({ error: 'Documento não encontrado' })

    const filepath = path.join(process.cwd(), 'uploads', 'docs', doc.filename)
    const stream   = createReadStream(filepath)

    reply.header('Content-Type', doc.mimetype)
    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.original_name)}"`)
    return reply.send(stream)
  })

  /** GET /api/patient/chat — paciente vê histórico de mensagens */
  app.get('/chat', { onRequest: [authenticatePatient] }, async (request, reply) => {
    const { clientId, nutritionistId } = (request as any).user

    // Marcar mensagens da nutri como lidas
    await query(
      `UPDATE patient_messages SET read_at = NOW()
       WHERE nutritionist_id = $1 AND client_id = $2 AND from_role = 'nutritionist' AND read_at IS NULL`,
      [nutritionistId, clientId]
    )

    const messages = await query(
      `SELECT * FROM patient_messages
       WHERE nutritionist_id = $1 AND client_id = $2
       ORDER BY created_at ASC LIMIT 200`,
      [nutritionistId, clientId]
    )
    return reply.send({ messages })
  })

  /** POST /api/patient/chat — paciente envia mensagem */
  app.post('/chat', { onRequest: [authenticatePatient] }, async (request, reply) => {
    const { clientId, nutritionistId } = (request as any).user
    const { content } = request.body as { content: string }

    if (!content?.trim()) return reply.code(400).send({ error: 'Mensagem vazia' })

    const msg = await queryOne<any>(`
      INSERT INTO patient_messages (nutritionist_id, client_id, from_role, content)
      VALUES ($1, $2, 'patient', $3) RETURNING *
    `, [nutritionistId, clientId, content.trim()])

    return reply.send({ message: msg })
  })

  /** GET /api/patient/chat/unread — qtd mensagens não lidas da nutri */
  app.get('/chat/unread', { onRequest: [authenticatePatient] }, async (request, reply) => {
    const { clientId, nutritionistId } = (request as any).user

    const result = await queryOne<any>(
      `SELECT COUNT(*) AS count FROM patient_messages
       WHERE nutritionist_id = $1 AND client_id = $2 AND from_role = 'nutritionist' AND read_at IS NULL`,
      [nutritionistId, clientId]
    )
    return reply.send({ count: parseInt(result?.count ?? '0') })
  })
}
