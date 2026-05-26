import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import crypto from 'crypto'
import { query, queryOne } from '../db'
import { sendMessage } from '../services/whatsapp.service'

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
}
