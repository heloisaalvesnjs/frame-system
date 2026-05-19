import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, queryOne } from '../db'

export async function nutritionistRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // GET /api/nutritionists/profile
  app.get('/profile', auth, async (request, reply) => {
    const { id } = (request as any).user
    const nutri = await queryOne(
      `SELECT id, name, email, phone, specialty, bio, avatar_url, plan, is_active, created_at
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
