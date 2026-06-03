/**
 * Features Routes — Plano Alimentar, Documentos, Chat direto
 * Rota base: /api/features
 * Autenticação: nutricionista JWT
 */
import { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db'
import path from 'path'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import crypto from 'crypto'

export async function featuresRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // ══════════════════════════════════════════════════════════
  // PLANO ALIMENTAR
  // ══════════════════════════════════════════════════════════

  /** GET /api/features/clients/:clientId/meal-plan */
  app.get('/clients/:clientId/meal-plan', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }

    const plan = await queryOne<any>(
      'SELECT * FROM meal_plans WHERE nutritionist_id = $1 AND client_id = $2',
      [nutritionistId, clientId]
    )
    return reply.send({ plan: plan ?? null })
  })

  /** PUT /api/features/clients/:clientId/meal-plan — cria ou atualiza */
  app.put('/clients/:clientId/meal-plan', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }
    const { title, meals, notes } = request.body as {
      title?: string
      meals: Array<{ id: string; name: string; time: string; items: any[]; notes?: string }>
      notes?: string
    }

    const plan = await queryOne<any>(`
      INSERT INTO meal_plans (nutritionist_id, client_id, title, meals, notes)
      VALUES ($1, $2, $3, $4::jsonb, $5)
      ON CONFLICT (nutritionist_id, client_id)
      DO UPDATE SET title = $3, meals = $4::jsonb, notes = $5, updated_at = NOW()
      RETURNING *
    `, [nutritionistId, clientId, title ?? 'Plano Alimentar', JSON.stringify(meals ?? []), notes ?? null])

    return reply.send({ plan })
  })

  // ══════════════════════════════════════════════════════════
  // DOCUMENTOS
  // ══════════════════════════════════════════════════════════

  /** GET /api/features/clients/:clientId/documents */
  app.get('/clients/:clientId/documents', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }

    const docs = await query(
      'SELECT * FROM patient_documents WHERE nutritionist_id = $1 AND client_id = $2 ORDER BY created_at DESC',
      [nutritionistId, clientId]
    )
    return reply.send({ documents: docs })
  })

  /** POST /api/features/clients/:clientId/documents — upload de arquivo */
  app.post('/clients/:clientId/documents', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }
    const { description } = request.query as { description?: string }

    const data = await request.file()
    if (!data) return reply.code(400).send({ error: 'Nenhum arquivo enviado' })

    const ext   = path.extname(data.filename) || '.bin'
    const fname = `${crypto.randomUUID()}${ext}`
    const dir   = path.join(process.cwd(), 'uploads', 'docs')
    await fs.mkdir(dir, { recursive: true })
    const filepath = path.join(dir, fname)
    const buffer   = await data.toBuffer()
    await fs.writeFile(filepath, buffer)

    const doc = await queryOne<any>(`
      INSERT INTO patient_documents
        (nutritionist_id, client_id, filename, original_name, mimetype, size_bytes, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [nutritionistId, clientId, fname, data.filename, data.mimetype, buffer.length, description ?? null])

    return reply.send({ document: doc })
  })

  /** DELETE /api/features/documents/:id */
  app.delete('/documents/:id', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { id } = request.params as { id: string }

    const doc = await queryOne<any>(
      'DELETE FROM patient_documents WHERE id = $1 AND nutritionist_id = $2 RETURNING filename',
      [id, nutritionistId]
    )
    if (!doc) return reply.code(404).send({ error: 'Documento não encontrado' })

    try {
      await fs.unlink(path.join(process.cwd(), 'uploads', 'docs', doc.filename))
    } catch { /* ignora se o arquivo já não existe */ }

    return reply.send({ ok: true })
  })

  /** GET /api/features/documents/:id/file — download autenticado */
  app.get('/documents/:id/file', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { id } = request.params as { id: string }

    const doc = await queryOne<any>(
      'SELECT * FROM patient_documents WHERE id = $1 AND nutritionist_id = $2',
      [id, nutritionistId]
    )
    if (!doc) return reply.code(404).send({ error: 'Documento não encontrado' })

    const filepath = path.join(process.cwd(), 'uploads', 'docs', doc.filename)
    const stream   = createReadStream(filepath)

    reply.header('Content-Type', doc.mimetype)
    reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.original_name)}"`)
    return reply.send(stream)
  })

  // ══════════════════════════════════════════════════════════
  // CHAT DIRETO
  // ══════════════════════════════════════════════════════════

  /** GET /api/features/clients/:clientId/chat */
  app.get('/clients/:clientId/chat', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }

    // Marcar mensagens do paciente como lidas
    await query(
      `UPDATE patient_messages SET read_at = NOW()
       WHERE nutritionist_id = $1 AND client_id = $2 AND from_role = 'patient' AND read_at IS NULL`,
      [nutritionistId, clientId]
    )

    const messages = await query(
      `SELECT * FROM patient_messages
       WHERE nutritionist_id = $1 AND client_id = $2
       ORDER BY created_at ASC LIMIT 200`,
      [nutritionistId, clientId]
    )
    return reply.send({ messages })
  })

  /** POST /api/features/clients/:clientId/chat — nutricionista envia mensagem */
  app.post('/clients/:clientId/chat', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }
    const { content } = request.body as { content: string }

    if (!content?.trim()) return reply.code(400).send({ error: 'Mensagem vazia' })

    const msg = await queryOne<any>(`
      INSERT INTO patient_messages (nutritionist_id, client_id, from_role, content)
      VALUES ($1, $2, 'nutritionist', $3) RETURNING *
    `, [nutritionistId, clientId, content.trim()])

    return reply.send({ message: msg })
  })

  /** GET /api/features/chat/unread — contagem de não lidas (todas as conversas) */
  app.get('/chat/unread', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user

    const result = await queryOne<any>(
      `SELECT COUNT(*) AS count FROM patient_messages
       WHERE nutritionist_id = $1 AND from_role = 'patient' AND read_at IS NULL`,
      [nutritionistId]
    )
    return reply.send({ count: parseInt(result?.count ?? '0') })
  })

  /** GET /api/features/chat/summary — contagem não lidas por cliente */
  app.get('/chat/summary', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user

    const rows = await query(
      `SELECT client_id, COUNT(*) AS unread
       FROM patient_messages
       WHERE nutritionist_id = $1 AND from_role = 'patient' AND read_at IS NULL
       GROUP BY client_id`,
      [nutritionistId]
    )
    const summary: Record<string, number> = {}
    for (const r of rows) summary[r.client_id] = parseInt(r.unread)
    return reply.send({ summary })
  })
}
