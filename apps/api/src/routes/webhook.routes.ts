import { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db'
import { processMessage } from '../services/ai.service'
import { sendMessage, sendWithHumanDelay } from '../services/whatsapp.service'
import { isWithinWorkingHours } from '../services/appointment.service'

export async function webhookRoutes(app: FastifyInstance) {

  // POST /webhook/whatsapp — recebe mensagens do Z-API
  app.post('/whatsapp', async (request, reply) => {
    const payload = request.body as any

    // Z-API: filtra só mensagens recebidas de pacientes
    const isReceived = payload.type === 'ReceivedCallback'
    const fromMe     = payload.fromMe === true
    const phone      = payload.phone        // número do paciente (ex: 5511999999999)
    const messageText = payload.text?.message

    if (!isReceived || fromMe || !phone || !messageText) {
      return reply.send({ ok: true })
    }

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

      // Comando /new — reinicia a conversa
      if (messageText.trim().toLowerCase() === '/new') {
        if (conversation) {
          await query(
            `DELETE FROM messages WHERE conversation_id = $1`,
            [conversation.id]
          )
          await query(
            `DELETE FROM conversations WHERE id = $1`,
            [conversation.id]
          )
        }
        await sendMessage(phone, '🔄 Conversa reiniciada! Pode mandar oi para começar do zero.')
        return reply.send({ ok: true })
      }

      if (conversation?.status === 'human_takeover') {
        // Só salva a mensagem, não responde automaticamente
        await query(
          'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
          [conversation.id, 'user', messageText]
        )
        return reply.send({ ok: true })
      }

      // ── Verifica horário de funcionamento e modo férias ────────
      const assistantConfig = await queryOne<any>(
        `SELECT name, vacation_mode, vacation_message FROM assistants
         WHERE nutritionist_id = $1 AND is_active = true`,
        [nutritionist_id]
      )

      if (assistantConfig) {
        let blocked = false
        let outOfHoursMsg = ''

        if (assistantConfig.vacation_mode) {
          blocked = true
          outOfHoursMsg = assistantConfig.vacation_message ||
            'Estamos em período de férias. Em breve retornaremos! 🌴'
        } else {
          const isOpen = await isWithinWorkingHours(nutritionist_id)
          if (!isOpen) {
            blocked = true
            outOfHoursMsg =
              'Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve 😊'
          }
        }

        if (blocked) {
          // Garante que a conversa existe para salvar a mensagem
          let convId = conversation?.id
          if (!convId) {
            const [newConv] = await query(
              `INSERT INTO conversations (nutritionist_id, client_phone, status, last_message_at)
               VALUES ($1, $2, 'active', NOW()) RETURNING id`,
              [nutritionist_id, phone]
            )
            convId = newConv.id
          } else {
            await query('UPDATE conversations SET last_message_at = NOW() WHERE id = $1', [convId])
          }

          // Salva mensagem do usuário
          await query(
            'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
            [convId, 'user', messageText]
          )

          // Só envia aviso uma vez por conversa (evita spam)
          const lastAssistantMsg = await queryOne<any>(
            `SELECT content FROM messages
             WHERE conversation_id = $1 AND role = 'assistant'
             ORDER BY sent_at DESC LIMIT 1`,
            [convId]
          )

          const alreadyWarned = lastAssistantMsg?.content && (
            lastAssistantMsg.content.includes('fora do horário') ||
            lastAssistantMsg.content.includes('férias')
          )

          if (!alreadyWarned) {
            await sendMessage(phone, outOfHoursMsg)
            await query(
              'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
              [convId, 'assistant', outOfHoursMsg]
            )
          }

          return reply.send({ ok: true })
        }
      }
      // ─────────────────────────────────────────────────────────

      // Processa com a IA (busca assistente, historico, chama Claude)
      const response = await processMessage({
        nutritionist_id,
        client_phone: phone,
        message: messageText,
        conversation_id: conversation?.id
      })

      // Envia com delay humanizado (leitura + digitacao simulados)
      const messageId = payload.messageId || payload.id || undefined
      await sendWithHumanDelay(phone, response.text, messageId)

    } catch (err) {
      app.log.error(err, '[webhook] Erro ao processar mensagem')
    }

    return reply.send({ ok: true }) // sempre 200 — Z-API não retenta em erro
  })

  // POST /webhook/whatsapp-status — atualiza status de conexão
  app.post('/whatsapp-status', async (request, reply) => {
    const payload = request.body as any
    app.log.info({ payload }, '[webhook/status]')

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
