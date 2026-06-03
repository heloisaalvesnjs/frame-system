import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { query, queryOne } from '../db'
import { getNextAvailableSlots } from './appointment.service'
import { sendMessageForNutri } from './whatsapp.service'
import { createCalendarEvent } from './google-calendar.service'

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
  raw?: boolean       // true = mensagem configurada pelo nutri, enviar sem split
  planMediaUrl?: string   // URL da mídia dos planos (imagem ou PDF) para envio automático
  planMediaType?: 'image' | 'pdf'
  planMediaName?: string
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
     ORDER BY sent_at DESC LIMIT 10`,
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
  // Envia o texto EXATAMENTE como escrito, sem passar pela IA
  // raw: true → webhook envia por parágrafo, sem split de sentenças
  if (isFirstMessage && assistant.greeting_message?.trim()) {
    const greeting = assistant.greeting_message.trim()
    await query(
      'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [convId, 'assistant', greeting]
    )
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

  // 9. Detecta intenção de agendamento na resposta
  const action = await detectAndCreateAppointment({
    responseText,
    message,
    nutritionist_id,
    client_phone,
    availableSlots,
    convId,
    assistantName: assistant?.name || 'assistente'
  })

  // 10. Verifica se deve enviar mídia dos planos
  // Detecta ETAPA 3 pela resposta atual
  const isEtapa3 =
    responseText.toLowerCase().includes('manhã ou tarde') ||
    responseText.toLowerCase().includes('manha ou tarde')

  // Evita reenvio: não envia se planos já foram apresentados no histórico
  const alreadyPresentedPlans = historyForAI.some((m: any) =>
    m.role === 'assistant' && (
      m.content.toLowerCase().includes('manhã ou tarde') ||
      m.content.toLowerCase().includes('manha ou tarde')
    )
  )

  let planMediaUrl: string | undefined
  let planMediaType: 'image' | 'pdf' | undefined
  let planMediaName: string | undefined

  if (isEtapa3 && hasAnyMedia && !alreadyPresentedPlans) {
    // Detecta modalidade pelo histórico recente
    const recentCtx = historyForAI.slice(-6).map((m: any) => m.content.toLowerCase()).join(' ')
    const isPresencialCtx = recentCtx.includes('presencial')
    const isOnlineCtx     = recentCtx.includes('online')

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

  return { text: responseText, action, planMediaUrl, planMediaType, planMediaName }
}

// ── Monta o system prompt da assistente ───────────────────
function buildSystemPrompt({ assistant, nutritionist, availableSlots, clientPhone, contextData, isFirstMessage, trainingNotes, services, hasAnyMedia }: any): string {
  const aiName = assistant.name
  const nutriName = assistant.nutri_display_name?.trim() || nutritionist.name
  const tone = assistant.tone || 'acolhedor'
  // Serviços estruturados têm prioridade sobre service_plans (texto livre)
  function formatServices(list: any[]): string | null {
    if (!list || list.length === 0) return null
    return list.map((s: any) => {
      let line = `- ${s.name}`
      if (s.category) line += ` [${s.category}]`
      if (s.price)    line += `: ${s.price}`
      if (s.description) line += ` — ${s.description}`
      return line
    }).join('\n')
  }
  const servicesOnline     = (services || []).filter((s: any) => s.modality === 'online' || s.modality === 'ambos')
  const servicesPresencial = (services || []).filter((s: any) => s.modality === 'presencial' || s.modality === 'ambos')
  const plansOnlineText     = formatServices(servicesOnline)
  const plansPresencialText = formatServices(servicesPresencial)
  const plansAllText        = formatServices(services || []) || assistant.service_plans?.trim() || null
  const plansText = plansAllText
  const specialtiesText = assistant.specialties || nutritionist.specialty || null
  const modalities = assistant.consultation_modalities || 'online'
  const modalityLabel = modalities === 'presencial' ? 'presencial'
    : modalities.includes('presencial') ? 'presencial ou online'
    : 'online'

  const toneDesc = tone === 'formal' ? 'profissional e respeitoso'
    : tone === 'descontraido' ? 'leve e próximo, como uma amiga'
    : 'acolhedor e próximo'

  const greetingMsg = assistant.greeting_message?.trim() || null

  // Emoji
  const emojiLevel: number = assistant.emoji_level ?? 3
  const emojiRule = emojiLevel === 1 ? 'NUNCA use emojis. Nenhum em nenhuma mensagem.'
    : emojiLevel === 2 ? 'Use emojis raramente — no máximo 1 a cada 3 ou 4 mensagens.'
    : emojiLevel === 3 ? 'Máximo 1 emoji por mensagem, apenas quando agregar valor.'
    : emojiLevel === 4 ? 'Use emojis com frequência, 1-2 por mensagem quando adequado.'
    : 'Use emojis livremente, podem aparecer em quase todas as mensagens.'

  // ── Mensagens personalizadas de apresentação dos serviços ────────
  function resolveVars(msg: string): string {
    return msg
      .replace(/\{planos_online\}/gi, plansOnlineText || '(sem planos online cadastrados)')
      .replace(/\{planos_presencial\}/gi, plansPresencialText || '(sem planos presenciais cadastrados)')
      .replace(/\{planos\}/gi, plansText || '(sem planos cadastrados)')
      .replace(/\{nutri\}/gi, nutriName)
  }

  const customMsgOnline     = (assistant.services_message_online_enabled     && assistant.services_message_online?.trim())
    ? resolveVars(assistant.services_message_online.trim()) : null
  const customMsgPresencial = (assistant.services_message_presencial_enabled && assistant.services_message_presencial?.trim())
    ? resolveVars(assistant.services_message_presencial.trim()) : null
  const customMsgGeral      = (assistant.services_message_enabled            && assistant.services_message?.trim())
    ? resolveVars(assistant.services_message.trim()) : null

  const hasAnyCustomMsg = customMsgOnline || customMsgPresencial || customMsgGeral
  const customServicesMsg = customMsgGeral

  // Funções habilitadas
  const funcProspeccao  = assistant.func_prospeccao  !== false
  const funcTriagem     = assistant.func_triagem     !== false
  const funcAgendamento = assistant.func_agendamento !== false

  const funcoesSection = [
    !funcProspeccao  && 'PROSPECÇÃO DESABILITADA: não faça follow-up ativo nem tente recuperar leads silenciosos.',
    !funcTriagem     && 'TRIAGEM DESABILITADA: não faça perguntas de qualificação sobre objetivos ou condições de saúde. Vá direto à apresentação do serviço.',
    !funcAgendamento && 'AGENDAMENTO DESABILITADO: não ofereça nem confirme agendamentos. Informe que o nutricionista entrará em contato.',
  ].filter(Boolean).join('\n')

  // Agrupa slots por turno (manhã < 12h / tarde >= 12h)
  const morningSlots = availableSlots.filter((s: any) => {
    const m = s.label.match(/(\d{2}):(\d{2})$/)
    return m && parseInt(m[1]) < 12
  })
  const afternoonSlots = availableSlots.filter((s: any) => {
    const m = s.label.match(/(\d{2}):(\d{2})$/)
    return m && parseInt(m[1]) >= 12
  })
  const morningSlotsText = morningSlots.slice(0, 5).map((s: any) => `• ${s.label}`).join('\n')
  const afternoonSlotsText = afternoonSlots.slice(0, 5).map((s: any) => `• ${s.label}`).join('\n')
  const hasSlotsConfigured = morningSlots.length > 0 || afternoonSlots.length > 0

  // Seção de treinamento (notas globais do cérebro universal)
  const trainingSection = (trainingNotes && trainingNotes.length > 0)
    ? `\n==============================\nAPRENDIZADOS DE TREINAMENTO\n==============================\nCom base em revisões anteriores, aplique sempre estas correções:\n\n${
        trainingNotes.map((n: any) => `[${n.category.toUpperCase()}] ${n.content}`).join('\n')
      }\n`
    : ''

  // ── Primeira mensagem (apenas quando isFirstMessage=true e sem bypass de greeting) ──
  const firstMsgInstruction = isFirstMessage && !greetingMsg
    ? `AGORA (1ª mensagem): "Bom dia/tarde/noite! Me chamo ${aiName}, faço parte da equipe de ${nutriName} e será uma honra ter você no time de pacientes 😊 Qual seu objetivo: [opção A] ou [opção B]?" — use EXATAMENTE 2 opções separadas por "ou", sem lista.`
    : !isFirstMessage
    ? 'Saudação já enviada. Responda ao que o cliente disse seguindo o fluxo abaixo.'
    : ''

  return `${aiName}, recepcionista virtual de ${nutriName} (WhatsApp).${specialtiesText ? ` Área: ${specialtiesText}.` : ''} Modalidade: ${modalityLabel}. Tom: ${toneDesc}. Age como humana experiente, nunca como chatbot.
