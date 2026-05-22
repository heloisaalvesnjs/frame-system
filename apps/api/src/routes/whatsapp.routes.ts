import { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db'
import { getQRCode, getInstanceStatus, getPairingCode, disconnectInstance } from '../services/whatsapp.service'

export async function whatsappRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // POST /api/whatsapp/connect — registra intenção de conectar
  app.post('/connect', auth, async (request, reply) => {
    const { id } = (request as any).user

    const existing = await queryOne<any>(
      'SELECT * FROM whatsapp_connections WHERE nutritionist_id = $1',
      [id]
    )

    if (!existing) {
      await query(
        `INSERT INTO whatsapp_connections (nutritionist_id, instance_name, status)
         VALUES ($1, 'zapi', 'connecting')`,
        [id]
      )
    } else {
      await query(
        `UPDATE whatsapp_connections SET status = 'connecting', updated_at = NOW()
         WHERE nutritionist_id = $1`,
        [id]
      )
    }

    return reply.send({ status: 'connecting' })
  })

  // GET /api/whatsapp/qr — busca QR Code do Z-API
  app.get('/qr', auth, async (_request, reply) => {
    const qrCode = await getQRCode()
    return reply.send({ qrCode: qrCode || null })
  })

  // GET /api/whatsapp/status — status da conexão
  app.get('/status', auth, async (request, reply) => {
    const { id } = (request as any).user

    const connection = await queryOne<any>(
      'SELECT * FROM whatsapp_connections WHERE nutritionist_id = $1',
      [id]
    )

    if (!connection) {
      return reply.send({ status: 'disconnected' })
    }

    const liveStatus = await getInstanceStatus()

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

  // POST /api/whatsapp/pairing-code — gera código de pareamento
  app.post('/pairing-code', auth, async (request, reply) => {
    const { phone } = request.body as { phone: string }

    if (!phone) {
      return reply.code(400).send({ error: 'Número de telefone obrigatório' })
    }

    try {
      const code = await getPairingCode(phone)
      return reply.send({ code })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar código'
      return reply.code(500).send({ error: message })
    }
  })

  // POST /api/whatsapp/disconnect
  app.post('/disconnect', auth, async (request, reply) => {
    const { id } = (request as any).user

    await disconnectInstance()
    await query(
      `UPDATE whatsapp_connections SET status = 'disconnected', connected_at = NULL
       WHERE nutritionist_id = $1`,
      [id]
    )

    return reply.send({ ok: true })
  })
}
