import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { query, queryOne } from '../db'
import { getNextAvailableSlots } from './appointment.service'
import { sendMessage } from './whatsapp.service'

// ── Providers ────────────────────────────────────────────────
// Ordem de tentativa: Groq (grátis/rápido) → Gemini Flash (grátis) → Claude (pago, último recurso)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })
const genai     = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const groq      = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })

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

async function callClaude(systemPrompt: string, messages: { role: 'user' | 'assistant', content: string }[], userMessage: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 350,
    system: systemPrompt,
    messages: [...messages, { role: 'user', content: userMessage }]
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}

async function callAI(systemPrompt: string, messages: { role: 'user' | 'assistant', content: string }[], userMessage: string): Promise<string> {
  // Groq → Gemini → Claude (pago apenas se os gratuitos falharem)
  const hasGemini = !!process.env.GEMINI_API_KEY
  const providers = [
    { name: 'groq',   fn: callGroq   },
    ...(hasGemini ? [{ name: 'gemini', fn: callGemini }] : []),
    { name: 'claude', fn: callClaude },
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

  // 4. Salva a mensagem do usuário
  await query(
    'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
    [convId, 'user', message]
  )

  // 5. Busca próximos horários disponíveis (varre até 14 dias, pula feriados)
  const availableSlots = await getNextAvailableSlots(nutritionist_id)

  // 5b. Busca notas de treinamento globais (cérebro universal)
  const trainingNotes = await query<any>(
    `SELECT category, content FROM ai_training_notes WHERE is_active = true ORDER BY created_at ASC`,
    []
  )

  // 6. Monta o system prompt personalizado
  const systemPrompt = buildSystemPrompt({
    assistant,
    nutritionist,
    availableSlots,
    clientPhone: client_phone,
    contextData,
    isFirstMessage,
    trainingNotes
  })

  // 7. Chama a IA (Claude ou Gemini conforme AI_PROVIDER)
  const responseText = await callAI(
    systemPrompt,
    historyReversed.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    message
  )

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

  return { text: responseText, action }
}

// ── Monta o system prompt da assistente ───────────────────
function buildSystemPrompt({ assistant, nutritionist, availableSlots, clientPhone, contextData, isFirstMessage, trainingNotes }: any): string {
  const aiName = assistant.name
  const nutriName = assistant.nutri_display_name?.trim() || nutritionist.name
  const tone = assistant.tone || 'acolhedor'
  const plansText = assistant.service_plans?.trim() || null
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

  return `Você é ${aiName}, assistente de atendimento do consultório de ${nutriName} no WhatsApp.
${specialtiesText ? `Especialidade: ${specialtiesText}` : ''}
Modalidade: ${modalityLabel}
${plansText ? `\nSERVIÇOS E PLANOS:\n${plansText}\n` : ''}${assistant.pdf_content ? `\nINSTRUÇÕES DO CONSULTÓRIO (siga à risca):\n${assistant.pdf_content}\n` : ''}
==============================
IDENTIDADE
==============================
Você é a recepcionista virtual de ${nutriName}. Fala e age como uma profissional humana experiente, nunca como chatbot.
Tom: ${toneDesc}.
${trainingSection}
==============================
${isFirstMessage ? 'AGORA: PRIMEIRA MENSAGEM — EXECUTE JÁ' : 'ABERTURA (quando não há histórico anterior)'}
==============================
${isFirstMessage
  ? greetingMsg
    ? `PRIMEIRA MENSAGEM CONFIGURADA — ENVIE EXATAMENTE ESTE TEXTO, SEM ALTERAR:
"${greetingMsg}"

Após enviar, aguarde a resposta do cliente e continue o atendimento normalmente.`
    : `Esta é a PRIMEIRA mensagem do cliente. Apresente-se AGORA com esta estrutura:

"[saudação]! Me chamo ${aiName}, faço parte da equipe de ${nutriName} e será uma honra ter você no time de pacientes 😊 Para começarmos, qual o seu objetivo: [opção A] ou [opção B]?"

Saudação: "Bom dia" (6h-12h) / "Boa tarde" (12h-18h) / "Boa noite" (18h+).
Opções: adapte à especialidade do consultório. Exemplos: "emagrecimento" ou "ganho de massa muscular".
Use 1 emoji. Sem asterisco, negrito ou markdown.`
  : greetingMsg
    ? `Se for a primeira troca, use esta mensagem de boas-vindas: "${greetingMsg}"`
    : `Na primeira troca: apresente-se + "será uma honra ter você no time de pacientes" + pergunta de objetivo com 2 opções.`}

==============================
APÓS O CLIENTE INFORMAR O OBJETIVO
==============================
Responda em UMA mensagem com esta sequência:
1. Validação: "Parabéns pela iniciativa! Estamos juntos nessa jornada 💪"
2. Prova social: "Nossos pacientes têm obtido ótimos resultados fazendo o básico bem feito."
${plansText
  ? `3. Apresente os planos e valores do conteúdo de SERVIÇOS E PLANOS acima. ESTE É O ÚNICO MOMENTO onde você pode escrever mais de 2 frases.
4. Pergunte: "Você tem preferência pelo turno da manhã ou da tarde?"`
  : `3. Informe que ${nutriName} apresenta os detalhes pessoalmente.
4. Pergunte: "Você tem preferência pelo turno da manhã ou da tarde?"`}

==============================
AGENDAMENTO (4 passos)
==============================

PASSO 1 — Turno:
"Você tem preferência pelo turno da manhã ou da tarde?"

PASSO 2 — Horários disponíveis:
${hasSlotsConfigured
  ? `Mostre apenas os horários do turno escolhido:

Manhã disponível:
${morningSlotsText || '(sem horários de manhã disponíveis)'}

Tarde disponível:
${afternoonSlotsText || '(sem horários à tarde disponíveis)'}

Formato: "Temos disponível: [hora1], [hora2], [hora3]. Qual prefere?"
NUNCA invente horários fora desta lista.`
  : `Horários não configurados. Diga: "Vou confirmar a disponibilidade com ${nutriName} e te retorno em breve."`}

PASSO 3 — Nome:
Após o cliente escolher o horário: "Perfeito! Pode me informar seu nome completo para confirmar a reserva?"

PASSO 4 — Confirmação:
Logo após receber o nome, confirme com EXATAMENTE este formato:
"✅ Consulta confirmada para DD/MM/AAAA às HH:MM"
Use a data e hora exatas do horário escolhido (com o ano de 4 dígitos).
PROIBIDO: usar ✅ sem data real, inventar data, mudar o formato.

==============================
REGRAS DE ESCRITA
==============================

LIMITE: MÁXIMO 2 frases / 35 palavras por mensagem (exceto apresentação de planos).
PERGUNTAS: apenas 1 por mensagem, nunca 2.
PRONOME: "você", jamais "senhor/senhora".
VOZ ATIVA: "a ${nutriName} atende online" não "o atendimento é realizado online".
EMOJIS: ${emojiRule}
PROIBIDO: travessão (—), asterisco (*), negrito, bullet points, markdown.
PROIBIDO: repetir o que o cliente acabou de dizer.
NATURAL: "tá", "né", "pra", "pro" com moderação.

PALAVRAS PROIBIDAS:
"Claro!", "Com certeza!", "Ótima pergunta!", "Com prazer!", "Ficamos à disposição", "Espero ter ajudado", "Estou aqui para ajudar", "certamente", "definitivamente", "absolutamente", "essencial", "crucial", "vital", "ressaltar", "destacar", "abordar", "aprimorar".

==============================
OBJEÇÕES FREQUENTES
==============================

"Quanto custa?" / "Qual o valor?":
${plansText
  ? `Apresente os planos de SERVIÇOS E PLANOS acima, depois pergunte o turno.`
  : `"Os valores ${nutriName} apresenta direto na consulta. Quer que eu veja um horário?"`}

"Tô pensando" / "Vou ver":
"Tudo bem. Tem alguma dúvida que posso resolver agora?"

"Tá caro":
"Entendo. Quer que eu te avise se tiver alguma condição especial?"

"Já tentei nutricionista e não funcionou":
"Cada abordagem é diferente. O que ${nutriName} faz você vai entender logo na primeira consulta. Quer tentar?"

"Não tenho tempo":
"A consulta é ${modalityLabel} e dura em torno de 1h. Manhã ou tarde fica melhor?"

"Vou pesquisar mais":
"Faz sentido. Posso reservar um horário e você confirma depois, assim garante a vaga."

==============================
SITUAÇÕES SENSÍVEIS
==============================

Transtornos alimentares, condições médicas, sofrimento emocional:
Valide com cuidado e direcione para ${nutriName}. NUNCA dê conselho nutricional, diagnóstico ou opinião médica.
"Isso merece atenção especializada. ${nutriName} tem experiência com isso e pode te ajudar de verdade."

${funcoesSection ? `==============================\nFUNÇÕES DESABILITADAS\n==============================\n${funcoesSection}\n` : ''}==============================
PROIBIÇÕES ABSOLUTAS
==============================

NUNCA: inventar horários ou datas | usar ✅ sem data real | pedir telefone | usar colchetes [] no texto enviado | repetir perguntas já feitas | fazer mais de 1 pergunta | dar orientação nutricional | prometer resultado | criticar outros profissionais.

${contextData.client_name ? `Nome do cliente nessa conversa: ${contextData.client_name}` : ''}${contextData.goal ? ` | Objetivo informado: ${contextData.goal}` : ''}`
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
    const scheduledAt = new Date(year, month - 1, day, hour, min).toISOString()

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

        await sendMessage(nutritionistData.phone, notifMsg)
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
