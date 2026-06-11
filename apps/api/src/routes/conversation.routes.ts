import { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db'
import { sendMessageForNutri } from '../services/whatsapp.service'

const VALID_OUTCOMES = ['agendou', 'comprou', 'nao_avancou', 'sem_resposta', 'outro']

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
    const { outcome, outcome_notes } = (request.body as any) || {}

    if (outcome && !VALID_OUTCOMES.includes(outcome)) {
      return reply.code(400).send({ error: `outcome inválido. Use um de: ${VALID_OUTCOMES.join(', ')}` })
    }

    const [updated] = await query(
      `UPDATE conversations SET status = 'resolved', outcome = COALESCE($1, outcome),
         outcome_notes = COALESCE($2, outcome_notes), closed_at = NOW()
       WHERE id = $3 AND nutritionist_id = $4 RETURNING *`,
      [outcome ?? null, outcome_notes ?? null, id, nutritionistId]
    )
    if (!updated) return reply.code(404).send({ error: 'Conversa não encontrada' })
    return reply.send({ ok: true, conversation: updated })
  })

  // POST /api/conversations/:id/outcome — define/atualiza a classificação do resultado
  app.post('/:id/outcome', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { id } = request.params as any
    const { outcome, outcome_notes } = (request.body as any) || {}

    if (!VALID_OUTCOMES.includes(outcome)) {
      return reply.code(400).send({ error: `outcome inválido. Use um de: ${VALID_OUTCOMES.join(', ')}` })
    }

    const [updated] = await query(
      `UPDATE conversations SET outcome = $1, outcome_notes = COALESCE($2, outcome_notes),
         closed_at = COALESCE(closed_at, NOW())
       WHERE id = $3 AND nutritionist_id = $4 RETURNING *`,
      [outcome, outcome_notes ?? null, id, nutritionistId]
    )
    if (!updated) return reply.code(404).send({ error: 'Conversa não encontrada' })
    return reply.send({ ok: true, conversation: updated })
  })

  // GET /api/conversations/stats — métricas agregadas de resultados
  app.get('/stats', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user

    const rows = await query<any>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'active') as active,
         COUNT(*) FILTER (WHERE status = 'human_takeover') as human_takeover,
         COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
         COUNT(*) FILTER (WHERE outcome = 'agendou') as agendou,
         COUNT(*) FILTER (WHERE outcome = 'comprou') as comprou,
         COUNT(*) FILTER (WHERE outcome = 'nao_avancou') as nao_avancou,
         COUNT(*) FILTER (WHERE outcome = 'sem_resposta') as sem_resposta,
         COUNT(*) FILTER (WHERE outcome = 'outro') as outro,
         COUNT(*) FILTER (WHERE status = 'resolved' AND outcome IS NULL) as sem_classificacao
       FROM conversations
       WHERE nutritionist_id = $1`,
      [nutritionistId]
    )

    const stats = rows[0] || {}
    const result: any = {}
    for (const key of Object.keys(stats)) result[key] = Number(stats[key] ?? 0)

    return reply.send({ stats: result })
  })

  // POST /api/conversations/:id/mode — alterna entre 'auto' e 'copilot'
  app.post('/:id/mode', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { id } = request.params as any
    const { mode } = request.body as any

    if (mode !== 'auto' && mode !== 'copilot') {
      return reply.code(400).send({ error: "mode deve ser 'auto' ou 'copilot'" })
    }

    const [updated] = await query(
      `UPDATE conversations SET mode = $1
       WHERE id = $2 AND nutritionist_id = $3 RETURNING *`,
      [mode, id, nutritionistId]
    )
    if (!updated) return reply.code(404).send({ error: 'Conversa não encontrada' })
    return reply.send({ ok: true, conversation: updated })
  })

  // PATCH /api/conversations/:id/messages/:messageId — edita o conteúdo de um rascunho (copiloto)
  app.patch('/:id/messages/:messageId', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { id, messageId } = request.params as any
    const { content } = request.body as any

    if (!content?.trim()) return reply.code(400).send({ error: 'content é obrigatório' })

    const conversation = await queryOne<any>(
      'SELECT * FROM conversations WHERE id = $1 AND nutritionist_id = $2',
      [id, nutritionistId]
    )
    if (!conversation) return reply.code(404).send({ error: 'Conversa não encontrada' })

    const [updated] = await query(
      `UPDATE messages SET content = $1
       WHERE id = $2 AND conversation_id = $3 AND pending_send = true
       RETURNING *`,
      [content.trim(), messageId, id]
    )
    if (!updated) return reply.code(404).send({ error: 'Rascunho não encontrado' })
    return reply.send({ ok: true, message: updated })
  })

  // POST /api/conversations/:id/messages/:messageId/approve — envia o rascunho ao paciente
  app.post('/:id/messages/:messageId/approve', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { id, messageId } = request.params as any

    const conversation = await queryOne<any>(
      'SELECT * FROM conversations WHERE id = $1 AND nutritionist_id = $2',
      [id, nutritionistId]
    )
    if (!conversation) return reply.code(404).send({ error: 'Conversa não encontrada' })

    const draft = await queryOne<any>(
      `SELECT * FROM messages WHERE id = $1 AND conversation_id = $2 AND pending_send = true`,
      [messageId, id]
    )
    if (!draft) return reply.code(404).send({ error: 'Rascunho não encontrado' })

    await sendMessageForNutri(nutritionistId, conversation.client_phone, draft.content)

    const [updated] = await query(
      `UPDATE messages SET pending_send = false WHERE id = $1 RETURNING *`,
      [messageId]
    )
    return reply.send({ ok: true, message: updated })
  })

  // POST /api/conversations/:id/messages/:messageId/discard — descarta o rascunho sem enviar
  app.post('/:id/messages/:messageId/discard', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { id, messageId } = request.params as any

    const conversation = await queryOne<any>(
      'SELECT * FROM conversations WHERE id = $1 AND nutritionist_id = $2',
      [id, nutritionistId]
    )
    if (!conversation) return reply.code(404).send({ error: 'Conversa não encontrada' })

    const [deleted] = await query(
      `DELETE FROM messages WHERE id = $1 AND conversation_id = $2 AND pending_send = true RETURNING id`,
      [messageId, id]
    )
    if (!deleted) return reply.code(404).send({ error: 'Rascunho não encontrado' })
    return reply.send({ ok: true })
  })
}
