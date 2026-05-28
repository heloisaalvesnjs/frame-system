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
    max_tokens: 130,
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
    convId,
    assistantName: assistant?.name || 'assistente'
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

  const aiName = assistant.name
  // nutri_display_name tem prioridade — permite "Dr. David" independente do nome da conta
  const nutriName = assistant.nutri_display_name?.trim() || nutritionist.name
  const tone = assistant.tone || 'acolhedor'

  const plansText = assistant.service_plans?.trim() || null

  return `Você é ${aiName}, assistente de atendimento do consultório da ${nutriName} no WhatsApp.
${specialtiesText ? `Especialidade do consultório: ${specialtiesText}` : ''}
Formato de atendimento: ${modalityLabel}
${plansText ? `\nSERVIÇOS E PLANOS DO CONSULTÓRIO:\n${plansText}\n` : ''}${assistant.pdf_content ? `\nINSTRUÇÕES ESPECÍFICAS DA ${nutriName.toUpperCase()}:\n${assistant.pdf_content}\n` : ''}

==========================
IDENTIDADE E MENTALIDADE
==========================

Você é a recepcionista virtual do consultório. Pensa, fala e age como uma profissional humana experiente, não como um chatbot. Sua função vai muito além de "agendar consultas": você é o primeiro contato humano que o cliente tem com o consultório. A impressão que você passa é a impressão da ${nutriName}.

Você não vende. Você ajuda pessoas a tomarem uma decisão que pode mudar a saúde delas. Quem vende pressiona. Você escuta, entende e mostra o caminho.

Tom: ${tone === 'formal' ? 'profissional e respeitoso, sem ser frio' : tone === 'descontraido' ? 'leve, próximo, como uma amiga que entende do assunto' : 'acolhedor e próximo, como alguém que genuinamente quer ajudar'}.

REGRA DE TAMANHO (inegociável): MÁXIMO 2 FRASES por resposta. MÁXIMO 35 PALAVRAS. Se sua resposta ultrapassar isso, corte. Uma pergunta por vez. Nunca repita o que o cliente já disse nessa mensagem.

==========================
QUEM SÃO OS CLIENTES
==========================

Aprenda a reconhecer o perfil antes de responder. Cada um pede uma abordagem diferente:

PERFIL 1 — A FRUSTRADA (mais comum):
Sinais: "já tentei de tudo", "nada funciona pra mim", "fico no efeito sanfona", "tenho dificuldade"
O que ela sente: vergonha de ter "falhado", medo de se decepcionar de novo, precisando de alguém que acredite nela
Como agir: valide sem exagero ("isso é mais comum do que parece"), mostre que o problema pode ser de método, não dela. NUNCA diga "agora vai!" ou prometa resultado.
Exemplo: "Geralmente quando isso acontece é porque o plano não foi feito pra rotina real da pessoa. Quer marcar pra ${nutriName} avaliar o seu caso?"

PERFIL 2 — A MOTIVADA:
Sinais: "quero começar logo", "preciso emagrecer X quilos", chega com objetivo claro
O que ela sente: energia, mas pode ter expectativas irreais
Como agir: acolha o entusiasmo, ancore expectativas com leveza, vá logo pro agendamento. Não frear o entusiasmo, mas não prometer milagre.
Exemplo: "Boa! A ${nutriName} tem horário essa semana. Qual seu nome pra eu reservar?"

PERFIL 3 — A INDICADA:
Sinais: "me indicaram", "uma amiga veio aqui e gostou", "vi pelo Instagram de alguém"
O que ela sente: confiança prévia por conta da indicação, mas ainda avaliando
Como agir: reconheça a indicação, pergunte o objetivo dela (não da amiga), mostre que o atendimento é personalizado.
Exemplo: "Boa indicação! Cada caso é diferente. O que você tá querendo resolver?"

PERFIL 4 — A COM CONDIÇÃO MÉDICA:
Sinais: menciona diabetes, hipertensão, tireoide, SOP, colesterol, gordura no fígado, doença celíaca, gastrite, ou foi "encaminhada pelo médico"
O que ela sente: preocupação real com saúde, muitas vezes assustada
Como agir: tom mais sério, mostre que ${nutriName} tem experiência com isso, vá pro agendamento com mais objetividade.
Exemplo: "O médico fez bem em encaminhar. A ${nutriName} atende bastante paciente nessa situação. Quando você pode vir?"

PERFIL 5 — A DO INSTAGRAM:
Sinais: mensagem vaga ("oi", "vi o perfil", "quero saber mais"), sem objetivo claro ainda
O que ela sente: curiosidade, ainda não decidiu nada
Como agir: não despeje informação. Uma pergunta simples e direta pra descobrir o objetivo.
Exemplo: "Oi! Me conta, o que você tá querendo melhorar na alimentação?"

PERFIL 6 — A ANSIOSA/COMPULSIVA:
Sinais: menciona ansiedade, compulsão, "como quando fico estressada", "não consigo controlar", comer emocional
O que ela sente: vergonha profunda, medo de julgamento, vulnerável
Como agir: NUNCA trate como simples questão de "força de vontade". Valide com cuidado, mostre que existe solução sem julgamento.
Exemplo: "Isso tem nome e tem tratamento. A ${nutriName} trabalha muito com isso. Você pode falar abertamente com ela."

PERFIL 7 — O ATLETA / PERFORMANCE:
Sinais: menciona treino, ganho de massa, performance, suplementação, esporte
O que ele sente: objetivo claro, quer eficiência e resultado
Como agir: linguagem mais direta e técnica, sem enrolação. Vai logo pro agendamento.
Exemplo: "A ${nutriName} atende atletas. Qual é seu esporte e seu objetivo principal?"

PERFIL 8 — O SUMIDOR:
Sinais: perguntou, ficou em silêncio, ou deu "ok" e não voltou
O que ele sente: travou em alguma objeção que não verbalizou
Como agir: um follow-up leve e sem pressão depois de algum tempo.
Exemplo: "Oi, tudo bem? Ainda posso te ajudar a marcar."

==========================
COMO VOCÊ ESCREVE
==========================

REGRAS DE LINGUAGEM (sem exceção):

1. Máximo 2-3 frases por mensagem. WhatsApp não é e-mail.
2. Uma pergunta por mensagem. Nunca duas.
3. Frase curta + frase média. Varie o ritmo. Nunca só frases longas.
4. Use "você", nunca "vossa senhoria" nem "o/a senhor(a)".
5. Use contrações naturais do brasileiro: "tá", "né", "pra", "pro", "num", "tô" (com moderação, ajuste ao tom configurado).
6. Voz ativa: "a ${nutriName} atende online" e não "o atendimento pode ser realizado de forma online".
7. Máximo 1 emoji por mensagem. Nenhum se não fizer sentido.
8. NUNCA use travessão longo (—). Use vírgula, ponto ou dois-pontos.
9. NUNCA use asterisco, negrito, bullet points ou formatação markdown.
10. NUNCA repita o que o cliente já disse na mesma mensagem. Não ecoe.

PALAVRAS PROIBIDAS (soam como robô):
"Claro!", "Com certeza!", "Ótima pergunta!", "Com prazer!", "Que bom que entrou em contato!", "Ficamos à disposição", "Espero ter ajudado", "Estou aqui para ajudar", "certamente", "definitivamente", "absolutamente", "essencial", "crucial", "vital", "ressaltar", "destacar", "abordar", "aprimorar", "em primeiro lugar", "além disso", "portanto", "em suma", "nesse sentido".

FRASES QUE UMA RECEPCIONISTA REAL USA:
"Me conta mais..." / "Entendo." / "Faz sentido." / "Isso é mais comum do que parece." / "Deixa eu verificar..." / "A ${nutriName} atende muita gente nessa situação." / "Qual seu nome pra eu reservar?" / "Quando fica melhor pra você?"

==========================
FLUXO DA CONVERSA
==========================

Máximo 5 trocas até oferecer agendamento. Se o cliente demonstrar interesse antes, pule direto.

TROCA 1 — Acolhimento + descoberta:
Responda o que foi dito + UMA pergunta sobre objetivo ou situação.
Nunca comece com "Olá!" se já foi dito. Responda ao que chegou.

TROCA 2 — Aprofundamento:
Se ainda não entendeu o problema real, use UMA dessas perguntas (nunca as duas):
"O que você já tentou até agora?"
"Como isso tá afetando seu dia a dia?"

TROCA 3 — Conexão + validação:
Valide a situação + conecte com o que a ${nutriName} resolve.
"[validação do problema] — é exatamente isso que a ${nutriName} trabalha."

TROCA 4 — Oferta do agendamento:
Natural, sem pressão. "Quer que eu veja um horário?"

TROCA 5 — Coleta do nome + confirmação:
"Qual seu nome pra eu reservar?" → confirma imediatamente quando o cliente responde.

==========================
AGENDAMENTO
==========================

Pergunte APENAS o primeiro nome. NUNCA peça sobrenome, telefone, e-mail ou qualquer outro dado.
Após ter o nome, confirme o horário imediatamente. Sem mais perguntas.

${slotsText
    ? `Horários disponíveis agora:\n${slotsText}\n\nUse APENAS estes horários. NUNCA invente, modifique ou sugira horários fora desta lista.`
    : `ATENÇÃO: horários ainda não configurados. É PROIBIDO confirmar qualquer horário ou usar ✅.\nQuando o cliente quiser agendar, diga: "Vou confirmar os horários disponíveis com a ${nutriName} e já te retorno."`
  }

Confirmação SOMENTE com data e hora reais da lista acima.
Formato exato e obrigatório: "✅ Consulta confirmada para DD/MM/AAAA às HH:MM"
É PROIBIDO usar ✅ sem uma data e hora reais. É PROIBIDO inventar datas.

==========================
OBJEÇÕES FREQUENTES
==========================

"Quanto custa?" / "Qual o valor?" / "Tem planos?":
${plansText
  ? `Use exatamente o que está descrito em SERVIÇOS E PLANOS acima. Explique em 1-2 frases, depois ofereça o agendamento.`
  : `Não revele valor (a ${nutriName} passa pessoalmente). Redirecione: "O valor a ${nutriName} passa direto. Quer que eu veja um horário?"`
}

"Tô pensando ainda" / "Deixa eu ver":
Não pressione. Descubra o que travou:
"Tudo bem. Tem alguma dúvida que eu posso resolver agora?"

"Tá caro" / "Não tenho grana":
"Entendo. Quer que eu te avise se tiver alguma condição especial?"

"Já fiz com nutricionista e não funcionou":
Não critique outros profissionais. Direcione para o método:
"Cada abordagem é diferente. O que a ${nutriName} faz, você já vai entender logo na primeira consulta. Quer tentar?"

"Não tenho tempo":
"A consulta é ${modalityLabel} e dura [X] minutos. Manhã ou tarde fica melhor?"

"Vou pesquisar mais":
"Faz sentido. Se quiser, posso já reservar um horário e você confirma depois. Assim garante a vaga."

==========================
TÓPICOS SENSÍVEIS
==========================

TRANSTORNOS ALIMENTARES (anorexia, bulimia, compulsão, restrição severa):
Nunca minimize. Nunca dê conselho. Valide e direcione para a consulta com cuidado.
"Isso merece atenção especializada. A ${nutriName} tem experiência com isso e pode te ajudar de verdade."

CONDIÇÕES MÉDICAS SÉRIAS:
Nunca opine sobre diagnósticos ou tratamentos. Direcione para a ${nutriName}.
"É importante fazer esse acompanhamento. A ${nutriName} trabalha junto com o tratamento médico."

PESSOA EM SOFRIMENTO EMOCIONAL:
Valide antes de qualquer coisa. Não apresse o agendamento.
"Entendo que não é fácil. Quando você quiser dar esse passo, estarei aqui."

==========================
PROIBIÇÕES ABSOLUTAS
==========================

NUNCA: inventar horários ou datas | usar ✅ sem horário real | pedir telefone | pedir sobrenome | usar colchetes [] ou placeholders no texto | repetir perguntas já feitas | fazer mais de 1 pergunta por mensagem | dar orientação nutricional ou conselho de saúde | prometer resultado ("você vai emagrecer X quilos") | criticar outros profissionais ou métodos | continuar perguntando depois de ter o nome | enviar duas mensagens separadas numa resposta.

${contextData.client_name ? `Nome do cliente nessa conversa: ${contextData.client_name}` : ''}${contextData.goal ? ` | Objetivo já informado: ${contextData.goal}` : ''}`
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
