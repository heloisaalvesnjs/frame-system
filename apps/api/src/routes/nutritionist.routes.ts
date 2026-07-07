import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, queryOne } from '../db'
import bcrypt from 'bcryptjs'

export async function nutritionistRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // GET /api/nutritionists/profile
  app.get('/profile', auth, async (request, reply) => {
    const { id } = (request as any).user
    const nutri = await queryOne(
      `SELECT id, name, email, phone, specialty, bio, avatar_url, plan, is_active, created_at,
              buffer_between_minutes, min_advance_hours, max_appointments_per_day
       FROM nutritionists WHERE id = $1`,
      [id]
    )
    return reply.send(nutri)
  })

  // PUT /api/nutritionists/profile
  app.put('/profile', auth, async (request, reply) => {
    const { id } = (request as any).user
    const schema = z.object({
      name: z.string().min(2).optional(),
      phone: z.string().optional(),
      specialty: z.string().optional(),
      bio: z.string().optional()
    })
    const body = schema.parse(request.body)

    const [updated] = await query(
      `UPDATE nutritionists SET
        name = COALESCE($2, name),
        phone = COALESCE($3, phone),
        specialty = COALESCE($4, specialty),
        bio = COALESCE($5, bio),
        updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, phone, specialty, bio, plan`,
      [id, body.name, body.phone, body.specialty, body.bio]
    )
    return reply.send(updated)
  })

  // PUT /api/nutritionists/scheduling-rules
  app.put('/scheduling-rules', auth, async (request, reply) => {
    const { id } = (request as any).user
    const schema = z.object({
      buffer_between_minutes:  z.number().int().min(0).max(120).optional(),
      min_advance_hours:        z.number().int().min(0).max(168).optional(),
      max_appointments_per_day: z.number().int().min(1).max(50).optional(),
    })
    const body = schema.parse(request.body)

    const [updated] = await query(
      `UPDATE nutritionists SET
        buffer_between_minutes  = COALESCE($2, buffer_between_minutes),
        min_advance_hours        = COALESCE($3, min_advance_hours),
        max_appointments_per_day = COALESCE($4, max_appointments_per_day),
        updated_at = NOW()
       WHERE id = $1
       RETURNING buffer_between_minutes, min_advance_hours, max_appointments_per_day`,
      [id, body.buffer_between_minutes ?? null, body.min_advance_hours ?? null, body.max_appointments_per_day ?? null]
    )
    return reply.send({ ok: true, rules: updated })
  })

  // GET /api/nutritionists/online-availability
  app.get('/online-availability', auth, async (request, reply) => {
    const { id } = (request as any).user
    const row = await queryOne<any>(
      `SELECT online_enabled, online_weekdays,
              online_start::text        AS online_start,
              online_end::text          AS online_end,
              online_slot_duration,
              online_break_start::text  AS online_break_start,
              online_break_end::text    AS online_break_end
       FROM nutritionists WHERE id = $1`,
      [id]
    )
    return reply.send({
      online_enabled:       row?.online_enabled ?? true,
      online_weekdays:      row?.online_weekdays ?? [1, 2, 3, 4, 5],
      online_start:         row?.online_start?.slice(0, 5) ?? '08:00',
      online_end:           row?.online_end?.slice(0, 5) ?? '18:00',
      online_slot_duration: row?.online_slot_duration ?? 30,
      online_break_start:   row?.online_break_start?.slice(0, 5) ?? null,
      online_break_end:     row?.online_break_end?.slice(0, 5) ?? null,
    })
  })

  // PUT /api/nutritionists/online-availability
  app.put('/online-availability', auth, async (request, reply) => {
    const { id } = (request as any).user
    const schema = z.object({
      online_enabled:       z.boolean(),
      online_weekdays:      z.array(z.number().int().min(0).max(6)),
      online_start:         z.string().regex(/^\d{2}:\d{2}$/),
      online_end:           z.string().regex(/^\d{2}:\d{2}$/),
      online_slot_duration: z.number().int().min(15).max(240),
      online_break_start:   z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
      online_break_end:     z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    })
    const body = schema.parse(request.body)

    await query(
      `UPDATE nutritionists SET
         online_enabled = $2, online_weekdays = $3,
         online_start = $4, online_end = $5, online_slot_duration = $6,
         online_break_start = $7, online_break_end = $8, updated_at = NOW()
       WHERE id = $1`,
      [id, body.online_enabled, body.online_weekdays,
       body.online_start, body.online_end, body.online_slot_duration,
       body.online_break_start ?? null, body.online_break_end ?? null]
    )
    return reply.send({ ok: true })
  })

  // POST /api/nutritionists/change-password
  app.post('/change-password', auth, async (request, reply) => {
    const { id } = (request as any).user
    const schema = z.object({
      current_password: z.string().min(1),
      new_password:     z.string().min(8, 'Mínimo 8 caracteres'),
    })
    const body = schema.parse(request.body)

    const nutri = await queryOne<any>(
      'SELECT password_hash FROM nutritionists WHERE id = $1', [id]
    )
    if (!nutri) return reply.code(404).send({ error: 'Usuário não encontrado' })

    const valid = await bcrypt.compare(body.current_password, nutri.password_hash)
    if (!valid) return reply.code(400).send({ error: 'Senha atual incorreta' })

    const hash = await bcrypt.hash(body.new_password, 10)
    await query('UPDATE nutritionists SET password_hash = $2, updated_at = NOW() WHERE id = $1', [id, hash])

    return reply.send({ ok: true })
  })

  // GET /api/nutritionists/availability
  app.get('/availability', auth, async (request, reply) => {
    const { id } = (request as any).user
    const slots = await query(
      `SELECT * FROM availability WHERE nutritionist_id = $1 AND is_active = true ORDER BY day_of_week, start_time`,
      [id]
    )
    return reply.send(slots)
  })

  // POST /api/nutritionists/availability
  app.post('/availability', auth, async (request, reply) => {
    const { id } = (request as any).user
    const schema = z.object({
      day_of_week: z.number().min(0).max(6),
      start_time: z.string(),  // "09:00"
      end_time: z.string(),    // "18:00"
      slot_duration: z.number().default(60)
    })
    const body = schema.parse(request.body)

    const [slot] = await query(
      `INSERT INTO availability (nutritionist_id, day_of_week, start_time, end_time, slot_duration)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, body.day_of_week, body.start_time, body.end_time, body.slot_duration]
    )
    return reply.code(201).send(slot)
  })

  // PUT /api/nutritionists/availability — substitui todos os horários de uma vez
  app.put('/availability', auth, async (request, reply) => {
    const { id } = (request as any).user
    const schema = z.array(z.object({
      day_of_week: z.number().min(0).max(6),
      start_time: z.string(),
      end_time: z.string(),
      slot_duration: z.number().default(60)
    }))

    const entries = schema.parse(request.body)

    // Remove todos os horários atuais
    await query('DELETE FROM availability WHERE nutritionist_id = $1', [id])

    // Insere os novos
    for (const entry of entries) {
      await query(
        `INSERT INTO availability (nutritionist_id, day_of_week, start_time, end_time, slot_duration)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, entry.day_of_week, entry.start_time, entry.end_time, entry.slot_duration]
      )
    }

    return reply.send({ ok: true })
  })

  // DELETE /api/nutritionists/availability/:slotId
  app.delete('/availability/:slotId', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { slotId } = request.params as any

    await query(
      `UPDATE availability SET is_active = false WHERE id = $1 AND nutritionist_id = $2`,
      [slotId, id]
    )
    return reply.send({ ok: true })
  })

  // GET /api/nutritionists/notification-preferences
  app.get('/notification-preferences', auth, async (request, reply) => {
    const { id } = (request as any).user

    const nutri = await queryOne<{
      notify_ai_daily_report:      boolean
      notify_new_lead:             boolean
      notify_appointment_reminder: boolean
      notify_whatsapp_disconnected: boolean
    }>(
      `SELECT notify_ai_daily_report, notify_new_lead,
              notify_appointment_reminder, notify_whatsapp_disconnected
       FROM nutritionists WHERE id = $1`,
      [id]
    )
    if (!nutri) return reply.code(404).send({ error: 'Usuário não encontrado' })

    return reply.send({ preferences: nutri })
  })

  // PUT /api/nutritionists/notification-preferences
  app.put('/notification-preferences', auth, async (request, reply) => {
    const { id } = (request as any).user

    const schema = z.object({
      notify_ai_daily_report:       z.boolean().optional(),
      notify_new_lead:              z.boolean().optional(),
      notify_appointment_reminder:  z.boolean().optional(),
      notify_whatsapp_disconnected: z.boolean().optional(),
    })
    const body = schema.parse(request.body)

    const nutri = await queryOne<{
      notify_ai_daily_report:      boolean
      notify_new_lead:             boolean
      notify_appointment_reminder: boolean
      notify_whatsapp_disconnected: boolean
    }>(
      `UPDATE nutritionists SET
         notify_ai_daily_report       = COALESCE($2, notify_ai_daily_report),
         notify_new_lead              = COALESCE($3, notify_new_lead),
         notify_appointment_reminder  = COALESCE($4, notify_appointment_reminder),
         notify_whatsapp_disconnected = COALESCE($5, notify_whatsapp_disconnected),
         updated_at = NOW()
       WHERE id = $1
       RETURNING notify_ai_daily_report, notify_new_lead,
                 notify_appointment_reminder, notify_whatsapp_disconnected`,
      [id,
       body.notify_ai_daily_report      ?? null,
       body.notify_new_lead             ?? null,
       body.notify_appointment_reminder ?? null,
       body.notify_whatsapp_disconnected ?? null]
    )
    if (!nutri) return reply.code(404).send({ error: 'Usuário não encontrado' })

    return reply.send({ preferences: nutri })
  })
}
