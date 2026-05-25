import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { query, queryOne } from '../db'
import { getNextAvailableSlots } from './appointment.service'
import { sendMessage } from './whatsapp.service'

// ── Provedor de IA (claude | gemini | groq) ───────────────────
const AI_PROVIDER = process.env.AI_PROVIDER || 'claude'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })
const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })


async function callClaude(systemPrompt: string, messages: { role: 'user' | 'assistant', content: string }[], userMessage: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 120,
    system: systemPrompt,
    messages: [...messages, { role: 'user', content: userMessage }]
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}

async function callGroq(systemPrompt: string, messages: { role: 'user' | 'assistant', content: string }[], userMessage: string): Promise<string> {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 120,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage }
    ]
  })
  return response.choices[0]?.message?.content || ''
}

async function callAI(systemPrompt: string, messages: { role: 'user' | 'assistant', content: string }[], userMessage: string): Promise<string> {
  // Define ordem dos providers: primary → fallback
  const providers = AI_PROVIDER === 'claude'
    ? [
        { name: 'claude', fn: callClaude },
        { name: 'groq',   fn: callGroq   }
      ]
    : [
        { name: 'groq',   fn: callGroq   },
        { name: 'claude', fn: callClaude }
      ]

  for (let i = 0; i < providers.length; i++) {
    const { name, fn } = providers[i]
    try {
      const result = await fn(systemPrompt, messages, userMessage)
      if (i > 0) console.log(`[AI] Fallback para ${name} funcionou`)
      return result
    } catch (err: any) {
      const isLast = i === providers.length - 1
      console.error(`[AI] ${name} falhou (${err?.status || err?.message}). ${isLast ? 'Sem mais fallbacks.' : 'Tentando próximo...'}`)
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

  // 4. Salva a mensagem do usuário
  await query(
    'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
    [convId, 'user', message]
  )

  // 5. Busca próximos horários disponíveis (varre até 7 dias, pula feriados)
  const availableSlots = await getNextAvailableSlots(nutritionist_id)

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

  // Contexto extra da nutricionista (Epic 2)
  const specialtiesText = assistant.specialties || nutritionist.specialty || null
  const modalities = assistant.consultation_modalities || 'online'
  const modalityLabel = modalities === 'presencial' ? 'presencial'
    : modalities.includes('presencial') ? 'presencial ou online'
    : 'online'

  return `Você é ${assistant.name}, assistente comercial da nutricionista ${nutritionist.name} no WhatsApp.
${specialtiesText ? `ESPECIALIDADES: ${specialtiesText}\n` : ''}FORMATO DE CONSULTA: ${modalityLabel}
${assistant.pdf_content ? `\nINSTRUÇÕES DA NUTRICIONISTA:\n${assistant.pdf_content}\n` : ''}
COMUNICAÇÃO (regras absolutas): máximo 2 frases curtas por mensagem | uma pergunta por vez | nunca repita o que já foi dito na conversa | máximo 1 emoji | máximo 50 palavras | tom ${assistant.tone || 'informal e profissional'} | português brasileiro.

MISSÃO: Agendar a primeira consulta. Você resolve o problema — a consulta é a solução.

DADOS QUE VOCÊ JÁ TEM (NUNCA PEÇA):
- Telefone do cliente: já veio pelo WhatsApp automaticamente. JAMAIS peça o número.
- Tudo que o cliente já disse nessa conversa: está no histórico. NUNCA repita perguntas.

LEIA O CLIENTE:
- Urgente → empatia rápida, ofereça agendamento em até 3 trocas
- Com dor (frustração, insegurança) → valide, só depois ofereça
- Curioso → responda em 1 frase, convide para consulta
- Hesitante ("deixa eu pensar") → descubra o obstáculo real

FLUXO (máximo 5 trocas até oferecer agendamento):
1. Acolhimento + 1 pergunta sobre objetivo
2. Descoberta da dor ("o que já tentou?" OU "como isso te afeta?") — escolha UMA
3. Validação + ponte: "é exatamente isso que a ${nutritionist.name} resolve"
4. Oferta do agendamento
5. Coleta do primeiro nome → confirma imediatamente
Se o cliente já demonstrou interesse antes da troca 5, pule direto para a oferta.

AGENDAMENTO — REGRAS CRÍTICAS:
- Pergunte APENAS o primeiro nome. NUNCA peça sobrenome, telefone, e-mail ou qualquer outro dado.
- Após ter o nome, confirme imediatamente. Não faça mais perguntas.
${slotsText
    ? `- Horários disponíveis (amanhã):\n${slotsText}\n- Use APENAS estes horários. NUNCA invente dias ou horários.`
    : `- Horários ainda não configurados. NUNCA use o formato ✅ Consulta confirmada sem uma data e hora reais.\n- Se o cliente quiser agendar após dar o nome: "Perfeito, [nome]! Vou confirmar os horários disponíveis com a ${nutritionist.name} e já te retorno. Fique no aguardo!"`
  }
- Confirmação APENAS quando tiver data e hora reais: "✅ Consulta confirmada para [DATA] às [HORA]"
- NUNCA use o ✅ com placeholder, data genérica ou sem horário definido.

OBJEÇÕES:
"Quanto custa?" → "O valor a ${nutritionist.name} passa pessoalmente. Já verifico um horário pra você?"
"Deixa eu pensar" → "Claro! O que te ajudaria a decidir?"
"Sem grana" → "Entendo. Aviso se tiver condição especial?"
"Não sei se funciona" → "Qual é sua maior dúvida?"
"Sem tempo" → "É rápido e pode ser ${modalityLabel}. Manhã ou tarde funciona melhor?"

NUNCA: inventar horários ou dias | usar ✅ sem data e hora reais | pedir telefone | pedir sobrenome | repetir perguntas já feitas | fazer mais de 1 pergunta por mensagem | explicar nutrição em detalhes | enviar duas mensagens separadas em uma resposta | continuar perguntando após ter o nome.
${contextData.client_name ? `\nNome do cliente: ${contextData.client_name}` : ''}${contextData.goal ? ` | Objetivo já informado: ${contextData.goal}` : ''}`
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
          `🗓️ *Nova consulta agendada pela Sofia!*\n\n` +
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
