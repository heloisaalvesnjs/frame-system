import { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db'
import { processMessage } from '../services/ai.service'
import { sendMessage, sendWithHumanDelay, sendConfiguredMessage, sendMediaMessage } from '../services/whatsapp.service'
import { isWithinWorkingHours } from '../services/appointment.service'

// Deduplicação: guarda messageIds processados nos últimos 60s
const recentlyProcessed = new Map<string, number>()
setInterval(() => {
  const now = Date.now()
  for (const [key, ts] of recentlyProcessed.entries()) {
    if (now - ts > 60_000) recentlyProcessed.delete(key)
  }
}, 30_000)

/**
 * Extrai os campos relevantes do payload da Evolution API v2.
 *
 * Formato esperado:
 * {
 *   event: "messages.upsert",
 *   instance: "instanceName",
 *   data: {
 *     key: { remoteJid: "5511...@s.whatsapp.net", fromMe: false, id: "BAE..." },
 *     message: { conversation: "texto" },
 *     messageType: "conversation",
 *     ...
 *   }
 * }
 */
function parseEvolutionPayload(payload: any): {
  isMessage: boolean
  isConnectionUpdate: boolean
  fromMe: boolean
  phone: string
  messageText: string
  messageId: string
  instanceName: string
  connected: boolean
} {
  const event = payload?.event ?? ''
  const instanceName = payload?.instance ?? ''
  const data = payload?.data ?? {}

  // ── Mensagem recebida ──────────────────────────────────────
  const isMessage = event === 'messages.upsert'

  const remoteJid: string = data?.key?.remoteJid ?? ''
  const fromMe: boolean = data?.key?.fromMe === true
  // Ignora grupos (@g.us) — só mensagens diretas (@s.whatsapp.net)
  const isDirectMessage = remoteJid.endsWith('@s.whatsapp.net')

  // Normaliza o número: remove @s.whatsapp.net e caracteres não numéricos
  const phone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '')

  // Texto pode estar em conversation (mensagem simples) ou extendedTextMessage (com preview/link)
  const msg = data?.message ?? {}
  const messageText: string =
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    ''

  const messageId: string = data?.key?.id ?? ''

  // ── Atualização de conexão ─────────────────────────────────
  const isConnectionUpdate = event === 'connection.update'
  const connectionState = data?.state ?? data?.instance?.state ?? ''
  const connected = connectionState === 'open'

  return {
    isMessage: isMessage && isDirectMessage,
    isConnectionUpdate,
    fromMe,
    phone,
    messageText,
    messageId,
    instanceName,
    connected
  }
}

