import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { query, queryOne } from '../db'
import { getNextAvailableSlots } from './appointment.service'
import { sendMessageForNutri } from './whatsapp.service'
import { createCalendarEvent } from './google-calendar.service'
import { fireWebhookEvent, buildPlansPayload, buildAppointmentPayload } from './webhook-events.service'

// ── Providers ────────────────────────────────────────────────
// Ordem: Claude Haiku (primário + cache) → Gemini Flash (fallback grátis) → Groq (emergência)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })
const genai     = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const groq      = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })

// Modelos Claude em ordem de preferência (mais novo → mais antigo como fallback)
const CLAUDE_MODELS = [
  'claude-haiku-4-5',
  'claude-3-5-haiku-20241022',
  'claude-3-haiku-20240307',
]

async function callClaude(systemPrompt: string, messages: { role: 'user' | 'assistant', content: string }[], userMessage: string): Promise<string> {
  let lastError: any
  for (const model of CLAUDE_MODELS) {
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 350,
        system: systemPrompt,
        messages: [...messages, { role: 'user', content: userMessage }],
      })
      return response.content[0].type === 'text' ? response.content[0].text : ''
    } catch (err: any) {
      const status = err?.status ?? err?.error?.type ?? err?.message ?? 'unknown'
      console.warn(`[AI] Claude model ${model} falhou (${status}), tentando próximo...`)
      lastError = err
      // Se for erro de autenticação/chave, não adianta tentar outros modelos
      if (err?.status === 401 || err?.status === 403) throw err
    }
  }
  throw lastError
}

async function callGemini(systemPrompt: string, messages: { role: 'user' | 'assistant', content: string }[], userMessage: string): Promise<string> {
  const model = genai.getGenerativeModel({
    model: 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: { maxOutputTokens: 350 }
  })
  const history = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))
  const chat   = model.startChat({ history })
  const result = await chat.sendMessage(userMessage)
  return result.response.text()
}

async function callGroq(systemPrompt: string, messages: { role: 'user' | 'assistant', content: string }[], userMessage: string): Promise<string> {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 350,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage }
    ]
  })
  return response.choices[0]?.message?.content || ''
}

async function callAI(systemPrompt: string, messages: { role: 'user' | 'assistant', content: string }[], userMessage: string): Promise<string> {
  // Claude (primário) → Gemini (fallback grátis) → Groq (emergência)
  const hasGemini = !!process.env.GEMINI_API_KEY
  const providers = [
    { name: 'claude', fn: callClaude },
    ...(hasGemini ? [{ name: 'gemini', fn: callGemini }] : []),
    { name: 'groq',   fn: callGroq   },
  ]

  for (let i = 0; i < providers.length; i++) {
    const { name, fn } = providers[i]
    try {
      const result = await fn(systemPrompt, messages, userMessage)
      if (i > 0) console.log(`[AI] Usando ${name}`)
      return result
    } catch (err: any) {
      const isLast = i === providers.length - 1
      console.error(`[AI] ${name} falhou (${err?.status ?? err?.message}). ${isLast ? 'Sem mais fallbacks.' : 'Tentando próximo...'}`)
      if (isLast) throw err
    }
  }

  throw new Error('Todos os providers de IA falharam')
}

// ── Tipos ──────────────────────────────────────────────────
interface ProcessMessageInput {
  nutritionist_id: string
  client_phone: string
  message: string
  conversation_id?: string
}

interface ProcessMessageOutput {
  text: string
  action?: 'appointment_created' | 'slots_shown' | null
  raw?: boolean
  planMediaUrl?: string
  planMediaType?: 'image' | 'pdf'
  planMediaName?: string
  planMessageText?: string
  bookingConfirmationMessage?: string
}

