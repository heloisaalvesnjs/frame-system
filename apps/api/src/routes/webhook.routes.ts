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
  messageType: string
  isAudio: boolean
  isVisualMedia: boolean
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

  // Tipo da mensagem — vem no campo `type` do payload real (confirmado no JSDoc acima: "type: text")
  // Para áudio: 'ptt' = voice note gravado no app (push-to-talk), 'audio' = arquivo de áudio
  // ATENÇÃO: valores baseados no formato real capturado em 2026-07-02 + spec uazapi.
  // Validar contra um payload real de áudio se o comportamento for inesperado.
  const messageType = (message.type ?? '') as string
  const isAudio = messageType === 'ptt' || messageType === 'audio'
  // Outras mídias sem texto (imagem, vídeo, documento, sticker) também precisam
  // de fallback — sem isso o lead manda uma foto/PDF e recebe silêncio total.
  const isVisualMedia = ['image', 'video', 'document', 'sticker'].includes(messageType)

  return {
    isMessage: isEventMessage && isDirectMessage,
    fromMe,
    phone,
    messageText,
    messageId,
    instanceToken,
    messageType,
    isAudio,
    isVisualMedia,
  }
}

export async function webhookRoutes(app: FastifyInstance) {

  // Handler central: recebe o payload uazapi, roteia pelo instance_token, processa em background
  async function handleIncoming(request: any, reply: any) {
    const payload = request.body as unknown

    const parsed = parseUazapiPayload(payload)

    // ── 3b: Log mensagens fromMe — instrumentação para futura distinção ───────
    // fromMe=true pode ser: (1) nossa API enviou via uazapi, (2) dono respondeu manualmente.
    // Ainda não diferenciamos os dois — o campo `wasSentByApi` pode ajudar quando validarmos.
    // NÃO implementar takeover automático aqui até confirmar o payload real.
    if (parsed.isMessage && parsed.fromMe && parsed.phone) {
      const msg = (payload as Record<string, unknown>)?.message as Record<string, unknown> | undefined ?? {}
      app.log.info({
        fromMe:       true,
        phone:        parsed.phone,
        messageType:  parsed.messageType,
        hasText:      !!parsed.messageText,
        wasSentByApi: (msg.wasSentByApi) ?? null,
        instanceToken: parsed.instanceToken ? `${parsed.instanceToken.slice(0, 8)}...` : null,
      }, '[webhook] Mensagem fromMe recebida — só logando, sem processar')
    }

    // ── 3a: Áudio sem texto — responde com mensagem fixa e descarta ───────────
    // Detectado via message.type ('ptt' = voice note; 'audio' = arquivo de áudio).
    // NOTA: 'ptt' e 'audio' são os valores esperados com base na spec da uazapi +
    // histórico de payloads — validar contra um áudio real se não funcionar.
    if (parsed.isMessage && !parsed.fromMe && parsed.phone && !parsed.messageText && parsed.isAudio) {
      if (parsed.instanceToken) {
        await sendMessage(
          parsed.phone,
          'Ainda não consigo ouvir áudios por aqui 🙈 Pode me escrever em texto, por favor?',
          parsed.instanceToken
        ).catch(err => app.log.warn({ err, phone: parsed.phone }, '[webhook] Falha ao enviar resposta para áudio não suportado'))
      } else {
        app.log.warn({ phone: parsed.phone, messageType: parsed.messageType }, '[webhook] Áudio recebido mas sem instanceToken para responder')
      }
      return reply.send({ ok: true })
    }

    // ── 3c: Imagem/vídeo/documento/sticker sem texto — responde e descarta ────
    // Mesmo racional do áudio: melhor avisar que não lê o arquivo do que silêncio.
    if (parsed.isMessage && !parsed.fromMe && parsed.phone && !parsed.messageText && parsed.isVisualMedia) {
      if (parsed.instanceToken) {
        await sendMessage(
          parsed.phone,
          'Recebi seu arquivo! 📎 Por aqui eu ainda só consigo ler texto — me conta em palavras o que você precisa? Se for exame ou algo de saúde, já te conecto com o David.',
          parsed.instanceToken
        ).catch(err => app.log.warn({ err, phone: parsed.phone, messageType: parsed.messageType }, '[webhook] Falha ao enviar resposta para mídia não suportada'))
      } else {
        app.log.warn({ phone: parsed.phone, messageType: parsed.messageType }, '[webhook] Mídia recebida mas sem instanceToken para responder')
      }
      return reply.send({ ok: true })
    }

    // ── Filtra eventos que não são mensagens recebidas do cliente ──────────────
    if (!parsed.isMessage || parsed.fromMe || !parsed.phone || !parsed.messageText) {
      return reply.send({ ok: true })
    }

    const { phone, messageText, messageId, instanceToken } = parsed

    // Deduplicação — sem messageId (uazapi não manda em todo payload), cai no fallback
    // por phone+texto; incluir Date.now() aqui tornaria a chave sempre única e anularia
    // a dedupe justamente no caso em que ela é mais necessária (retentativas sem id estável).
    const dedupeKey = messageId || `${phone}:${messageText}`
    if (recentlyProcessed.has(dedupeKey)) {
      app.log.warn(`[webhook] Duplicata ignorada: ${dedupeKey}`)
      return reply.send({ ok: true })
    }
    recentlyProcessed.set(dedupeKey, Date.now())

    try {
      // Multi-tenant: roteia pelo instance_token do payload (a uazapi manda o token
      // direto no corpo — não precisa de instance_id nem de lookup por instância).
      // Sem fallback para "conexão mais recente": o payload real confirmado sempre
      // traz `token` (ver JSDoc acima); um POST forjado sem token seria roteado pra
      // conta de outra nutricionista se caísse num fallback (risco cross-tenant).
      if (!instanceToken) {
        app.log.warn('[webhook] Payload sem instance_token — descartado (nenhum fallback de roteamento)')
        return reply.send({ ok: true })
      }

      const connection = await queryOne<{ nutritionist_id: string; instance_token: string }>(
        `SELECT nutritionist_id, instance_token FROM whatsapp_connections WHERE instance_token = $1`,
        [instanceToken]
      )

      if (!connection) {
        app.log.warn(`[webhook] Nenhuma conexão encontrada para instance_token: ${instanceToken}`)
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
        // Reseta também o cliente — sem isso, a IA continuava recebendo o
        // ai_summary/stage antigo mesmo com a conversa zerada, e "lembrava"
        // de testes anteriores em vez de tratar como lead do zero de fato.
        await query(
          `UPDATE clients SET stage = 'novo_contato', ai_summary = NULL, goal = NULL
           WHERE nutritionist_id = $1 AND phone = $2`,
          [nutritionist_id, phone]
        )
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

      // ── Opt-out explícito: lead pediu para parar de receber mensagens ─────────
      // Detecção conservadora (comandos curtos ou frases inequívocas) para evitar
      // falso positivo. try/catch: a coluna opted_out pode ainda não existir no
      // banco antes da migration — não pode derrubar o webhook por isso.
      const wantsOptOut = /^(parar|pare|stop|sair)[.!]*$|n[aã]o quero mais (receber|mensagem)|pare de (me )?(mandar|enviar)|n[aã]o me mande mais/i.test(messageText.trim())
      if (wantsOptOut) {
        try {
          await query(
            `UPDATE clients SET opted_out = true WHERE nutritionist_id = $1 AND phone = $2`,
            [nutritionist_id, phone]
          )
        } catch (err) {
          app.log.warn({ err }, '[webhook] Falha ao marcar opted_out (coluna pode não existir ainda)')
        }
        await sendMessage(phone, 'Tudo bem! Não vou mais te mandar mensagens 😊 Se mudar de ideia, é só me chamar por aqui.', activeToken)
          .catch(err => app.log.warn({ err }, '[webhook] Falha ao confirmar opt-out'))
        return reply.send({ ok: true })
      }

      // Lead que tinha saído e mandou mensagem nova = reengajou (limpa a flag)
      try {
        await query(
          `UPDATE clients SET opted_out = false
           WHERE nutritionist_id = $1 AND phone = $2 AND opted_out = true`,
          [nutritionist_id, phone]
        )
      } catch { /* coluna pode não existir antes da migration — segue o fluxo */ }

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
                  // claude_api_key removido (S2 da auditoria E2E 2026-07-03): nenhum
                  // workflow usa esse campo (os AI Agents usam a credencial Anthropic
                  // do próprio n8n) e ele ficava gravado em claro nos logs de execução.
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

  // ── POST /webhook/asaas ────────────────────────────────────────────
  // Recebe eventos do Asaas (confirmação de pagamento PIX).
  // Handler TOTALMENTE ISOLADO — não chama handleIncoming nem parseUazapiPayload.
  app.post('/asaas', async (request, reply) => {
    try {
      const token = request.headers['asaas-access-token']
      if (process.env.ASAAS_WEBHOOK_TOKEN && token !== process.env.ASAAS_WEBHOOK_TOKEN) {
        return reply.code(401).send({ error: 'unauthorized' })
      }

      const body = request.body as any
      const event          = body?.event as string | undefined
      const asaasPaymentId = body?.payment?.id as string | undefined

      if ((event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') && asaasPaymentId) {
        await query(
          `UPDATE payments SET status = 'confirmed', paid_at = NOW(), updated_at = NOW()
           WHERE asaas_payment_id = $1`,
          [asaasPaymentId]
        )
        await query(
          `UPDATE appointments SET status = 'confirmed'
           WHERE id = (SELECT appointment_id FROM payments WHERE asaas_payment_id = $1)`,
          [asaasPaymentId]
        )
        app.log.info({ event, asaasPaymentId }, '[webhook/asaas] Pagamento confirmado')
      }

      return reply.send({ ok: true })
    } catch (err) {
      app.log.error(err, '[webhook/asaas] erro ao processar')
      return reply.code(500).send({ ok: false })
    }
  })
}
