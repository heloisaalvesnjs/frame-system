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
 * Extrai os campos relevantes do payload da uazapi (modo simples, evento "messages").
 *
 * Formato REAL confirmado em produção em 2026-07-02 (via captura de payload bruto —
 * diferente da documentação oficial docs.uazapi.com, que descrevia `event`/`instance`/`data`):
 * {
 *   EventType: "messages",
 *   instanceName: "RA5S2j",           ← nome de exibição da instância, NÃO é o instance_id
 *   token: "3041108b-...",            ← instance_token direto no payload — usado pra rotear
 *   message: {
 *     chatid: "5511999999999@s.whatsapp.net",
 *     isGroup: false,
 *     fromMe: false,
 *     type: "text",
 *     text: "texto da mensagem",
 *     content: "texto da mensagem",   ← duplicado de text em mensagens simples
 *     messageid: "...",
 *     wasSentByApi: false
 *   }
 * }
 */
function parseUazapiPayload(payload: unknown): {
  isMessage: boolean
  fromMe: boolean
  phone: string
  messageText: string
  messageId: string
  instanceToken: string
} {
  const p = (payload ?? {}) as Record<string, unknown>
  const eventType     = (p.EventType ?? p.event ?? '') as string
  const instanceToken = (p.token     ?? '') as string
  const message        = (p.message  ?? p.data ?? {}) as Record<string, unknown>

  // uazapi usa EventType = "messages" para mensagens recebidas
  const isEventMessage = eventType === 'messages'

  const chatId  = (message.chatid  ?? '') as string
  const fromMe  = message.fromMe === true
  const isGroup = message.isGroup === true || chatId.endsWith('@g.us')

  // Só processa mensagens diretas (@s.whatsapp.net), não grupos
  const isDirectMessage = chatId.endsWith('@s.whatsapp.net') && !isGroup

  // Normaliza o número: remove @s.whatsapp.net e caracteres não-numéricos
  const phone = chatId.replace('@s.whatsapp.net', '').replace(/\D/g, '')

  const messageText = ((message.text ?? message.content) ?? '') as string
  const messageId   = (message.messageid ?? '') as string

  return {
    isMessage: isEventMessage && isDirectMessage,
    fromMe,
    phone,
    messageText,
    messageId,
    instanceToken,
  }
}