${plansText ? `\nSERVIÇOS:\n${plansText}\n` : ''}${assistant.pdf_content ? `\nINSTRUÇÕES DO CONSULTÓRIO:\n${assistant.pdf_content}\n` : ''}${trainingSection}${firstMsgInstruction ? `\n${firstMsgInstruction}\n` : ''}
FLUXO CONSULTIVO — siga SEMPRE nesta ordem, não pule etapas:

ETAPA 1 — OBJETIVO RECEBIDO:
Valide com as palavras exatas do cliente. Ex: se disse "ganho de massa", diga "Ganho de massa e definição é exatamente o que trabalhamos 💪"
Depois faça UMA pergunta de aprofundamento — escolha a mais relevante:
- "Qual sua maior dificuldade com isso hoje?"
- "Há quanto tempo você está buscando isso?"
- "O que você já tentou antes?"

ETAPA 2 — CLIENTE COMPARTILHOU A SITUAÇÃO:
(1) Mostre empatia genuína com as palavras dele. Ex: "Entendo, essa é exatamente a situação que o David trabalha."
(2) Explique brevemente COMO o consultório resolve isso — use o que estiver em INSTRUÇÕES DO CONSULTÓRIO.
(3) ${plansText ? `Pergunte a modalidade SE houver planos presenciais E online: "Você prefere atendimento presencial ou online?"` : `Avance para apresentar como funciona o agendamento.`}

