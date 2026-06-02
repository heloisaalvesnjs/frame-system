import { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db'
import {
  getQRCode,
  getInstanceStatus,
  getPairingCode,
  disconnectInstance,
  createInstance,
  setInstanceWebhook
} from '../services/whatsapp.service'

export async function whatsappRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // ── POST /api/whatsapp/connect ─────────────────────────────────────────────
  // Cria (ou reutiliza) a instância Evolution API para o nutricionista.
  app.post('/connect', auth, async (request, reply) => {
    const { id } = (request as any).user

    // Nome da instância baseado no ID do nutricionista (único por nutri)
    const instanceName = `nutri-${id}`
    const apiUrl = process.env.API_URL || 'http://localhost:3001'
    const webhookUrl = `${apiUrl}/webhook/whatsapp/${instanceName}`

    const existing = await queryOne<any>(
      'SELECT * FROM whatsapp_connections WHERE nutritionist_id = $1',
      [id]
    )

    if (!existing) {
      // Cria instância na Evolution API
      await createInstance(instanceName, webhookUrl)

      await query(
        `INSERT INTO whatsapp_connections (nutritionist_id, instance_name, status)
         VALUES ($1, $2, 'connecting')`,
        [id, instanceName]
      )
    } else {
      // Garante que o webhook está configurado e atualiza status
      await setInstanceWebhook(instanceName, webhookUrl)

      await query(
        `UPDATE whatsapp_connections
         SET status = 'connecting', instance_name = $2, updated_at = NOW()
         WHERE nutritionist_id = $1`,
        [id, instanceName]
      )
    }

    return reply.send({ status: 'connecting', instanceName })
  })

  // ── GET /api/whatsapp/qr ───────────────────────────────────────────────────
  app.get('/qr', auth, async (request, reply) => {
    const { id } = (request as any).user
    const conn = await queryOne<any>(
      'SELECT instance_name FROM whatsapp_connections WHERE nutritionist_id = $1',
      [id]
    )
    if (!conn?.instance_name) return reply.send({ qrCode: null })
    const qrCode = await getQRCode(conn.instance_name)
    return reply.send({ qrCode: qrCode || null })
  })

  // ── GET /api/whatsapp/status ───────────────────────────────────────────────
  app.get('/status', auth, async (request, reply) => {
    const { id } = (request as any).user

    const connection = await queryOne<any>(
      'SELECT * FROM whatsapp_connections WHERE nutritionist_id = $1',
      [id]
    )

    if (!connection) {
      return reply.send({ status: 'disconnected' })
    }

    const liveStatus = await getInstanceStatus(connection.instance_name)

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
      connected_at: connection.connected_at
    })
  })

  // ── POST /api/whatsapp/pairing-code ───────────────────────────────────────
  app.post('/pairing-code', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { phone } = request.body as { phone: string }

    if (!phone) {
      return reply.code(400).send({ error: 'Número de telefone obrigatório' })
    }

    const conn = await queryOne<any>(
      'SELECT instance_name FROM whatsapp_connections WHERE nutritionist_id = $1',
      [id]
    )
    if (!conn?.instance_name) {
      return reply.code(400).send({ error: 'Instância não encontrada. Conecte primeiro.' })
    }

    try {
      const code = await getPairingCode(phone, conn.instance_name)
      return reply.send({ code })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar código'
      return reply.code(500).send({ error: message })
    }
  })

  // ── POST /api/whatsapp/disconnect ──────────────────────────────────────────
  app.post('/disconnect', auth, async (request, reply) => {
    const { id } = (request as any).user

    const conn = await queryOne<any>(
      'SELECT instance_name FROM whatsapp_connections WHERE nutritionist_id = $1',
      [id]
    )

    if (conn?.instance_name) {
      await disconnectInstance(conn.instance_name)
    }

    await query(
      `UPDATE whatsapp_connections SET status = 'disconnected', connected_at = NULL
       WHERE nutritionist_id = $1`,
      [id]
    )

    return reply.send({ ok: true })
  })
}
