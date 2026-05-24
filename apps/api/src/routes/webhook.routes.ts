import { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db'
import { processMessage } from '../services/ai.service'
import { sendMessage } from '../services/whatsapp.service'

export async function webhookRoutes(app: FastifyInstance) {

  // POST /webhook/whatsapp — recebe mensagens do Z-API
  app.post('/whatsapp', async (request, reply) => {
    const payload = request.body as any

    console.log('[webhook] payload recebido:', JSON.stringify(payload).slice(0, 200))

    // Z-API: filtra só mensagens recebidas de pacientes
    const isReceived = payload.type === 'ReceivedCallback'
    const fromMe     = payload.fromMe === true
    const phone      = payload.phone        // número do paciente (ex: 5511999999999)
    const messageText = payload.text?.message

    if (!isReceived || fromMe || !phone || !messageText) {
      console.log(`[webhook] ignorado — type=${payload.type} fromMe=${payload.fromMe} phone=${phone}`)
      return reply.send({ ok: true })
    }

    console.log(`[webhook] Mensagem de ${phone}: ${messageText}`)

    try {
      // Identifica a nutricionista pela conexão mais recente
      const connection = await queryOne<any>(
        `SELECT nutritionist_id FROM whatsapp_connections
         ORDER BY updated_at DESC LIMIT 1`
      )

      if (!connection) {
        app.log.warn('[webhook] Nenhuma conexão Z-API encontrada')
        return reply.send({ ok: true })
      }

      const { nutritionist_id } = connection

      // Verifica se a conversa está em modo humano (takeover)
      const conversation = await queryOne<any>(
        `SELECT * FROM conversations
         WHERE nutritionist_id = $1 AND client_phone = $2
         ORDER BY created_at DESC LIMIT 1`,
        [nutritionist_id, phone]
      )

      if (conversation?.status === 'human_takeover') {
        // Só salva a mensagem, não responde automaticamente
        await query(
          'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
          [conversation.id, 'user', messageText]
        )
        return reply.send({ ok: true })
      }

      // Processa com a IA (busca assistente, histórico, chama Claude)
      const response = await processMessage({
        nutritionist_id,
        client_phone: phone,
        message: messageText,
        conversation_id: conversation?.id
      })

      // Envia resposta via Z-API
      await sendMessage(phone, response.text)

      console.log(`[webhook] Resposta enviada para ${phone}`)
    } catch (err) {
      console.error('[webhook] Erro ao processar mensagem:', err)
    }

    return reply.send({ ok: true }) // sempre 200 — Z-API não retenta em erro
  })

  // POST /webhook/whatsapp-status — atualiza status de conexão
  app.post('/whatsapp-status', async (request, reply) => {
    const payload = request.body as any
    app.log.info('[webhook/status]', JSON.stringify(payload))

    if (payload.connected === true) {
      await query(
        `UPDATE whatsapp_connections SET status = 'connected', connected_at = NOW()
         WHERE instance_name = 'zapi'`
      )
    } else if (payload.connected === false) {
      await query(
        `UPDATE whatsapp_connections SET status = 'disconnected'
         WHERE instance_name = 'zapi'`
      )
    }

    return reply.send({ ok: true })
  })
}