export async function webhookRoutes(app: FastifyInstance) {

  // Handler central: recebe o payload uazapi, roteia pelo instance_token, processa em background
  async function handleIncoming(request: any, reply: any) {
    const payload = request.body as unknown

    const parsed = parseUazapiPayload(payload)

    // ── Filtra eventos que não são mensagens recebidas do cliente ──────────────
    if (!parsed.isMessage || parsed.fromMe || !parsed.phone || !parsed.messageText) {
      return reply.send({ ok: true })
    }

    const { phone, messageText, messageId, instanceToken } = parsed

    // Deduplicação
    const dedupeKey = messageId || `${phone}:${messageText}:${Date.now()}`
    if (recentlyProcessed.has(dedupeKey)) {
      app.log.warn(`[webhook] Duplicata ignorada: ${dedupeKey}`)
      return reply.send({ ok: true })
    }
    recentlyProcessed.set(dedupeKey, Date.now())

    try {
      // Multi-tenant: roteia pelo instance_token do payload (a uazapi manda o token
      // direto no corpo — não precisa de instance_id nem de lookup por instância)
      const connection = instanceToken
        ? await queryOne<{ nutritionist_id: string; instance_token: string }>(
            `SELECT nutritionist_id, instance_token FROM whatsapp_connections WHERE instance_token = $1`,
            [instanceToken]
          )
        : await queryOne<{ nutritionist_id: string; instance_token: string }>(
            `SELECT nutritionist_id, instance_token FROM whatsapp_connections
             WHERE status = 'connected' ORDER BY updated_at DESC LIMIT 1`
          )

      if (!connection) {
        app.log.warn(`[webhook] Nenhuma conexão encontrada${instanceToken ? ` para instance_token: ${instanceToken}` : ''}`)
        return reply.send({ ok: true })
      }

      const { nutritionist_id } = connection
      // instance_token é o que a uazapi exige no header para enviar mensagens
      const activeToken = connection.instance_token

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
        await sendMessage(phone, '🔄 Conversa reiniciada! Pode mandar oi para começar do zero.', activeToken)
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

      // ── Verifica horário de funcionamento e modo férias ──────────────────────
      const assistantConfig = await queryOne<any>(
        `SELECT name, vacation_mode, vacation_message, ai_paused, ai_24h FROM assistants
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
        let silentBlock = false

        if (assistantConfig.vacation_mode) {
          blocked = true
          const customMsg = assistantConfig.vacation_message?.trim()
          if (customMsg) {
            outOfHoursMsg = customMsg
          } else {
            silentBlock = true
          }
        } else if (!assistantConfig.ai_24h) {
          const isOpen = await isWithinWorkingHours(nutritionist_id)
          if (!isOpen) {
            blocked = true
            outOfHoursMsg = 'Olá! No momento estamos fora do horário de atendimento. Retornaremos em breve 😊'
          }
        }

        if (blocked) {
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
          if (silentBlock) return reply.send({ ok: true })

          // Fora do horário ou férias com mensagem → envia apenas uma vez
          const lastAssistantMsg = await queryOne<{ content: string }>(
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
            await sendMessage(phone, outOfHoursMsg, activeToken)
            await query(
              'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
              [convId, 'assistant', outOfHoursMsg]
            )
          }

          return reply.send({ ok: true })
        }
      }

      // Retorna 200 IMEDIATAMENTE para a uazapi não retentar
      reply.send({ ok: true })

      // Processa em background (fire-and-forget)
      ;(async () => {
        try {
          // ── Encaminha para n8n se N8N_WEBHOOK_URL configurado ────────────────
          // O n8n processa a mensagem e chama de volta via /api/internal/n8n/*
          // para salvar respostas e enviar WhatsApp via uazapi.
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
                  // Credenciais uazapi para o n8n enviar mensagens de resposta
                  instance_token:  activeToken,
                  uazapi_base_url: process.env.UAZAPI_BASE_URL || '',
                  // Frame API interna — usa o hostname interno do Docker (evita hairpin no proxy
                  // do EasyPanel quando o n8n chama a própria API pelo domínio público)
                  internal_api_url: process.env.API_INTERNAL_URL || process.env.API_PUBLIC_URL || 'https://api.framesystem.com.br',
                  internal_api_key: process.env.INTERNAL_API_KEY,
                  // Outros serviços
                  n8n_base_url:  process.env.N8N_WEBHOOK_URL?.split('/webhook')[0] || '',
                  claude_api_key: process.env.ANTHROPIC_API_KEY,
                }),
                signal: AbortSignal.timeout(5000),
              })
              forwardedToN8n = true
            } catch {
              app.log.warn('[webhook] N8N_WEBHOOK_URL configurado mas inacessível — processando inline')
            }
            if (forwardedToN8n) return
          }
          // ─────────────────────────────────────────────────────────────────────

          const response = await processMessage({
            nutritionist_id,
            client_phone: phone,
            message: messageText,
            conversation_id: conversation?.id,
          })

          if (!response?.text) {
            app.log.error('[webhook] processMessage retornou sem texto — enviando fallback')
            await sendMessage(phone, 'Oi! Estou com uma instabilidade aqui. Pode repetir sua mensagem? 🙏', activeToken)
              .catch(err => app.log.warn({ err }, '[webhook] Falha ao enviar fallback de resposta vazia'))
            return
          }

          // Modo copiloto: resposta fica como rascunho aguardando aprovação da nutri em /conversas
          if (response.pendingApproval) {
            app.log.info('[webhook] Conversa em modo copiloto — resposta salva como rascunho, aguardando aprovação')
            return
          }

          if (response.raw) {
            await sendConfiguredMessage(phone, response.text, activeToken, messageId)
          } else {
            await sendWithHumanDelay(phone, response.text, activeToken, messageId)
          }

          // Envia mídia dos planos se configurada e ETAPA 3 detectada
          if (response.planMediaUrl && response.planMediaType) {
            await new Promise(r => setTimeout(r, 1200))
            await sendMediaMessage(
              phone,
              response.planMediaUrl,
              response.planMediaType,
              response.planMediaName || 'planos.pdf',
              activeToken
            ).catch(err => app.log.warn({ err }, '[webhook] Falha ao enviar mídia dos planos (não crítico)'))

            if (response.planMessageText) {
              await new Promise(r => setTimeout(r, 2000))
              await sendMessage(phone, response.planMessageText, activeToken)
                .catch(err => app.log.warn({ err }, '[webhook] Falha ao enviar mensagem pós-mídia (não crítico)'))
            }
          } else if (response.planMessageText) {
            await new Promise(r => setTimeout(r, 1500))
            await sendMessage(phone, response.planMessageText, activeToken)
              .catch(err => app.log.warn({ err }, '[webhook] Falha ao enviar mensagem de planos (não crítico)'))
          }

          // Envia mensagem de confirmação de agendamento (local, preço, instruções)
          if (response.bookingConfirmationMessage) {
            await new Promise(r => setTimeout(r, 2500))
            await sendMessage(phone, response.bookingConfirmationMessage, activeToken)
              .catch(err => app.log.warn({ err }, '[webhook] Falha ao enviar confirmação de agendamento (não crítico)'))
          }
        } catch (err: unknown) {
          app.log.error(
            { err, phone, nutritionist_id, messageText: messageText.slice(0, 100) },
            '[webhook] Erro ao processar mensagem em background'
          )
          try {
            await sendMessage(phone, 'Oi! Estou com uma instabilidade aqui. Pode repetir sua mensagem? 🙏', activeToken)
          } catch { /* silencioso */ }
        }
      })()

      return

    } catch (err) {
      app.log.error(err, '[webhook] Erro antes do processamento')
    }

    return reply.send({ ok: true })
  }

  // Rota principal — a uazapi envia para esta URL; o roteamento é feito pelo `instance` no payload
  app.post('/whatsapp', async (request, reply) => {
    return handleIncoming(request, reply)
  })

  // Rota com path param mantida para compatibilidade futura, mas o roteamento
  // real é feito pelo campo `instance` do payload uazapi, não pela URL
  app.post('/whatsapp/:instanceParam', async (request, reply) => {
    return handleIncoming(request, reply)
  })
}
