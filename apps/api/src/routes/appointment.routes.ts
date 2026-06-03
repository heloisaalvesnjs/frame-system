import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, queryOne } from '../db'
import { getAvailableSlots, listHolidays } from '../services/appointment.service'

export async function appointmentRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // GET /api/appointments — lista consultas da nutricionista
  app.get('/', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { date, start, end, status } = request.query as any

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
    } else if (start) {
      params.push(start)
      sql += ` AND DATE(a.scheduled_at) >= $${params.length}`
      if (end) {
        params.push(end)
        sql += ` AND DATE(a.scheduled_at) <= $${params.length}`
      }
    }
    if (status) {
      params.push(status)
      sql += ` AND a.status = $${params.length}`
    }

    sql += ' ORDER BY a.scheduled_at ASC'
    const appointments = await query(sql, params)
    return reply.send({ appointments })
  })

  // GET /api/appointments/holidays?year=2026 — feriados nacionais do ano
  app.get('/holidays', auth, async (request, reply) => {
    const { year } = request.query as any
    const y = Number(year) || new Date().getFullYear()
    const holidays = await listHolidays(y)
    return reply.send({ holidays })
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

  // POST /api/appointments/manual — criação manual pelo nutri (autenticado)
  app.post('/manual', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const schema = z.object({
      client_id:    z.string().uuid().optional(),
      client_name:  z.string().optional(),
      client_phone: z.string().optional(),
      scheduled_at: z.string(),
      duration:     z.number().int().min(15).max(240).default(50),
      modality:     z.enum(['online', 'presencial']).default('presencial'),
      location_id:  z.string().uuid().optional(),
      notes:        z.string().optional(),
    })
    const body = schema.parse(request.body)

    // Resolve client
    let clientId = body.client_id
    if (!clientId && body.client_phone) {
      const phone = body.client_phone.replace(/\D/g, '')
      let cl = await queryOne<any>(
        'SELECT id FROM clients WHERE nutritionist_id = $1 AND phone = $2',
        [nutritionistId, phone]
      )
      if (!cl && body.client_name) {
        const [newCl] = await query(
          'INSERT INTO clients (nutritionist_id, name, phone) VALUES ($1,$2,$3) RETURNING id',
          [nutritionistId, body.client_name, phone]
        )
        cl = newCl
      }
      clientId = cl?.id
    }
    if (!clientId) return reply.code(400).send({ error: 'Informe o cliente' })

    // Resolve location name
    let locationName: string | null = null
    if (body.location_id) {
      const loc = await queryOne<any>('SELECT name FROM locations WHERE id = $1', [body.location_id])
      locationName = loc?.name ?? null
    }

    // Check conflict
    const conflict = await queryOne(
      `SELECT id FROM appointments
       WHERE nutritionist_id = $1 AND scheduled_at = $2 AND status NOT IN ('cancelled')`,
      [nutritionistId, body.scheduled_at]
    )
    if (conflict) return reply.code(409).send({ error: 'Horário já ocupado' })

    const [appt] = await query(
      `INSERT INTO appointments
         (nutritionist_id, client_id, scheduled_at, duration, modality, location_id, location_name, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'nutritionist')
       RETURNING *`,
      [nutritionistId, clientId, body.scheduled_at, body.duration, body.modality,
       body.location_id ?? null, locationName, body.notes ?? null]
    )
    return reply.code(201).send({ appointment: appt })
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
