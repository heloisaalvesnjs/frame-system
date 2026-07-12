import { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db'
import {
  connectInstance,
  getInstanceStatus,
  disconnectInstance,
  createInstance,
  setInstanceWebhook,
  debugInstanceStatus,
} from '../services/whatsapp.service'

export async function whatsappRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // ── POST /api/whatsapp/connect ─────────────────────────────────────────────
  // Primeira vez: cria instância na uazapi (via admintoken), persiste o token e o id
  // no banco, e configura o webhook. Vezes seguintes: apenas atualiza status e
  // aguarda o dashboard buscar o QR via GET /qr.
  app.post('/connect', auth, async (request, reply) => {
    const { id } = (request as any).user
    // Usa API_PUBLIC_URL (URL pública da Frame API) — a mesma variável usada em todo o sistema.
    // Sem instanceName na URL: o roteamento multi-tenant é feito pelo instance_id no payload uazapi.
    const publicUrl = (process.env.API_PUBLIC_URL || 'https://api.framesystem.com.br').replace(/\/$/, '')
    const webhookUrl = `${publicUrl}/webhook/whatsapp`

    const existing = await queryOne<{ instance_token: string | null; instance_id: string | null }>(
      'SELECT instance_token, instance_id FROM whatsapp_connections WHERE nutritionist_id = $1',
      [id]
    )

    let instanceToken: string

    if (!existing?.instance_token) {
      // Primeira conexão: cria instância na uazapi via admintoken
      const created = await createInstance(`nutri-${id}`)
      if (!created?.token) {
        return reply.code(500).send({
          error: 'Falha ao criar instância uazapi. Verifique UAZAPI_ADMIN_TOKEN e UAZAPI_BASE_URL no servidor.',
        })
      }
      instanceToken = created.token
      const instanceId = created.id

      if (!existing) {
        await query(
          `INSERT INTO whatsapp_connections (nutritionist_id, instance_token, instance_id, status)
           VALUES ($1, $2, $3, 'connecting')`,
          [id, instanceToken, instanceId]
        )
      } else {
        await query(
          `UPDATE whatsapp_connections
           SET instance_token = $2, instance_id = $3, status = 'connecting', updated_at = NOW()
           WHERE nutritionist_id = $1`,
          [id, instanceToken, instanceId]
        )
      }

      // Configura o webhook imediatamente após criar a instância
      await setInstanceWebhook(instanceToken, webhookUrl)
    } else {
      instanceToken = existing.instance_token

      await query(
        `UPDATE whatsapp_connections SET status = 'connecting', updated_at = NOW()
         WHERE nutritionist_id = $1`,
        [id]
      )
    }

    return reply.send({ status: 'connecting' })
  })

  // ── GET /api/whatsapp/qr ───────────────────────────────────────────────────
  // Chama POST /instance/connect na uazapi (sem phone = inicia sessão QR)
  // e retorna o QR code para exibir no dashboard.
  app.get('/qr', auth, async (request, reply) => {
    const { id } = (request as any).user
    const conn = await queryOne<{ instance_token: string }>(
      'SELECT instance_token FROM whatsapp_connections WHERE nutritionist_id = $1',
      [id]
    )
    if (!conn?.instance_token) return reply.send({ qrCode: null })

    const result = await connectInstance(conn.instance_token)
    return reply.send({ qrCode: result.qrCode || null })
  })

  // ── GET /api/whatsapp/status ───────────────────────────────────────────────
  app.get('/status', auth, async (request, reply) => {
    const { id } = (request as any).user

    const connection = await queryOne<{
      instance_token: string | null
      status: string
      phone_number: string | null
      connected_at: string | null
    }>(
      'SELECT instance_token, status, phone_number, connected_at FROM whatsapp_connections WHERE nutritionist_id = $1',
      [id]
    )

    if (!connection?.instance_token) {
      return reply.send({ status: 'disconnected' })
    }

    const liveStatus = await getInstanceStatus(connection.instance_token)

    // Diagnóstico temporário embutido na resposta normal (sem query param,
    // que estava sendo bloqueado por um filtro de segurança do browser).
    // Remover assim que o bug do status for identificado.
    const _debugRaw = await debugInstanceStatus(connection.instance_token)

    if (liveStatus === 'connected' && connection.status !== 'connected') {
      await query(
        `UPDATE whatsapp_connections SET status = 'connected', connected_at = NOW()
         WHERE nutritionist_id = $1`,
        [id]
      )
    }

    return reply.send({
      status: liveStatus,
      phone: connection.phone_number,
      connected_at: connection.connected_at,
      _debugRaw,
    })
  })

  // ── POST /api/whatsapp/pairing-code ───────────────────────────────────────
  // Alternativa ao QR: gera um código de 8 dígitos para vincular pelo número.
  app.post('/pairing-code', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { phone } = request.body as { phone?: string }

    if (!phone) {
      return reply.code(400).send({ error: 'Número de telefone obrigatório' })
    }

    const conn = await queryOne<{ instance_token: string }>(
      'SELECT instance_token FROM whatsapp_connections WHERE nutritionist_id = $1',
      [id]
    )
    if (!conn?.instance_token) {
      return reply.code(400).send({ error: 'Instância não encontrada. Clique em Conectar primeiro.' })
    }

    try {
      const result = await connectInstance(conn.instance_token, phone)
      return reply.send({ code: result.pairingCode })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar código'
      return reply.code(500).send({ error: message })
    }
  })

  // ── POST /api/whatsapp/disconnect ──────────────────────────────────────────
  app.post('/disconnect', auth, async (request, reply) => {
    const { id } = (request as any).user

    const conn = await queryOne<{ instance_token: string | null }>(
      'SELECT instance_token FROM whatsapp_connections WHERE nutritionist_id = $1',
      [id]
    )

    if (conn?.instance_token) {
      await disconnectInstance(conn.instance_token)
    }

    await query(
      `UPDATE whatsapp_connections SET status = 'disconnected', connected_at = NULL
       WHERE nutritionist_id = $1`,
      [id]
    )

    return reply.send({ ok: true })
  })
}
