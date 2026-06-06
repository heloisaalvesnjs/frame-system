/**
 * followup-sequences.routes.ts
 *
 * CRUD de sequências de follow-up por etapas.
 * Cada etapa tem step_order, delay_hours e message.
 * Autenticado — só o próprio nutricionista acessa suas sequências.
 */

import { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db'

export async function followupSequencesRoutes(app: FastifyInstance) {
  // GET /api/followup-sequences — lista todas as etapas do nutricionista
  app.get('/', { preHandler: [(app as any).authenticate] }, async (req: any) => {
    const nutritionist_id = req.user.nutritionistId

    const sequences = await query<any>(
      `SELECT id, step_order, delay_hours, message, is_active
       FROM followup_sequences
       WHERE nutritionist_id = $1
       ORDER BY step_order ASC`,
      [nutritionist_id]
    )

    return { sequences }
  })

  // POST /api/followup-sequences — cria uma nova etapa
  app.post('/', { preHandler: [(app as any).authenticate] }, async (req: any, reply: any) => {
    const nutritionist_id = req.user.nutritionistId
    const { step_order, delay_hours, message } = req.body as any

    if (!message?.trim()) {
      return reply.code(400).send({ error: 'message é obrigatório' })
    }
    if (!delay_hours || isNaN(Number(delay_hours))) {
      return reply.code(400).send({ error: 'delay_hours é obrigatório' })
    }

    // Calcula próximo step_order se não fornecido
    let order = step_order
    if (!order) {
      const maxRow = await queryOne<any>(
        'SELECT COALESCE(MAX(step_order), 0) AS max FROM followup_sequences WHERE nutritionist_id = $1',
        [nutritionist_id]
      )
      order = (maxRow?.max ?? 0) + 1
    }

    const seq = await queryOne<any>(
      `INSERT INTO followup_sequences (nutritionist_id, step_order, delay_hours, message)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (nutritionist_id, step_order)
         DO UPDATE SET delay_hours = EXCLUDED.delay_hours, message = EXCLUDED.message
       RETURNING id, step_order, delay_hours, message, is_active`,
      [nutritionist_id, order, Number(delay_hours), message.trim()]
    )

    return reply.code(201).send({ sequence: seq })
  })

  // PUT /api/followup-sequences/:id — atualiza uma etapa existente
  app.put('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply: any) => {
    const nutritionist_id = req.user.nutritionistId
    const { id }          = req.params as any
    const { delay_hours, message, is_active, step_order } = req.body as any

    const fields: string[] = []
    const values: any[]    = [id, nutritionist_id]

    if (delay_hours !== undefined) { values.push(Number(delay_hours)); fields.push(`delay_hours = $${values.length}`) }
    if (message     !== undefined) { values.push(message.trim());      fields.push(`message = $${values.length}`) }
    if (is_active   !== undefined) { values.push(Boolean(is_active));  fields.push(`is_active = $${values.length}`) }
    if (step_order  !== undefined) { values.push(Number(step_order));  fields.push(`step_order = $${values.length}`) }

    if (!fields.length) return reply.code(400).send({ error: 'Nenhum campo para atualizar' })

    const seq = await queryOne<any>(
      `UPDATE followup_sequences SET ${fields.join(', ')}
       WHERE id = $1 AND nutritionist_id = $2
       RETURNING id, step_order, delay_hours, message, is_active`,
      values
    )

    if (!seq) return reply.code(404).send({ error: 'Sequência não encontrada' })
    return { sequence: seq }
  })

  // DELETE /api/followup-sequences/:id — remove uma etapa
  app.delete('/:id', { preHandler: [(app as any).authenticate] }, async (req: any, reply: any) => {
    const nutritionist_id = req.user.nutritionistId
    const { id }          = req.params as any

    await query(
      'DELETE FROM followup_sequences WHERE id = $1 AND nutritionist_id = $2',
      [id, nutritionist_id]
    )

    // Renumera as etapas restantes
    await query(
      `WITH ordered AS (
         SELECT id, ROW_NUMBER() OVER (ORDER BY step_order) AS new_order
         FROM followup_sequences WHERE nutritionist_id = $1
       )
       UPDATE followup_sequences fs
       SET step_order = ordered.new_order
       FROM ordered
       WHERE fs.id = ordered.id`,
      [nutritionist_id]
    )

    return reply.code(204).send()
  })

  // PUT /api/followup-sequences/reorder — reordena as etapas (recebe array de ids em ordem)
  app.put('/reorder', { preHandler: [(app as any).authenticate] }, async (req: any, reply: any) => {
    const nutritionist_id = req.user.nutritionistId
    const { ids } = req.body as { ids: string[] }

    if (!Array.isArray(ids)) return reply.code(400).send({ error: 'ids deve ser um array' })

    for (let i = 0; i < ids.length; i++) {
      await query(
        'UPDATE followup_sequences SET step_order = $1 WHERE id = $2 AND nutritionist_id = $3',
        [i + 1, ids[i], nutritionist_id]
      )
    }

    return { ok: true }
  })
}
