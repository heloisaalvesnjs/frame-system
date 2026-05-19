import { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db'

export async function conversationRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // GET /api/conversations — lista conversas
  app.get('/', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { status } = request.query as any

    let sql = `
      SELECT c.*,
        cl.name as client_name,
        (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY sent_at DESC LIMIT 1) as last_message
      FROM conversations c
      LEFT JOIN clients cl ON cl.phone = c.client_phone AND cl.nutritionist_id = c.nutritionist_id
      WHERE c.nutritionist_id = $1
    `
    const params: any[] = [id]

    if (status) {
      params.push(status)
      sql += ` AND c.status = $${params.length}`
    }

    sql += ' ORDER BY c.last_message_at DESC NULLS LAST'
    const conversations = await query(sql, params)
    return reply.send({ conversations })
  })

  // GET /api/conversations/:id/messages
  app.get('/:id/messages', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { id } = request.params as any

    // Garante que a conversa pertence ao nutricionista autenticado
    const conversation = await queryOne(
      'SELECT * FROM conversations WHERE id = $1 AND nutritionist_id = $2',
      [id, nutritionistId]
    )
    if (!conversation) return reply.code(404).send({ error: 'Conversa não encontrada' })

    const messages = await query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY sent_at ASC',
      [id]
    )
    return reply.send({ conversation, messages })
  })

  // POST /api/conversations/:id/takeover — nutricionista assume a conversa
  app.post('/:id/takeover', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { id } = request.params as any

    const [updated] = await query(
      `UPDATE conversations SET status = 'human_takeover'
       WHERE id = $1 AND nutritionist_id = $2 RETURNING *`,
      [id, nutritionistId]
    )
    if (!updated) return reply.code(404).send({ error: 'Conversa não encontrada' })
    return reply.send({ ok: true, conversation: updated })
  })

  // POST /api/conversations/:id/resolve — marca como resolvida
  app.post('/:id/resolve', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { id } = request.params as any

    const [updated] = await query(
      `UPDATE conversations SET status = 'resolved'
       WHERE id = $1 AND nutritionist_id = $2 RETURNING *`,
      [id, nutritionistId]
    )
    if (!updated) return reply.code(404).send({ error: 'Conversa não encontrada' })
    return reply.send({ ok: true })
  })
}
