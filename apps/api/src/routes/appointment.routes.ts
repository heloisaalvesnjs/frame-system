import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, queryOne } from '../db'
import { getAvailableSlots } from '../services/appointment.service'

export async function appointmentRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // GET /api/appointments — lista consultas da nutricionista
  app.get('/', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { date, status } = request.query as any

    let sql = `
      SELECT a.*, a.duration as duration_minutes, c.name as client_name, c.phone as client_phone
      FROM appointments a
      JOIN clients c ON c.id = a.client_id
      WHERE a.nutritionist_id = $1
    `
    const params: any[] = [id]

    if (date) {
      params.push(date)
      sql += ` AND DATE(a.scheduled_at) = $${params.length}`
    }
    if (status) {
      params.push(status)
      sql += ` AND a.status = $${params.length}`
    }

    sql += ' ORDER BY a.scheduled_at ASC'
    const appointments = await query(sql, params)
    return reply.send({ appointments })
  })

  // GET /api/appointments/slots?date=2026-05-20 — horários disponíveis
  app.get('/slots', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { date } = request.query as any

    if (!date) return reply.code(400).send({ error: 'Parâmetro date obrigatório' })

    const slots = await getAvailableSlots(id, date)
    return reply.send(slots)
  })

  // POST /api/appointments — agendar consulta (nutricionista ou assistente)
  app.post('/', async (request, reply) => {
    const schema = z.object({
      nutritionist_id: z.string().uuid(),
      client_phone: z.string(),
      client_name: z.string().optional(),
      scheduled_at: z.string().datetime(),
      modality: z.enum(['online', 'presencial']).default('online'),
      notes: z.string().optional(),
      created_by: z.enum(['assistant', 'nutritionist']).default('assistant')
    })

    const body = schema.parse(request.body)

    // Upsert do cliente
    let client = await queryOne<any>(
      'SELECT id FROM clients WHERE nutritionist_id = $1 AND phone = $2',
      [body.nutritionist_id, body.client_phone]
    )

    if (!client) {
      const [newClient] = await query(
        'INSERT INTO clients (nutritionist_id, phone, name) VALUES ($1, $2, $3) RETURNING id',
        [body.nutritionist_id, body.client_phone, body.client_name ?? 'Cliente']
      )
      client = newClient
    } else if (body.client_name) {
      await query('UPDATE clients SET name = $1 WHERE id = $2', [body.client_name, client.id])
    }

    // Verificar se o horário ainda está disponível
    const conflict = await queryOne(
      `SELECT id FROM appointments
       WHERE nutritionist_id = $1
         AND scheduled_at = $2
         AND status NOT IN ('cancelled')`,
      [body.nutritionist_id, body.scheduled_at]
    )

    if (conflict) {
      return reply.code(409).send({ error: 'Horário indisponível. Escolha outro horário.' })
    }

    const [appointment] = await query(
      `INSERT INTO appointments (nutritionist_id, client_id, scheduled_at, modality, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [body.nutritionist_id, client.id, body.scheduled_at, body.modality, body.notes, body.created_by]
    )

    return reply.code(201).send(appointment)
  })

  // PATCH /api/appointments/:id/status
  app.patch('/:id/status', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { id } = request.params as any
    const { status } = request.body as any

    const validStatuses = ['scheduled', 'confirmed', 'cancelled', 'completed']
    if (!validStatuses.includes(status)) {
      return reply.code(400).send({ error: 'Status inválido' })
    }

    const [updated] = await query(
      `UPDATE appointments SET status = $1
       WHERE id = $2 AND nutritionist_id = $3
       RETURNING *`,
      [status, id, nutritionistId]
    )

    if (!updated) return reply.code(404).send({ error: 'Consulta não encontrada' })
    return reply.send(updated)
  })
}
