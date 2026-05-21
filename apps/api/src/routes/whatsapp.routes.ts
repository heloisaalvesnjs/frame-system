import { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db'
import { createInstance, getQRCode, getInstanceStatus, deleteInstance, getPairingCode } from '../services/whatsapp.service'

export async function whatsappRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // POST /api/whatsapp/connect — recria instância de forma síncrona
  app.post('/connect', auth, async (request, reply) => {
    const { id } = (request as any).user

    const existing = await queryOne<any>(
      'SELECT * FROM whatsapp_connections WHERE nutritionist_id = $1',
      [id]
    )

    const instanceName = `nutri_${id.replace(/-/g, '').slice(0, 12)}`

    if (!existing) {
      await query(
        `INSERT INTO whatsapp_connections (nutritionist_id, instance_name, status)
         VALUES ($1, $2, 'connecting')`,
        [id, instanceName]
      )
    } else {
      await query(
        `UPDATE whatsapp_connections SET status = 'connecting', updated_at = NOW()
         WHERE nutritionist_id = $1`,
        [id]
      )
    }

    // Recria a instância de forma síncrona para garantir que está pronta
    try { await deleteInstance(instanceName) } catch {}
    await new Promise(r => setTimeout(r, 2000))
    await createInstance(instanceName)

    return reply.send({ status: 'connecting', instanceName })
  })

  // GET /api/whatsapp/qr — lê QR Code do banco (salvo pelo webhook)
  app.get('/qr', auth, async (request, reply) => {
    const { id } = (request as any).user

    const connection = await queryOne<any>(
      'SELECT qr_code FROM whatsapp_connections WHERE nutritionist_id = $1',
      [id]
    )

    return reply.send({ qrCode: connection?.qr_code || null })
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

    const liveStatus = await getInstanceStatus(connection.instance_name)

    if (liveStatus === 'connected' && connection.status !== 'connected') {
      await query(
        `UPDATE whatsapp_connections SET status = 'connected', connected_at = NOW(), qr_code = NULL
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

  // POST /api/whatsapp/pairing-code — gera código de pareamento por número
  app.post('/pairing-code', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { phone } = request.body as { phone: string }

    if (!phone) {
      return reply.code(400).send({ error: 'Número de telefone obrigatório' })
    }

    const connection = await queryOne<any>(
      'SELECT instance_name FROM whatsapp_connections WHERE nutritionist_id = $1',
      [id]
    )

    if (!connection) {
      return reply.code(404).send({ error: 'Instância não encontrada. Clique em Conectar primeiro.' })
    }

    try {
      const code = await getPairingCode(connection.instance_name, phone)
      return reply.send({ code })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar código'
      return reply.code(500).send({ error: message })
    }
  })

  // POST /api/whatsapp/disconnect
  app.post('/disconnect', auth, async (request, reply) => {
    const { id } = (request as any).user

    const connection = await queryOne<any>(
      'SELECT instance_name FROM whatsapp_connections WHERE nutritionist_id = $1',
      [id]
    )

    if (connection) {
      await deleteInstance(connection.instance_name)
      await query(
        `UPDATE whatsapp_connections SET status = 'disconnected', connected_at = NULL
         WHERE nutritionist_id = $1`,
        [id]
      )
    }

    return reply.send({ ok: true })
  })
}