ETAPA 3 — PLANOS:
Após definida a modalidade (ou se só tiver uma):
${hasAnyMedia && hasAnyCustomMsg ? `
Uma imagem com os detalhes visuais dos planos será enviada automaticamente APÓS sua mensagem de texto.
IMPORTANTE: use EXATAMENTE a mensagem de texto configurada abaixo (ela será seguida pela imagem):${
  customMsgPresencial ? `\n\nSE o cliente escolheu PRESENCIAL:\n${customMsgPresencial}` : ''
}${
  customMsgOnline ? `\n\nSE o cliente escolheu ONLINE:\n${customMsgOnline}` : ''
}${
  customMsgGeral && !customMsgPresencial && !customMsgOnline ? `\n\n${customMsgGeral}` : ''
}${
  customMsgGeral && (customMsgPresencial || customMsgOnline) ? `\n\nSE não souber a modalidade:\n${customMsgGeral}` : ''
}
Após a mensagem, pergunte: "Prefere manhã ou tarde?"
` : hasAnyMedia ? `
Uma imagem com todos os detalhes dos planos será enviada automaticamente após sua mensagem.
Escreva APENAS 1 frase curta de apresentação (ex: "Perfeito! Vou te mostrar as opções de acompanhamento presencial agora 👇").
NÃO liste planos, preços ou detalhes em texto — a imagem mostrará tudo.
Pergunte: "Prefere manhã ou tarde?"
` : hasAnyCustomMsg ? `
IMPORTANTE: use EXATAMENTE a mensagem abaixo. Não acrescente nem remova nada.${
  customMsgPresencial ? `\n\nSE o cliente escolheu PRESENCIAL:\n${customMsgPresencial}` : ''
}${
  customMsgOnline ? `\n\nSE o cliente escolheu ONLINE:\n${customMsgOnline}` : ''
}${
  customMsgGeral && !customMsgPresencial && !customMsgOnline ? `\n\n${customMsgGeral}` : ''
}${
  customMsgGeral && (customMsgPresencial || customMsgOnline) ? `\n\nSE não souber a modalidade:\n${customMsgGeral}` : ''
}
Após a mensagem, pergunte: "Prefere manhã ou tarde?"
` : `Apresente em prosa corrida, 1 frase por plano, SEM asterisco, SEM negrito.
${plansText ? `Use apenas os planos da modalidade escolhida. Termine com: "Prefere manhã ou tarde?"` : `Informe que ${nutriName} apresenta os detalhes pessoalmente e pergunte: "Prefere manhã ou tarde?"`}`
}

