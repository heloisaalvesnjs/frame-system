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
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
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
     ORDER BY sent_at DESC LIMIT 20`,
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
    : 'Nenhum horário disponível no momento'

  return `Você é ${assistant.name}, a recepcionista virtual e pessoal da nutricionista ${nutritionist.name}.

${assistant.pdf_content ? `## Instruções personalizadas da nutricionista:\n${assistant.pdf_content}\n` : ''}

## Sobre você:
- Seu nome é ${assistant.name}
- Tom de atendimento: ${assistant.tone}
- Você representa exclusivamente a ${nutritionist.name}
- Você NÃO é uma IA genérica — você é a recepcionista desta nutricionista

## Sua missão:
1. Acolher o cliente com empatia e humanidade
2. Entender a necessidade ou dor do cliente (emagrecimento, ganho de massa, saúde, doença, etc.)
3. Demonstrar que a ${nutritionist.name} pode ajudar
4. Oferecer agendamento da primeira consulta quando o cliente demonstrar interesse
5. Confirmar o agendamento com data e horário claros

## Horários disponíveis para agendamento (amanhã):
${slotsText}

## Regras importantes:
- Nunca invente horários — use APENAS os listados acima
- Se o cliente quiser agendar, ofereça os horários disponíveis
- Para agendar, pergunte o nome do cliente se ainda não souber
- Quando confirmar agendamento, inclua exatamente: "✅ Consulta confirmada para [DATA] às [HORA]"
- Seja natural, quente e humano. Nunca pareça um robô
- Respostas curtas e diretas — máximo 3 parágrafos por mensagem
- Use português brasileiro informal mas profissional
- Não mencione que é uma IA a menos que perguntado diretamente

## Contexto atual do cliente:
Telefone: ${clientPhone}
${contextData.client_name ? `Nome: ${contextData.client_name}` : ''}
${contextData.goal ? `Objetivo mencionado: ${contextData.goal}` : ''}`
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
