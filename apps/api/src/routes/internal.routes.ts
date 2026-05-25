import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, queryOne } from '../db'
import { sendMessage } from '../services/whatsapp.service'
import { runColdLeadFollowup, runAppointmentReminders } from '../services/followup.service'

/**
 * Rotas internas — autenticadas via x-internal-key (para n8n e cron jobs).
 * Nunca expor estas rotas publicamente sem a chave.
 */
export async function internalRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticateInternal] }

  // ── GET /api/internal/health ──────────────────────────────
  // Permite o n8n verificar se a API está no ar antes de executar fluxos.
  app.get('/health', auth, async (_request, reply) => {
    return reply.send({ ok: true, timestamp: new Date().toISOString() })
  })

  // ── GET /api/internal/nutritionists ──────────────────────
  // Lista todas as nutricionistas ativas com suas instâncias WhatsApp.
  // Usado em cron jobs que iteram todas as nutricionistas.
  app.get('/nutritionists', auth, async (_request, reply) => {
    const nutritionists = await query(`
      SELECT
        n.id,
        n.name,
        n.email,
        n.phone,
        w.instance_name,
        w.status  AS whatsapp_status,
        w.phone_number AS whatsapp_number
      FROM nutritionists n
      LEFT JOIN whatsapp_connections w ON w.nutritionist_id = n.id
      WHERE n.is_active = true
      ORDER BY n.name
    `)
    return reply.send({ nutritionists })
  })

  // ── GET /api/internal/appointments ───────────────────────
  // Lista agendamentos com filtros de data e status.
  // Query params:
  //   date       — filtra por data (YYYY-MM-DD). Ex: ?date=2026-05-20
  //   status     — filtra por status. Ex: ?status=scheduled
  //   nutritionist_id — filtra por nutricionista (opcional)
  app.get('/appointments', auth, async (request, reply) => {
    const { date, status, nutritionist_id } = request.query as Record<string, string>

    let sql = `
      SELECT
        a.id,
        a.scheduled_at,
        a.duration AS duration_minutes,
        a.modality,
        a.status,
        a.notes,
        a.created_by,
        c.name  AS client_name,
        c.phone AS client_phone,
        n.name  AS nutritionist_name,
        n.phone AS nutritionist_phone,
        w.instance_name,
        w.phone_number AS whatsapp_number
      FROM appointments a
      JOIN clients c        ON c.id = a.client_id
      JOIN nutritionists n  ON n.id = a.nutritionist_id
      LEFT JOIN whatsapp_connections w ON w.nutritionist_id = a.nutritionist_id
      WHERE 1=1
    `
    const params: unknown[] = []

    if (date) {
      params.push(date)
      sql += ` AND DATE(a.scheduled_at AT TIME ZONE 'America/Sao_Paulo') = $${params.length}`
    }
    if (status) {
      params.push(status)
      sql += ` AND a.status = $${params.length}`
    }
    if (nutritionist_id) {
      params.push(nutritionist_id)
      sql += ` AND a.nutritionist_id = $${params.length}`
    }

    sql += ' ORDER BY a.scheduled_at ASC'

    const appointments = await query(sql, params)
    return reply.send({ appointments })
  })

  // ── POST /api/internal/whatsapp/send ─────────────────────
  // Envia uma mensagem WhatsApp via Evolution API.
  // Usado pelo n8n para disparar lembretes e notificações.
  // Body: { instance_name, phone, text }
  app.post('/whatsapp/send', auth, async (request, reply) => {
    const schema = z.object({
      instance_name: z.string().min(1),
      phone: z.string().min(8),
      text: z.string().min(1),
    })

    const body = schema.parse(request.body)

    try {
      await sendMessage(body.phone, body.text)
      return reply.send({ ok: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar mensagem'
      return reply.code(502).send({ error: message })
    }
  })

  // ── PATCH /api/internal/appointments/:id/status ──────────
  // Atualiza status de um agendamento (ex: marcar como completed após consulta).
  app.patch('/appointments/:id/status', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({
      status: z.enum(['scheduled', 'confirmed', 'cancelled', 'completed']),
    })

    const { status } = schema.parse(request.body)

    const [updated] = await query(
      `UPDATE appointments SET status = $1 WHERE id = $2 RETURNING id, status, scheduled_at`,
      [status, id]
    )

    if (!updated) return reply.code(404).send({ error: 'Agendamento não encontrado' })
    return reply.send({ ok: true, appointment: updated })
  })

  // ── DELETE /api/internal/conversations/reset ─────────────
  // Apaga histórico de conversa de um número (útil para testes).
  // Body: { phone, nutritionist_id? }
  app.delete('/conversations/reset', auth, async (request, reply) => {
    const { phone, nutritionist_id } = request.body as { phone: string, nutritionist_id?: string }

    if (!phone) return reply.code(400).send({ error: 'phone obrigatório' })

    const params: unknown[] = [phone.replace(/\D/g, '')]
    let filter = nutritionist_id ? ` AND nutritionist_id = $2` : ''
    if (nutritionist_id) params.push(nutritionist_id)

    // Apaga mensagens das conversas desse número
    await query(`
      DELETE FROM messages WHERE conversation_id IN (
        SELECT id FROM conversations WHERE client_phone = $1${filter}
      )
    `, params)

    // Apaga as conversas
    const deleted = await query(
      `DELETE FROM conversations WHERE client_phone = $1${filter} RETURNING id`,
      params
    )

    return reply.send({ ok: true, deleted: deleted.length })
  })

  // ── GET /api/internal/conversations/open ─────────────────
  // Lista conversas ativas das últimas N horas (padrão 24h).
  // Útil para o n8n monitorar conversas sem resposta.
  app.get('/conversations/open', auth, async (request, reply) => {
    const { hours = '24', nutritionist_id } = request.query as Record<string, string>

    let sql = `
      SELECT
        conv.id,
        conv.client_phone,
        conv.status,
        conv.last_message_at,
        cl.name AS client_name,
        n.name  AS nutritionist_name,
        w.instance_name
      FROM conversations conv
      JOIN nutritionists n ON n.id = conv.nutritionist_id
      LEFT JOIN clients cl ON cl.phone = conv.client_phone AND cl.nutritionist_id = conv.nutritionist_id
      LEFT JOIN whatsapp_connections w ON w.nutritionist_id = conv.nutritionist_id
      WHERE conv.status = 'active'
        AND conv.last_message_at >= NOW() - INTERVAL '${Number(hours)} hours'
    `
    const params: unknown[] = []

    if (nutritionist_id) {
      params.push(nutritionist_id)
      sql += ` AND conv.nutritionist_id = $${params.length}`
    }

    sql += ' ORDER BY conv.last_message_at DESC'

    const conversations = await query(sql, params)
    return reply.send({ conversations })
  })

  // ── POST /api/internal/followups/run ─────────────────────
  // Dispara manualmente o follow-up de leads frios (teste / n8n).
  app.post('/followups/run', auth, async (_request, reply) => {
    runColdLeadFollowup().catch(console.error) // fire-and-forget
    return reply.send({ ok: true, message: 'Follow-up iniciado em background' })
  })

  // ── POST /api/internal/reminders/run ─────────────────────
  // Dispara manualmente os lembretes de consulta (teste / n8n).
  app.post('/reminders/run', auth, async (_request, reply) => {
    runAppointmentReminders().catch(console.error) // fire-and-forget
    return reply.send({ ok: true, message: 'Lembretes iniciados em background' })
  })
}
