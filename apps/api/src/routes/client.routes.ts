import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, queryOne } from '../db'

export async function clientRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // GET /api/clients — lista todos os clientes com resumo
  app.get('/', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { search } = request.query as Record<string, string>

    let sql = `
      SELECT
        cl.id,
        cl.name,
        cl.phone,
        cl.goal,
        cl.notes,
        cl.birthdate,
        cl.created_at,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status != 'cancelled')::INT  AS appointment_count,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed')::INT   AS completed_count,
        MAX(conv.last_message_at)                                          AS last_contact
      FROM clients cl
      LEFT JOIN appointments a    ON a.client_id       = cl.id
      LEFT JOIN conversations conv
        ON conv.client_phone    = cl.phone
       AND conv.nutritionist_id = cl.nutritionist_id
      WHERE cl.nutritionist_id = $1
    `
    const params: unknown[] = [id]

    if (search) {
      params.push(`%${search}%`)
      sql += ` AND (cl.name ILIKE $${params.length} OR cl.phone LIKE $${params.length})`
    }

    sql += ' GROUP BY cl.id ORDER BY last_contact DESC NULLS LAST'

    const clients = await query(sql, params)
    return reply.send({ clients })
  })

  // POST /api/clients — cadastrar cliente manualmente
  app.post('/', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { name, phone, email, goal, notes, birthdate } = request.body as {
      name?: string; phone: string; email?: string
      goal?: string; notes?: string; birthdate?: string
    }

    if (!phone?.trim()) return reply.code(400).send({ error: 'Telefone é obrigatório' })

    // Verifica duplicata por telefone
    const existing = await queryOne<any>(
      'SELECT id FROM clients WHERE nutritionist_id = $1 AND phone = $2',
      [nutritionistId, phone.trim()]
    )
    if (existing) return reply.code(409).send({ error: 'Já existe um cliente com esse telefone' })

    const client = await queryOne<any>(
      `INSERT INTO clients (nutritionist_id, name, phone, email, goal, notes, birthdate)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        nutritionistId,
        name?.trim() || null,
        phone.trim(),
        email?.trim() || null,
        goal?.trim() || null,
        notes?.trim() || null,
        birthdate || null,
      ]
    )
    return reply.code(201).send({ client })
  })

  // GET /api/clients/:clientId — perfil completo do cliente
  app.get('/:clientId', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }

    const client = await queryOne<any>(
      `SELECT *, birthdate::text AS birthdate FROM clients WHERE id = $1 AND nutritionist_id = $2`,
      [clientId, nutritionistId]
    )
    if (!client) return reply.code(404).send({ error: 'Cliente não encontrado' })

    const appointments = await query(
      `SELECT a.id, a.scheduled_at, a.duration, a.modality, a.status, a.notes, a.created_by, a.created_at
       FROM appointments a
       WHERE a.client_id = $1
       ORDER BY a.scheduled_at DESC`,
      [clientId]
    )

    const conversations = await query(
      `SELECT
          c.id, c.status, c.created_at, c.last_message_at,
          COUNT(m.id)::INT AS message_count
       FROM conversations c
       LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.client_phone = $1 AND c.nutritionist_id = $2
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [client.phone, nutritionistId]
    )

    return reply.send({ client, appointments, conversations })
  })

  // GET /api/clients/:clientId/tracking — dados de tracking do paciente (para a nutri)
  app.get('/:clientId/tracking', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }

    // Verify ownership
    const client = await queryOne<{ id: string }>(
      `SELECT id FROM clients WHERE id = $1 AND nutritionist_id = $2`,
      [clientId, nutritionistId]
    )
    if (!client) return reply.code(404).send({ error: 'Cliente não encontrado' })

    // Weight history (last 60)
    const weightLogs = await query<any>(
      `SELECT id, weight_kg::text, waist_cm::text, hip_cm::text, notes, logged_at::text
       FROM weight_logs WHERE client_id = $1 ORDER BY logged_at DESC LIMIT 60`,
      [clientId]
    )

    // Check-ins (last 12 weeks)
    const checkins = await query<any>(
      `SELECT id, week_start::text, hunger_score, energy_score, sleep_score, mood_score, notes, created_at
       FROM weekly_checkins WHERE client_id = $1 ORDER BY week_start DESC LIMIT 12`,
      [clientId]
    )

    // Activity logs (last 30)
    const activityLogs = await query<any>(
      `SELECT id, activity_type, duration_minutes, notes, logged_at::text
       FROM activity_logs WHERE client_id = $1 ORDER BY logged_at DESC LIMIT 30`,
      [clientId]
    )

    // Water stats: last 7 days
    const waterStats = await query<any>(
      `SELECT logged_at::text, SUM(amount_ml)::int AS total_ml
       FROM water_logs
       WHERE client_id = $1 AND logged_at >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY logged_at ORDER BY logged_at DESC`,
      [clientId]
    )

    return reply.send({ weightLogs, checkins, activityLogs, waterStats })
  })

  // PATCH /api/clients/:clientId — atualiza dados do paciente
  app.patch('/:clientId', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }

    const schema = z.object({
      name:      z.string().min(1).optional(),
      goal:      z.string().optional(),
      notes:     z.string().optional(),
      birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    })
    const body = schema.parse(request.body)

    const [updated] = await query(
      `UPDATE clients SET
         name      = COALESCE($3, name),
         goal      = COALESCE($4, goal),
         notes     = COALESCE($5, notes),
         birthdate = COALESCE($6::DATE, birthdate),
         updated_at = NOW()
       WHERE id = $1 AND nutritionist_id = $2
       RETURNING *`,
      [clientId, nutritionistId, body.name, body.goal, body.notes, body.birthdate ?? null]
    )
    if (!updated) return reply.code(404).send({ error: 'Cliente não encontrado' })
    return reply.send(updated)
  })
}
