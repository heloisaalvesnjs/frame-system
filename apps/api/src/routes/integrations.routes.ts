import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, queryOne } from '../db'

const VALID_EVENTS = [
  'plans_stage_reached',
  'appointment_booked',
  'first_contact',
  'no_reply_24h',
  'conversation_closed',
] as const

export async function integrationsRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // GET /api/integrations — lista integrações do nutri
  app.get('/', auth, async (request, reply) => {
    const { id } = (request as any).user
    const rows = await query<any>(
      `SELECT id, name, webhook_url, events, is_active, created_at
       FROM webhook_integrations WHERE nutritionist_id = $1 ORDER BY created_at`,
      [id]
    )
    return reply.send({ integrations: rows })
  })

  // POST /api/integrations — cria integração
  app.post('/', auth, async (request, reply) => {
    const { id } = (request as any).user
    const body = z.object({
      name:        z.string().min(1).default('n8n'),
      webhook_url: z.string().url('URL inválida'),
      secret:      z.string().optional(),
      events:      z.array(z.enum(VALID_EVENTS)).min(1, 'Selecione ao menos um evento'),
    }).parse(request.body)

    const [row] = await query<any>(
      `INSERT INTO webhook_integrations (nutritionist_id, name, webhook_url, secret, events)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, webhook_url, events, is_active`,
      [id, body.name, body.webhook_url, body.secret ?? null, body.events]
    )
    return reply.code(201).send({ integration: row })
  })

  // PATCH /api/integrations/:integrationId — atualiza
  app.patch('/:integrationId', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { integrationId } = request.params as any
    const body = z.object({
      name:        z.string().optional(),
      webhook_url: z.string().url().optional(),
      secret:      z.string().nullable().optional(),
      events:      z.array(z.enum(VALID_EVENTS)).optional(),
      is_active:   z.boolean().optional(),
    }).parse(request.body)

    const existing = await queryOne<any>(
      `SELECT id FROM webhook_integrations WHERE id = $1 AND nutritionist_id = $2`,
      [integrationId, id]
    )
    if (!existing) return reply.code(404).send({ error: 'Integração não encontrada' })

    const [row] = await query<any>(
      `UPDATE webhook_integrations SET
         name        = COALESCE($3, name),
         webhook_url = COALESCE($4, webhook_url),
         secret      = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE secret END,
         events      = COALESCE($6, events),
         is_active   = COALESCE($7, is_active),
         updated_at  = NOW()
       WHERE id = $1 AND nutritionist_id = $2
       RETURNING id, name, webhook_url, events, is_active`,
      [integrationId, id, body.name ?? null, body.webhook_url ?? null,
       body.secret !== undefined ? body.secret : null,
       body.events ?? null, body.is_active ?? null]
    )
    return reply.send({ integration: row })
  })

  // DELETE /api/integrations/:integrationId
  app.delete('/:integrationId', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { integrationId } = request.params as any
    await query(
      `DELETE FROM webhook_integrations WHERE id = $1 AND nutritionist_id = $2`,
      [integrationId, id]
    )
    return reply.send({ ok: true })
  })

  // POST /api/integrations/:integrationId/test — dispara payload de teste
  app.post('/:integrationId/test', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { integrationId } = request.params as any

    const integration = await queryOne<any>(
      `SELECT webhook_url, secret FROM webhook_integrations WHERE id = $1 AND nutritionist_id = $2`,
      [integrationId, id]
    )
    if (!integration) return reply.code(404).send({ error: 'Integração não encontrada' })

    const testPayload = {
      event:           'test',
      nutritionist_id: id,
      client_phone:    '5511999999999',
      conversation_id: '00000000-0000-0000-0000-000000000000',
      timestamp:       new Date().toISOString(),
      data: {
        message:           'Este é um payload de teste do Frame System',
        plan_media_url:    null,
        plan_message_text: 'Aqui vai a mensagem de apresentação dos seus planos!',
        instance_token:    'exemplo-token-uazapi',
      },
    }

    try {
      const res = await fetch(integration.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Frame-Event': 'test' },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(8_000),
      })
      return reply.send({ ok: res.ok, status: res.status, payload: testPayload })
    } catch (err: any) {
      return reply.code(400).send({ ok: false, error: err.message })
    }
  })
}