// ── Serviço principal ──────────────────────────────────────
export async function processMessage(input: ProcessMessageInput): Promise<ProcessMessageOutput> {
  const { nutritionist_id, client_phone, message, conversation_id } = input

  // 1. Busca o perfil da nutricionista e assistente
  const nutritionist = await queryOne<any>(
    'SELECT * FROM nutritionists WHERE id = $1',
    [nutritionist_id]
  )
  const assistant = await queryOne<any>(
    'SELECT * FROM assistants WHERE nutritionist_id = $1 AND is_active = true',
    [nutritionist_id]
  )

  if (!assistant) {
    return { text: 'Olá! Estou aqui para ajudar. Como posso te atender?' }
  }

  // 2. Garante que existe uma conversa aberta
  let convId = conversation_id
  let contextData: any = {}

  if (!convId) {
    const [conv] = await query(
      `INSERT INTO conversations (nutritionist_id, client_phone, status, last_message_at)
       VALUES ($1, $2, 'active', NOW())
       RETURNING id, context`,
      [nutritionist_id, client_phone]
    )
    convId = conv.id
    contextData = {}
  } else {
    const conv = await queryOne<any>('SELECT context FROM conversations WHERE id = $1', [convId])
    contextData = conv?.context ?? {}
    // Atualiza timestamp
    await query('UPDATE conversations SET last_message_at = NOW() WHERE id = $1', [convId])
  }

  // 3. Busca histórico da conversa (últimas 20 mensagens)
  const history = await query<any>(
    `SELECT role, content FROM messages
     WHERE conversation_id = $1
     ORDER BY sent_at DESC LIMIT 20`,
    [convId]
  )
  const historyReversed = history.reverse()
  const isFirstMessage = historyReversed.length === 0

  // Remove a greeting do histórico passado à IA — ela foi enviada pelo bypass,
  // não precisa aparecer para o modelo (evita que ele a copie como padrão de resposta)
  const greetingText = assistant.greeting_message?.trim() || null
  const historyForAI = greetingText
    ? historyReversed.filter((m: any) => !(m.role === 'assistant' && m.content.trim() === greetingText))
    : historyReversed

  // 4. Salva a mensagem do usuário
  await query(
    'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
    [convId, 'user', message]
  )

  // ── Atalho: greeting_message configurada na primeira mensagem ──
  if (isFirstMessage && assistant.greeting_message?.trim()) {
    const greeting = assistant.greeting_message.trim()
    await query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [convId, 'assistant', greeting]
    )
    // Evento: primeiro contato de um novo lead
    fireWebhookEvent(nutritionist_id, 'first_contact', {
      client_phone,
      conversation_id: convId,
      data: { message, instance_name: null },
    }).catch(() => {})
    return { text: greeting, action: null, raw: true }
  }

  // 5. Busca próximos horários disponíveis (varre até 14 dias, pula feriados)
  let availableSlots: any[] = []
  try {
    availableSlots = await getNextAvailableSlots(nutritionist_id)
  } catch (slotsErr) {
    console.error('[AI:slots] Erro ao buscar horários disponíveis:', slotsErr)
    // Continua sem slots — IA vai dizer que vai verificar a agenda
  }

  // 5b. Busca serviços estruturados do consultório (com fallback defensivo)
  let services: any[] = []
  try {
    services = await query<any>(
      `SELECT name, category,
              COALESCE(modality, 'presencial') AS modality,
              price, description
       FROM services
       WHERE nutritionist_id = $1 AND is_active = true
       ORDER BY sort_order, created_at`,
      [nutritionist_id]
    )
  } catch {
    // Fallback: busca sem a coluna modality (coluna pode não existir ainda)
    try {
      const rows = await query<any>(
        `SELECT name, category, price, description FROM services
         WHERE nutritionist_id = $1 AND is_active = true ORDER BY sort_order, created_at`,
        [nutritionist_id]
      )
      services = rows.map((s: any) => ({ ...s, modality: 'presencial' }))
    } catch (err2) {
      console.error('[AI] Erro ao buscar serviços (fallback também falhou):', err2)
    }
  }

  // 5c. Busca notas de treinamento globais (cérebro universal)
  const trainingNotes = await query<any>(
    `SELECT category, content FROM ai_training_notes WHERE is_active = true ORDER BY created_at ASC`,
    []
  )

  // 6. Resolve mídia dos planos (JSONB) — precisa estar em processMessage para o retorno
  const plansMediaCfg = assistant.plans_media ?? {}
  const mediaGeral      = plansMediaCfg.geral?.enabled      && plansMediaCfg.geral?.path      ? plansMediaCfg.geral      : null
  const mediaOnline     = plansMediaCfg.online?.enabled     && plansMediaCfg.online?.path     ? plansMediaCfg.online     : null
  const mediaPresencial = plansMediaCfg.presencial?.enabled && plansMediaCfg.presencial?.path ? plansMediaCfg.presencial : null
  const mediaLegacy     = assistant.plans_media_enabled && assistant.plans_media_path ? {
    path: assistant.plans_media_path, type: assistant.plans_media_type || 'image',
    name: assistant.plans_media_original_name || 'planos'
  } : null
  const hasAnyMedia = !!(mediaGeral || mediaOnline || mediaPresencial || mediaLegacy)

  // 7. Monta o system prompt personalizado
  const systemPrompt = buildSystemPrompt({
    assistant,
    nutritionist,
    availableSlots,
    clientPhone: client_phone,
    contextData,
    isFirstMessage,
    trainingNotes,
    services,
    hasAnyMedia,
  })

  // 7. Chama a IA
  console.log(`[AI:call] Chamando IA para nutri=${nutritionist_id} conv=${convId} hist=${historyForAI.length}msgs`)
  const responseText = await callAI(
    systemPrompt,
    historyForAI.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    message
  )
  console.log(`[AI:call] Resposta recebida (${responseText.length} chars)`)

  if (!responseText?.trim()) {
    throw new Error('[AI] Resposta vazia retornada pelo provider')
  }

  // 8. Salva a resposta da assistente
  await query(
    'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
    [convId, 'assistant', responseText]
  )

  // 8b. Atualiza contextData com informações extraídas da conversa
  // (nome do cliente e objetivo — persistidos no JSONB para não perder contexto)
  try {
    const updatedCtx = { ...contextData }
    if (!updatedCtx.goal) {
      // Tenta extrair objetivo da mensagem atual (palavras-chave comuns)
      const goalKeywords = ['perder peso', 'emagrecer', 'ganho de massa', 'massa muscular', 'definição',
        'saúde', 'nutrição', 'dieta', 'hipertrofia', 'emagrecimento', 'alimentação', 'gestação',
        'grávida', 'diabetes', 'pressão', 'colesterol', 'vegetariano', 'vegano']
      const msgLower = message.toLowerCase()
      const found = goalKeywords.find(k => msgLower.includes(k))
      if (found) updatedCtx.goal = found
    }
    if (Object.keys(updatedCtx).length > Object.keys(contextData).length) {
      await query('UPDATE conversations SET context = $1 WHERE id = $2', [JSON.stringify(updatedCtx), convId])
    }
  } catch { /* não crítico */ }

  // 9. Detecta intenção de agendamento na resposta
  const bookingResult = await detectAndCreateAppointment({
    responseText,
    message,
    nutritionist_id,
    client_phone,
    availableSlots,
    convId,
    assistantName:       assistant?.name || 'assistente',
    conversationContext: contextData,
  })
  const action = bookingResult?.action ?? null
  const bookingConfirmationMessage = bookingResult?.bookingConfirmationMessage

  // 10. Verifica se deve enviar mídia dos planos e/ou mensagem configurada
  // Detecta ETAPA 3: IA acabou de apresentar os planos
  // Múltiplos markers para não depender de frase exata
  const ETAPA3_MARKERS = [
    'chamou mais atenção',
    'qual plano',
    'vou te mostrar',
    'as opções agora',
    'os detalhes agora',
    'a imagem com',
    '[planos]',
  ]
  const responseTextLower = responseText.toLowerCase()
  const isEtapa3 = ETAPA3_MARKERS.some(m => responseTextLower.includes(m))

  // Evita reenvio: verifica se planos já foram apresentados no histórico
  const alreadyPresentedPlans = historyForAI.some((m: any) =>
    m.role === 'assistant' && ETAPA3_MARKERS.some(marker => m.content.toLowerCase().includes(marker))
  )

  let planMediaUrl: string | undefined
  let planMediaType: 'image' | 'pdf' | undefined
  let planMediaName: string | undefined
  let planMessageText: string | undefined

  if (isEtapa3 && !alreadyPresentedPlans) {
    // Evento n8n: momento de apresentar planos
    buildPlansPayload(nutritionist_id, client_phone, convId).then(p =>
      fireWebhookEvent(nutritionist_id, 'plans_stage_reached', p)
    ).catch(() => {})

    // Detecta modalidade pelo histórico recente + mensagem atual
    const recentCtx = [...historyForAI.slice(-6).map((m: any) => m.content), message]
      .join(' ').toLowerCase()
    const isPresencialCtx = recentCtx.includes('presencial')
    const isOnlineCtx     = recentCtx.includes('online')

    // ── Mídia dos planos ───────────────────────────────────────
    if (hasAnyMedia) {
      const chosen = isPresencialCtx && mediaPresencial ? mediaPresencial
        : isOnlineCtx && mediaOnline ? mediaOnline
        : mediaGeral ?? mediaPresencial ?? mediaOnline ?? mediaLegacy

      if (chosen?.path) {
        const apiBase = process.env.API_PUBLIC_URL || ''
        const parts   = chosen.path.replace(/\\/g, '/').split('uploads/')
        planMediaUrl  = parts.length > 1 ? `${apiBase}/uploads/${parts[1]}` : undefined
        planMediaType = (chosen.type as 'image' | 'pdf') || 'image'
        planMediaName = chosen.name || 'planos.pdf'
      }
    }

    // ── Mensagem configurada (enviada após mídia ou sozinha) ───
    // Nunca passa pela IA — enviada como mensagem separada no webhook
    const customMsgOnline2     = assistant.services_message_online_enabled     && assistant.services_message_online?.trim()     ? assistant.services_message_online.trim()     : null
    const customMsgPresencial2 = assistant.services_message_presencial_enabled && assistant.services_message_presencial?.trim() ? assistant.services_message_presencial.trim() : null
    const customMsgGeral2      = assistant.services_message_enabled            && assistant.services_message?.trim()            ? assistant.services_message.trim()            : null

    if (isPresencialCtx && customMsgPresencial2) planMessageText = customMsgPresencial2
    else if (isOnlineCtx && customMsgOnline2)    planMessageText = customMsgOnline2
    else if (customMsgGeral2)                    planMessageText = customMsgGeral2
    else if (customMsgPresencial2)               planMessageText = customMsgPresencial2
    else if (customMsgOnline2)                   planMessageText = customMsgOnline2
  }

  return { text: responseText, action, planMediaUrl, planMediaType, planMediaName, planMessageText, bookingConfirmationMessage }
}

