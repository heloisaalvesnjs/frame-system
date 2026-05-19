import { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db'
import { createInstance, getQRCode, getInstanceStatus, deleteInstance } from '../services/whatsapp.service'

export async function whatsappRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // POST /api/whatsapp/connect — inicia conexão e retorna QR Code
  app.post('/connect', auth, async (request, reply) => {
    const { id } = (request as any).user

    // Garante que não há instância existente ativa
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

    // Recria instância para garantir webhook URL atualizada
    await deleteInstance(instanceName)
    await createInstance(instanceName)
    const qrCode = await getQRCode(instanceName)

    await query(
      'UPDATE whatsapp_connections SET qr_code = $1 WHERE nutritionist_id = $2',
      [qrCode, id]
    )

    return reply.send({ qrCode, instanceName })
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

    // Verifica status em tempo real na Evolution API
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
