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

  // GET /api/clients/:clientId — perfil completo do cliente
  app.get('/:clientId', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }

    const client = await queryOne<any>(
      `SELECT * FROM clients WHERE id = $1 AND nutritionist_id = $2`,
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