AGENDAMENTO: mostre horários do turno escolhido → "Nome completo?" → confirme com EXATAMENTE "✅ Consulta confirmada para DD/MM/AAAA às HH:MM" e nada mais.
${hasSlotsConfigured
  ? `Manhã: ${morningSlotsText || '(indisponível)'} | Tarde: ${afternoonSlotsText || '(indisponível)'}
NUNCA invente horários fora desta lista.`
  : `Horários não configurados — diga: "Vou confirmar com ${nutriName} e te retorno."`}

REGRAS: máx 2 frases/35 palavras por msg. 1 pergunta por msg. Sem listas (•-*). Sem markdown/negrito/—. ${emojiRule} "você" não "senhor/a". Proibido: "Claro!""Com certeza!""certamente""definitivamente".
OBJEÇÕES → preço: ${plansText ? 'mostre SERVIÇOS + pergunte turno' : `"${nutriName} apresenta os valores pessoalmente. Posso ver um horário?"`} | pensando/hesitando: "Posso reservar um horário pra você confirmar depois — assim a vaga fica garantida. Manhã ou tarde?" | caro: "Entendo. Quer que eu te avise se abrir alguma condição especial?" | não funcionou antes: "Cada método é diferente. Uma consulta já resolve a dúvida. Manhã ou tarde?" | sumiu sem responder: "Oi! Ainda consigo ver um horário pra você com ${nutriName}. Prefere manhã ou tarde?" | ignorou horário oferecido: reofereça com urgência leve "Ainda tem ${hasSlotsConfigured ? 'horários disponíveis' : 'espaço na agenda'}. Posso reservar agora?"
SENSÍVEL (transtornos/doenças): valide com cuidado, direcione para ${nutriName}, nunca dê conselho médico.${funcoesSection ? `\n${funcoesSection}` : ''}
NUNCA: inventar horários | ✅ sem data real | pedir telefone | usar listas | 2 perguntas | conselho nutricional | prometer resultado | repetir saudação.${contextData.client_name ? ` | Cliente: ${contextData.client_name}` : ''}${contextData.goal ? ` | Objetivo: ${contextData.goal}` : ''}`
}

// ── Detecta e cria agendamento automaticamente ─────────────
async function detectAndCreateAppointment({
  responseText, message, nutritionist_id, client_phone, availableSlots, convId, assistantName
}: any): Promise<'appointment_created' | null> {
  // Detecta confirmação de agendamento na resposta da IA
  const confirmationPattern = /✅ Consulta confirmada para (.+) às (\d{2}:\d{2})/i
  const match = responseText.match(confirmationPattern)

  if (!match) return null

  try {
    // Tenta extrair data e hora da confirmação
    const dateStr = match[1] // ex: "21/05/2026"
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

    // Cria o agendamento
    await query(
      `INSERT INTO appointments (nutritionist_id, client_id, scheduled_at, modality, created_by, status)
       VALUES ($1, $2, $3, 'online', 'assistant', 'scheduled')`,
      [nutritionist_id, client.id, scheduledAt]
    )

    // Atualiza conversa
    await query(
      `UPDATE conversations SET status = 'resolved' WHERE id = $1`,
      [convId]
    )

    // ── Cria evento no Google Calendar (se conectado) ──────────
    createCalendarEvent(nutritionist_id, {
      client_name:   client.name || 'Cliente',
      client_phone,
      scheduled_at:  scheduledAt,
      duration:      50,
      modality:      'online',
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

    return 'appointment_created'
  } catch (err) {
    console.error('Erro ao criar agendamento automático:', err)
    return null
  }
}