export async function webhookRoutes(app: FastifyInstance) {

  // Função auxiliar que processa uma mensagem recebida da Evolution API
  // instanceName opcional: se fornecido na URL tem precedência; senão usa o payload
  async function handleIncoming(request: any, reply: any, instanceNameFromUrl?: string) {
    const payload = request.body as any

    const parsed = parseEvolutionPayload(payload)

    // Usa o instanceName da URL (mais confiável) ou do payload
    const instanceName = instanceNameFromUrl || parsed.instanceName

    // ── Atualização de status de conexão ──────────────────────
    if (parsed.isConnectionUpdate && instanceName) {
      if (parsed.connected) {
        await query(
          `UPDATE whatsapp_connections SET status = 'connected', connected_at = NOW()
           WHERE instance_name = $1`,
          [instanceName]
        )
      } else {
        await query(
          `UPDATE whatsapp_connections SET status = 'disconnected'
           WHERE instance_name = $1`,
          [instanceName]
        )
      }
      return reply.send({ ok: true })
    }

    // ── Filtra eventos que não são mensagens recebidas ─────────
    if (!parsed.isMessage || parsed.fromMe || !parsed.phone || !parsed.messageText) {
      return reply.send({ ok: true })
    }

    const { phone, messageText, messageId } = parsed

    // Deduplicação
    const dedupeKey = messageId || `${phone}:${messageText}:${Date.now()}`
    if (recentlyProcessed.has(dedupeKey)) {
      app.log.warn(`[webhook] Duplicata ignorada: ${dedupeKey}`)
      return reply.send({ ok: true })
    }
    recentlyProcessed.set(dedupeKey, Date.now())

    try {
      // Multi-tenant: identifica o nutri pela instância Evolution API
      // Se instanceName fornecido → busca pela instância exata
      // Fallback: conexão mais recente (compatibilidade)
      const connection = instanceName
        ? await queryOne<any>(
            `SELECT nutritionist_id, instance_name FROM whatsapp_connections WHERE instance_name = $1`,
            [instanceName]
          )
        : await queryOne<any>(
            `SELECT nutritionist_id, instance_name FROM whatsapp_connections ORDER BY updated_at DESC LIMIT 1`
          )

      if (!connection) {
        app.log.warn(`[webhook] Nenhuma conexão encontrada${instanceName ? ` para instância: ${instanceName}` : ''}`)
        return reply.send({ ok: true })
      }

      const { nutritionist_id } = connection
      // Usa o instance_name do banco como fonte de verdade para envio
      const activeInstance = connection.instance_name || instanceName

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
          await query(`DELETE FROM messages WHERE conversation_id = $1`, [conversation.id])
          await query(`DELETE FROM conversations WHERE id = $1`, [conversation.id])
        }
        await sendMessage(phone, '🔄 Conversa reiniciada! Pode mandar oi para começar do zero.', activeInstance)
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
        `SELECT name, vacation_mode, vacation_message, ai_paused FROM assistants
         WHERE nutritionist_id = $1 AND is_active = true`,
        [nutritionist_id]
      )

      // IA desativada manualmente → silêncio total
      if (assistantConfig?.ai_paused) {
        return reply.send({ ok: true })
      }

      if (assistantConfig) {
        let blocked = false
        let outOfHoursMsg = ''
        let silentBlock = false // bloqueia sem enviar nada

        if (assistantConfig.vacation_mode) {
          blocked = true
          const customMsg = assistantConfig.vacation_message?.trim()
          if (customMsg) {
            // Tem mensagem configurada → envia uma vez e para
            outOfHoursMsg = customMsg
          } else {
            // Sem mensagem → bloqueia silenciosamente (não envia nada)
            silentBlock = true
          }
        } else {
          const isOpen = await isWithinWorkingHours(nutritionist_id)
          if (!isOpen) {
            blocked = true
            outOfHoursMsg =
              'Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve 😊'
          }
        }

        if (blocked) {
          // Salva a mensagem do cliente na conversa
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

          await query(
            'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
            [convId, 'user', messageText]
          )

          // Modo férias sem mensagem = silêncio total
          if (silentBlock) {
            return reply.send({ ok: true })
          }

          // Fora do horário ou férias com mensagem → envia apenas uma vez
          const lastAssistantMsg = await queryOne<any>(
            `SELECT content FROM messages
             WHERE conversation_id = $1 AND role = 'assistant'
             ORDER BY sent_at DESC LIMIT 1`,
            [convId]
          )

          const alreadyWarned = lastAssistantMsg?.content && (
            lastAssistantMsg.content.includes('fora do horário') ||
            lastAssistantMsg.content.includes(outOfHoursMsg.slice(0, 30))
          )

          if (!alreadyWarned) {
            await sendMessage(phone, outOfHoursMsg, activeInstance)
            await query(
              'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
              [convId, 'assistant', outOfHoursMsg]
            )
          }

          return reply.send({ ok: true })
        }
      }
      // ──────────────────────────────────────────────────────────

      // Retorna 200 IMEDIATAMENTE para a Evolution API não retentar
      reply.send({ ok: true })

      // Processa em background (fire-and-forget)
      ;(async () => {
        try {
          // ── Encaminha para n8n se N8N_WEBHOOK_URL configurado ─────────
          // O n8n processa a mensagem e chama de volta via /api/internal/n8n/*
          // para salvar respostas e enviar WhatsApp.
          // Se o n8n estiver indisponível (timeout 5s), cai no processMessage inline.
          const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL
          if (n8nWebhookUrl) {
            let forwardedToN8n = false
            try {
              await fetch(n8nWebhookUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Frame-Event': 'message.received',
                },
                body: JSON.stringify({
                  event: 'whatsapp.message.received',
                  nutritionist_id,
                  client_phone: phone,
                  message_text: messageText,
                  instance_name: activeInstance,
                  internal_api_url: process.env.API_PUBLIC_URL || process.env.INTERNAL_API_URL || 'http://localhost:3001',
                  internal_api_key: process.env.INTERNAL_API_KEY,
                }),
                signal: AbortSignal.timeout(5000),
              })
              forwardedToN8n = true
            } catch {
              app.log.warn('[webhook] N8N_WEBHOOK_URL configurado mas inacessível — processando inline')
            }
            // Se n8n recebeu com sucesso: ele assume o controle, não processa aqui
            if (forwardedToN8n) return
          }
          // ─────────────────────────────────────────────────────────────

          const response = await processMessage({
            nutritionist_id,
            client_phone: phone,
            message: messageText,
            conversation_id: conversation?.id
          })

          if (!response?.text) {
            app.log.error('[webhook] processMessage retornou sem texto — enviando fallback')
            await sendMessage(phone, 'Oi! Estou com uma instabilidade aqui. Pode repetir sua mensagem? 🙏', activeInstance)
              .catch(err => app.log.warn({ err }, '[webhook] Falha ao enviar fallback de resposta vazia'))
            return
          }

          // Modo copiloto: a resposta da IA fica como rascunho aguardando
          // aprovação da nutri em /conversas — nada é enviado ao paciente agora.
          if (response.pendingApproval) {
            app.log.info('[webhook] Conversa em modo copiloto — resposta salva como rascunho, aguardando aprovação')
            return
          }

          if (response.raw) {
            await sendConfiguredMessage(phone, response.text, activeInstance, messageId)
          } else {
            await sendWithHumanDelay(phone, response.text, activeInstance, messageId)
          }

          // Envia mídia dos planos se configurada e ETAPA 3 detectada
          if (response.planMediaUrl && response.planMediaType) {
            await new Promise(r => setTimeout(r, 1200))
            await sendMediaMessage(
              phone,
              response.planMediaUrl,
              response.planMediaType,
              response.planMediaName || 'planos.pdf',
              activeInstance
            ).catch(err => app.log.warn({ err }, '[webhook] Falha ao enviar mídia dos planos (não crítico)'))

            // Envia mensagem de texto APÓS a mídia (configurada pelo nutri)
            if (response.planMessageText) {
              await new Promise(r => setTimeout(r, 2000))
              await sendMessage(phone, response.planMessageText, activeInstance)
                .catch(err => app.log.warn({ err }, '[webhook] Falha ao enviar mensagem pós-mídia (não crítico)'))
            }
          } else if (response.planMessageText) {
            // Sem mídia, mas há mensagem de planos configurada — envia direto
            await new Promise(r => setTimeout(r, 1500))
            await sendMessage(phone, response.planMessageText, activeInstance)
              .catch(err => app.log.warn({ err }, '[webhook] Falha ao enviar mensagem de planos (não crítico)'))
          }

          // Envia mensagem de confirmação de agendamento (local, preço, instruções)
          if (response.bookingConfirmationMessage) {
            await new Promise(r => setTimeout(r, 2500))
            await sendMessage(phone, response.bookingConfirmationMessage, activeInstance)
              .catch(err => app.log.warn({ err }, '[webhook] Falha ao enviar confirmação de agendamento (não crítico)'))
          }
        } catch (err: any) {
          app.log.error({ err, phone, nutritionist_id, messageText: messageText.slice(0, 100) }, '[webhook] Erro ao processar mensagem em background')
          // Tenta enviar mensagem de fallback para não deixar o cliente sem resposta
          try {
            await sendMessage(phone, 'Oi! Estou com uma instabilidade aqui. Pode repetir sua mensagem? 🙏', activeInstance)
          } catch {}
        }
      })()

      return

    } catch (err) {
      app.log.error(err, '[webhook] Erro antes do processamento')
    }

    return reply.send({ ok: true })
  }

  // Rota genérica — instância identificada pelo campo `instance` do payload
  app.post('/whatsapp', async (request, reply) => {
    return handleIncoming(request, reply)
  })

  // Rota por instância (multi-tenant): /webhook/whatsapp/{instance_name}
  // Cada nutri configura o webhook da Evolution API com o nome da sua instância
  app.post('/whatsapp/:instanceName', async (request, reply) => {
    const { instanceName } = request.params as any
    return handleIncoming(request, reply, instanceName)
  })
}
