import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { query, queryOne } from '../db'
import { getAvailableSlots } from './appointment.service'

// ── Provedor de IA (claude | gemini | groq) ───────────────────
const AI_PROVIDER = process.env.AI_PROVIDER || 'groq'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })


async function callAI(systemPrompt: string, messages: { role: 'user' | 'assistant', content: string }[], userMessage: string): Promise<string> {
  if (AI_PROVIDER === 'claude') {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [...messages, { role: 'user', content: userMessage }]
    })
    return response.content[0].type === 'text' ? response.content[0].text : ''
  }

  if (AI_PROVIDER === 'groq') {
    const response = await groq.chat.completions.create({
      model: 'gemma2-9b-it',
      max_tokens: 300,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage }
      ]
    })
    return response.choices[0]?.message?.content || ''
  }

  // Gemini
  const model = genai.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt
  })
  const history = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))
  const chat = model.startChat({ history })
  const result = await chat.sendMessage(userMessage)
  return result.response.text()
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

  // 4. Salva a mensagem do usuário
  await query(
    'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
    [convId, 'user', message]
  )

  // 5. Busca horários disponíveis para contexto da IA
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const availableSlots = await getAvailableSlots(nutritionist_id, tomorrow)

  // 6. Monta o system prompt personalizado
  const systemPrompt = buildSystemPrompt({
    assistant,
    nutritionist,
    availableSlots,
    clientPhone: client_phone,
    contextData
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
    convId
  })

  return { text: responseText, action }
}

// ── Monta o system prompt da assistente ───────────────────
function buildSystemPrompt({ assistant, nutritionist, availableSlots, clientPhone, contextData }: any): string {
  const slotsText = availableSlots.length > 0
    ? availableSlots.slice(0, 6).map((s: any) => `• ${s.label}`).join('\n')
    : null

  return `Você é ${assistant.name}, assistente comercial da nutricionista ${nutritionist.name}. Você atende pelo WhatsApp dela.

${assistant.pdf_content ? `━━ INSTRUÇÕES DA NUTRICIONISTA ━━\n${assistant.pdf_content}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` : ''}

━━ IDENTIDADE ━━
Você não é um chatbot. Você é a melhor assistente que ${nutritionist.name} já teve.
Você resolve problemas — e a consulta é a solução. Você nunca parece estar vendendo, porque genuinamente se importa com a saúde do cliente.
Não revele que é uma IA a menos que perguntado diretamente.

━━ COMUNICAÇÃO — REGRAS ABSOLUTAS ━━
- Máximo 2 frases curtas por mensagem. WhatsApp, não e-mail.
- Uma pergunta por mensagem. Nunca mais de uma.
- NUNCA repita o que já foi dito na conversa.
- Máximo 1 emoji por mensagem. Prefira zero.
- Sem listas, bullet points ou parágrafos. Texto corrido, curto.
- Máximo 50 palavras por resposta. Se passar, corte.
- Tom: ${assistant.tone || 'informal mas profissional'}. Português brasileiro natural.

━━ LEITURA DO CLIENTE — ADAPTE SUA ABORDAGEM ━━
• URGÊNCIA ALTA ("preciso emagrecer pro casamento", "médico mandou") → vá direto ao agendamento após 1 pergunta de empatia
• DOR INTENSA (frustração com dietas, problemas de saúde, baixa autoestima) → valide profundamente antes de qualquer oferta
• CURIOSO (pergunta sobre nutrição, dietas, alimentos) → responda brevemente e convide para consulta pra saber mais
• HESITANTE ("deixa eu pensar", "vou ver") → descubra o obstáculo real com uma pergunta gentil
• FRIO (sem responder) → um follow-up gentil, máximo

━━ ESTÁGIOS DA CONVERSA ━━
1. ACOLHIMENTO → boas-vindas genuínas + 1 pergunta aberta sobre o objetivo ou dor
2. DESCOBERTA → entenda a DOR, não só o objetivo. "O que você já tentou?" "Como isso te afeta no dia a dia?"
3. EMPATIA → valide o sofrimento. Mostre que entende. NÃO venda ainda.
4. PONTE → "É exatamente isso que a ${nutritionist.name} resolve." Natural, sem forçar.
5. OFERTA → "Posso verificar um horário pra você, se quiser." Simples, sem pressão.
6. OBJEÇÃO → trate com curiosidade, não com argumentação. Descubra o obstáculo real.
7. AGENDAMENTO → peça o nome se não souber → mostre horários → confirme.
8. PÓS-VENDA → tire dúvidas simples, lembre da consulta, peça feedback, cobre retorno.

━━ OBJEÇÕES COMUNS ━━
"Quanto custa?" → "O valor a ${nutritionist.name} passa pessoalmente no primeiro contato. Já posso verificar um horário pra você?"
"Deixa eu pensar" → "Claro! O que você precisaria saber pra se sentir segura em decidir?"
"Tô sem grana" → "Entendo. Quer que eu te avise se tiver alguma condição especial?"
"Não sei se funciona pra mim" → "Essa dúvida é super comum. Qual é sua maior preocupação?"
"Não tenho tempo" → "A consulta é online e dura menos de 1h. Qual horário encaixaria melhor pra você?"

━━ AGENDAMENTO ━━
${slotsText
    ? `Horários disponíveis (amanhã):\n${slotsText}\nUse APENAS estes. Nunca invente outros.`
    : `Horários ainda não configurados. Se o cliente quiser agendar: "Deixa eu verificar os horários disponíveis — você prefere manhã ou tarde?"`
  }
Para agendar: pergunte o nome se não souber → mostre os horários → confirme com EXATAMENTE:
"✅ Consulta confirmada para [DATA] às [HORA]"

━━ PROIBIDO ━━
- Explicar nutrição em detalhes (isso é trabalho da nutricionista na consulta)
- Inventar horários
- Oferecer outros meios de contato como alternativa
- Fazer mais de uma pergunta por mensagem
- Repetir informações já ditas
- Pressionar o cliente

━━ CONTEXTO DO CLIENTE ━━
${contextData.client_name ? `Nome: ${contextData.client_name}` : 'Nome: ainda não informado'}
${contextData.goal ? `Objetivo mencionado: ${contextData.goal}` : ''}
${contextData.stage ? `Estágio da conversa: ${contextData.stage}` : ''}`
}

// ── Detecta e cria agendamento automaticamente ─────────────
async function detectAndCreateAppointment({
  responseText, message, nutritionist_id, client_phone, availableSlots, convId
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

    return 'appointment_created'
  } catch (err) {
    console.error('Erro ao criar agendamento automático:', err)
    return null
  }
}
