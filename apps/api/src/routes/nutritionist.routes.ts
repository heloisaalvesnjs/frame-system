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
}
