import { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db'
import { processMessage } from '../services/ai.service'
import { sendMessage } from '../services/whatsapp.service'

export async function webhookRoutes(app: FastifyInstance) {

  // POST /webhook/whatsapp — recebe eventos da Evolution API
  app.post('/whatsapp', async (request, reply) => {
    const payload = request.body as any
    const event = payload.event

    // QR Code gerado
    if (event === 'qrcode.updated') {
      const instanceName = payload.instance
      const qrCode = payload.data?.qrcode?.base64 || payload.data?.base64 || ''
      if (instanceName && qrCode) {
        await query(
          'UPDATE whatsapp_connections SET qr_code = $1 WHERE instance_name = $2',
          [qrCode, instanceName]
        )
      }
      return reply.send({ ok: true })
    }

    // WhatsApp conectado
    if (event === 'connection.update') {
      const instanceName = payload.instance
      const state = payload.data?.state
      if (state === 'open' && instanceName) {
        await query(
          `UPDATE whatsapp_connections SET status = 'connected', connected_at = NOW(), qr_code = NULL
           WHERE instance_name = $1`,
          [instanceName]
        )
      }
      return reply.send({ ok: true })
    }

    // Ignora eventos que não são mensagens
    if (event !== 'messages.upsert') return reply.send({ ok: true })

    const msg = payload.data?.messages?.[0]
    if (!msg || msg.key?.fromMe) return reply.send({ ok: true }) // ignora mensagens enviadas pela própria nutri

    const instanceName = payload.instance
    const clientPhone = msg.key?.remoteJid?.replace('@s.whatsapp.net', '')
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text

    if (!clientPhone || !messageText) return reply.send({ ok: true })

    try {
      // Identifica a nutricionista pelo nome da instância
      const connection = await queryOne<any>(
        'SELECT nutritionist_id FROM whatsapp_connections WHERE instance_name = $1 AND status = $2',
        [instanceName, 'connected']
      )

      if (!connection) {
        app.log.warn(`Instância ${instanceName} não encontrada ou desconectada`)
        return reply.send({ ok: true })
      }

      const { nutritionist_id } = connection

      // Verifica se a conversa está em modo humano (takeover)
      const conversation = await queryOne<any>(
        `SELECT * FROM conversations
         WHERE nutritionist_id = $1 AND client_phone = $2
         ORDER BY created_at DESC LIMIT 1`,
        [nutritionist_id, clientPhone]
      )

      if (conversation?.status === 'human_takeover') {
        // Só salva a mensagem, não responde automaticamente
        await query(
          'INSERT INTO messages (conversation_id, role, content, whatsapp_message_id) VALUES ($1, $2, $3, $4)',
          [conversation.id, 'user', messageText, msg.key?.id]
        )
        return reply.send({ ok: true })
      }

      // Processa com a IA
      const response = await processMessage({
        nutritionist_id,
        client_phone: clientPhone,
        message: messageText,
        conversation_id: conversation?.id
      })

      // Envia resposta via WhatsApp
      await sendMessage(instanceName, clientPhone, response.text)

      reply.send({ ok: true })
    } catch (err) {
      app.log.error(err, 'Erro ao processar mensagem do webhook')
      reply.send({ ok: true }) // sempre responde 200 para não retentar
    }
  })
}