// ── Monta o system prompt da assistente ───────────────────
function buildSystemPrompt({ assistant, nutritionist, availableSlots, clientPhone, contextData, isFirstMessage, trainingNotes, services, hasAnyMedia }: any): string {
  const aiName    = assistant.name
  const nutriName = assistant.nutri_display_name?.trim() || nutritionist.name
  const tone      = assistant.tone || 'acolhedor'

  // ── Helpers ─────────────────────────────────────────────
  function formatServices(list: any[]): string | null {
    if (!list || list.length === 0) return null
    return list.map((s: any) => {
      let line = `- ${s.name}`
      if (s.price)       line += `: ${s.price}`
      if (s.description) line += ` (${s.description})`
      return line
    }).join('\n')
  }

  const servicesOnline     = (services || []).filter((s: any) => s.modality === 'online' || s.modality === 'ambos')
  const servicesPresencial = (services || []).filter((s: any) => s.modality === 'presencial' || s.modality === 'ambos')
  const plansOnlineText     = formatServices(servicesOnline)
  const plansPresencialText = formatServices(servicesPresencial)
  const plansAllText        = formatServices(services || []) || assistant.service_plans?.trim() || null

  const specialtiesText = assistant.specialties || nutritionist.specialty || null
  const modalities      = assistant.consultation_modalities || 'online'
  const isPresencialOnly = modalities === 'presencial'
  const isOnlineOnly     = !modalities.includes('presencial')
  const modalityLabel    = isPresencialOnly ? 'presencial' : isOnlineOnly ? 'online' : 'presencial ou online'

  // Emoji
  const emojiLevel: number = assistant.emoji_level ?? 3
  const emojiRule = emojiLevel === 1 ? 'Sem emojis.'
    : emojiLevel === 2 ? 'Emojis raros — máx 1 a cada 3 mensagens.'
    : emojiLevel === 3 ? 'Máx 1 emoji por mensagem.'
    : emojiLevel === 4 ? '1-2 emojis por mensagem.'
    : 'Emojis livres.'

  // Tom
  const toneGuide = tone === 'formal'
    ? 'Tom profissional. Direto, sem intimidades.'
    : tone === 'descontraido'
    ? 'Tom leve, como se fossem amigas. Pode usar "haha", "boa" etc com moderação.'
    : 'Tom acolhedor e próximo — quente mas sem exagero.'

  // Mensagens customizadas de planos
  function resolveVars(msg: string): string {
    return msg
      .replace(/\{planos_online\}/gi, plansOnlineText || '')
      .replace(/\{planos_presencial\}/gi, plansPresencialText || '')
      .replace(/\{planos\}/gi, plansAllText || '')
      .replace(/\{nutri\}/gi, nutriName)
  }

  const customMsgOnline     = (assistant.services_message_online_enabled     && assistant.services_message_online?.trim())
    ? resolveVars(assistant.services_message_online.trim()) : null
  const customMsgPresencial = (assistant.services_message_presencial_enabled && assistant.services_message_presencial?.trim())
    ? resolveVars(assistant.services_message_presencial.trim()) : null
  const customMsgGeral      = (assistant.services_message_enabled            && assistant.services_message?.trim())
    ? resolveVars(assistant.services_message.trim()) : null

  const hasAnyCustomMsg = !!(customMsgOnline || customMsgPresencial || customMsgGeral)

  // Planos para o prompt (só quando não há mídia nem msg automática)
  const plansForPrompt = (hasAnyMedia || hasAnyCustomMsg) ? null : plansAllText

  // Funções
  const funcAgendamento = assistant.func_agendamento !== false
  const funcTriagem     = assistant.func_triagem     !== false

  // Slots
  const morningSlots   = availableSlots.filter((s: any) => { const m = s.label.match(/(\d{2}):\d{2}$/); return m && parseInt(m[1]) < 12 })
  const afternoonSlots = availableSlots.filter((s: any) => { const m = s.label.match(/(\d{2}):\d{2}$/); return m && parseInt(m[1]) >= 12 })
  const morningSlotsText    = morningSlots.slice(0, 5).map((s: any) => s.label).join(' | ')
  const afternoonSlotsText  = afternoonSlots.slice(0, 5).map((s: any) => s.label).join(' | ')
  const hasSlotsConfigured  = morningSlots.length > 0 || afternoonSlots.length > 0

  // Treinamento global
  const trainingSection = (trainingNotes && trainingNotes.length > 0)
    ? `\nCORREÇÕES DE TREINAMENTO (aplique sempre):\n${trainingNotes.map((n: any) => `- ${n.content}`).join('\n')}\n`
    : ''

  // Saudação
  const greetingMsg = assistant.greeting_message?.trim() || null
  const firstMsgInstruction = isFirstMessage && !greetingMsg
    ? `PRIMEIRA MENSAGEM: apresente-se brevemente como ${aiName} da equipe de ${nutriName} e pergunte o objetivo da pessoa em 1 frase simples.`
    : ''

  // Contexto do cliente
  const clientCtx = [
    contextData.client_name ? `Nome: ${contextData.client_name}` : '',
    contextData.goal        ? `Objetivo mencionado: ${contextData.goal}` : '',
  ].filter(Boolean).join(' | ')

  // ── Instrução de apresentação dos planos ────────────────
  const plansPresentation = hasAnyMedia
    ? `Uma imagem com os planos será enviada automaticamente após sua mensagem. Escreva apenas 1 frase curta de apresentação (ex: "Deixa eu te mostrar as opções 👇"). NÃO liste planos nem preços. Termine com: "Me fala qual chamou mais atenção e eu já abro a agenda pra você."`
    : hasAnyCustomMsg
    ? `Os detalhes dos planos chegam automaticamente na próxima mensagem. Escreva apenas 1 frase de introdução (ex: "Olha as opções que temos 👇"). Não descreva valores. Termine com: "Me fala qual chamou mais atenção e eu já abro a agenda pra você."`
    : plansForPrompt
    ? `Apresente os planos em texto corrido, 1 frase por plano, sem asterisco ou negrito:\n${plansForPrompt}\nTermine com: "Me fala qual chamou mais atenção e eu já abro a agenda pra você."`
    : `Diga que ${nutriName} apresenta os detalhes na consulta e convide para agendar.`

  // ── Agendamento ─────────────────────────────────────────
  const schedulingFlow = funcAgendamento
    ? `AGENDAMENTO — colete nesta ordem (1 pergunta por vez):
1. Plano escolhido → pergunte preferência de turno (manhã ou tarde)
2. Turno → mostre os horários: ${hasSlotsConfigured ? `Manhã: ${morningSlotsText || '—'} | Tarde: ${afternoonSlotsText || '—'}` : 'diga que vai verificar com ' + nutriName}
3. Horário escolhido → pergunte nome completo
4. Nome → confirme com EXATAMENTE "✅ Consulta confirmada para DD/MM/AAAA às HH:MM" (nada mais)
${hasSlotsConfigured ? 'NUNCA invente horários fora da lista acima.' : ''}`
    : `Agendamento desabilitado — diga que ${nutriName} entrará em contato para confirmar o horário.`

  return `Você é ${aiName}, recepcionista do consultório de ${nutriName}${specialtiesText ? ` (${specialtiesText})` : ''}. Atende por WhatsApp. Modalidade: ${modalityLabel}.

QUEM VOCÊ É:
Você é uma recepcionista humana, experiente, que gosta do que faz. Sua função é receber a pessoa com calor, entender rapidamente o que ela busca e marcar a consulta. Você não é nutricionista — não dá conselhos alimentares. Você é a pessoa que abre a porta do consultório.

${toneGuide} ${emojiRule} Escreva como se fosse uma mensagem de WhatsApp real: frases curtas, sem listas, sem asterisco, sem markdown. Máximo 2 frases por mensagem. 1 pergunta por vez. Nunca use "Claro!", "Com certeza!", "Certamente" — soa robótico.
${assistant.pdf_content ? `\nSOBRE O CONSULTÓRIO:\n${assistant.pdf_content}\n` : ''}${trainingSection}${firstMsgInstruction ? `\n${firstMsgInstruction}\n` : ''}
FLUXO DA CONVERSA:

1. ENTENDER O OBJETIVO
${funcTriagem
  ? `Pergunte o objetivo da pessoa em 1 frase direta. Quando ela responder, valide com as palavras dela (ex: "Perda de peso é exatamente o que trabalhamos") e faça só mais 1 pergunta de contexto — a mais importante pra mostrar que você entendeu a situação dela.`
  : `Vá direto para a apresentação dos planos sem perguntas de triagem.`}

2. CONECTAR COM O CONSULTÓRIO
Com 1-2 frases, mostre como ${nutriName} resolve exatamente o que ela descreveu. Use o que estiver em "SOBRE O CONSULTÓRIO". Não invente — se não tiver info, diga apenas "é exatamente nisso que o ${nutriName} trabalha".

3. APRESENTAR OS PLANOS
${plansPresentation}

4. APÓS ESCOLHA DO PLANO
${schedulingFlow}

OBJEÇÕES (responda de forma natural, sem script óbvio):
- "Tá caro" / "não tenho esse valor": Ancore no valor, não no preço. Ex: "Faz sentido olhar assim. Uma coisa que vale considerar é que é o tipo de investimento que você faz uma vez e muda o resultado de vez. Qual plano fez mais sentido pra você?" — nunca prometa desconto.
- "Vou pensar" / "me dá um tempo": Crie leveza + urgência suave. Ex: "Tranquilo! Posso deixar um horário reservado enquanto você decide — assim você não perde a vaga. Faz sentido?"
- "Já tentei dieta antes e não funcionou": Valide e diferencione. Ex: "Entendo, a maioria das pessoas que chegam até nós passaram pela mesma coisa. O acompanhamento do ${nutriName} é diferente justamente por isso — o que chamou mais atenção nos planos?"
- Pergunta técnica de nutrição: "Isso é uma ótima pergunta pra levar direto pro ${nutriName} na consulta — ele vai conseguir te responder com muito mais precisão do que eu."
- Condição de saúde sensível (diabetes, transtorno alimentar, etc): Acolha com cuidado. "Que bom que você está buscando apoio nisso. O ${nutriName} tem experiência com esse perfil — uma consulta já clareia muito o caminho."

NUNCA: inventar horários | confirmar consulta sem data e hora reais | pedir telefone | dar conselho alimentar | prometer resultado | repetir saudação.${clientCtx ? `\n\nCONTEXTO DO CLIENTE: ${clientCtx}` : ''}
`
}

// ── Detecta e cria agendamento automaticamente ─────────────
async function detectAndCreateAppointment({
  responseText, message, nutritionist_id, client_phone, availableSlots, convId, assistantName, conversationContext
}: any): Promise<{ action: 'appointment_created'; bookingConfirmationMessage?: string } | null> {
  // Detecta confirmação de agendamento na resposta da IA
  const confirmationPattern = /✅ Consulta confirmada para (.+) às (\d{2}:\d{2})/i
  const match = responseText.match(confirmationPattern)

  if (!match) return null

  try {
    // Tenta extrair data e hora da confirmação
    const dateStr = match[1].trim() // ex: "21/05/2026"
    const timeStr = match[2] // ex: "14:00"

    // Converte para ISO datetime
    const [day, month, year] = dateStr.split('/').map(Number)
    const [hour, min] = timeStr.split(':').map(Number)
    // Cria o horário em BRT (UTC-3) — slots são sempre no fuso de Brasília
    const pad = (n: number) => String(n).padStart(2, '0')
    const scheduledAt = new Date(
      `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(min)}:00-03:00`
    ).toISOString()

    // Busca ou cria cliente
    let client = await queryOne<any>(
      'SELECT id, name FROM clients WHERE nutritionist_id = $1 AND phone = $2',
      [nutritionist_id, client_phone]
    )

    if (!client) {
      const [newClient] = await query(
        'INSERT INTO clients (nutritionist_id, phone, name) VALUES ($1, $2, $3) RETURNING id, name',
        [nutritionist_id, client_phone, 'Cliente']
      )
      client = newClient
    }

    // Detecta modalidade e cidade do histórico da conversa
    const ctxText = (conversationContext?.goal || '') + ' ' + message
    const recentText = responseText.toLowerCase()
    const isPresencial = recentText.includes('presencial') || ctxText.toLowerCase().includes('presencial')
    const modality = isPresencial ? 'presencial' : 'online'

    // Tenta detectar cidade mencionada no contexto
    const cityMatch = ctxText.match(/(?:cidad[ea]|em|de)\s+([A-ZÁÉÍÓÚÃÕÇÜ][a-záéíóúãõçü]+(?:\s+[A-ZÁÉÍÓÚÃÕÇÜ][a-záéíóúãõçü]+)?)/i)
    const city = cityMatch?.[1] || null

    // Cria o agendamento
    const [newAppt] = await query<any>(
      `INSERT INTO appointments (nutritionist_id, client_id, client_phone, scheduled_at, modality, city, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'assistant', 'scheduled') RETURNING id`,
      [nutritionist_id, client.id, client_phone, scheduledAt, modality, city]
    )
    const newAppointmentId: string = newAppt?.id ?? null

    // Atualiza conversa
    await query(
      `UPDATE conversations SET status = 'resolved' WHERE id = $1`,
      [convId]
    )

    // ── Mensagem de confirmação com local/preço/instruções ────────
    let bookingConfirmationMessage: string | undefined
    try {
      let locSql = `SELECT name, address, city, price, payment_info, deposit_required, deposit_amount, confirmation_message
                    FROM locations WHERE nutritionist_id = $1 AND is_active = true`
      const locParams: any[] = [nutritionist_id]
      if (modality === 'presencial') {
        locSql += ` AND (modality = 'presencial' OR modality = 'ambos')`
      } else {
        locSql += ` AND (modality = 'online' OR modality = 'ambos')`
      }
      if (city) { locParams.push(`%${city}%`); locSql += ` AND city ILIKE $${locParams.length}` }
      locSql += ' ORDER BY sort_order LIMIT 1'
      const loc = await queryOne<any>(locSql, locParams)

      if (loc) {
        const parts: string[] = []
        if (loc.confirmation_message?.trim()) {
          parts.push(loc.confirmation_message.trim())
        }
        if (loc.address?.trim()) {
          parts.push(`📍 Endereço: ${loc.address.trim()}`)
        }
        if (loc.price?.trim()) {
          parts.push(`💰 Valor: ${loc.price.trim()}`)
        }
        if (loc.deposit_required && loc.deposit_amount?.trim()) {
          parts.push(`⚡ Sinal para confirmar: ${loc.deposit_amount.trim()}`)
        }
        if (loc.payment_info?.trim()) {
          parts.push(loc.payment_info.trim())
        }
        if (parts.length > 0) {
          bookingConfirmationMessage = parts.join('\n')
        }
      }
    } catch { /* não crítico */ }

    // ── Cria evento no Google Calendar (se conectado) ──────────
    createCalendarEvent(nutritionist_id, {
      client_name:   client.name || 'Cliente',
      client_phone,
      scheduled_at:  scheduledAt,
      duration:      50,
      modality,
    }).catch(err => console.error('[GCal] Falha silenciosa:', err))

    // ── Notifica a nutricionista via WhatsApp pessoal ──────────
    try {
      const nutritionistData = await queryOne<any>(
        'SELECT name, phone FROM nutritionists WHERE id = $1',
        [nutritionist_id]
      )

      if (nutritionistData?.phone) {
        const clientLabel = client.name && client.name !== 'Cliente'
          ? client.name
          : client_phone

        // Formata data/hora em BRT legível
        const apptDate = new Date(scheduledAt)
        const formatted = apptDate.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })

        const notifMsg =
          `🗓️ *Nova consulta agendada pela ${assistantName}!*\n\n` +
          `👤 Cliente: ${clientLabel}\n` +
          `📅 ${formatted}\n\n` +
          `Veja os detalhes na sua agenda 👆`

        await sendMessageForNutri(nutritionist_id, nutritionistData.phone, notifMsg)
      }
    } catch (notifErr) {
      // Falha na notificação não deve cancelar o agendamento
      console.error('[notif] Erro ao notificar nutricionista:', notifErr)
    }
    // ─────────────────────────────────────────────────────────

    // Evento n8n: consulta agendada
    if (newAppointmentId) {
      buildAppointmentPayload(nutritionist_id, client_phone, convId, newAppointmentId).then(p =>
        fireWebhookEvent(nutritionist_id, 'appointment_booked', p)
      ).catch(() => {})
    }

    return { action: 'appointment_created', bookingConfirmationMessage }
  } catch (err) {
    console.error('Erro ao criar agendamento automático:', err)
    return null
  }
}
