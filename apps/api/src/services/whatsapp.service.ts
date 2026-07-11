// uazapi — Serviço WhatsApp
//
// Autenticação: cada instância tem um token próprio (header `token`).
// Criação de instância: usa admintoken global (UAZAPI_ADMIN_TOKEN).
// Diferença chave vs Evolution API: não há instanceName na URL —
// o token no header já identifica qual instância está sendo operada.

import { queryOne } from '../db'

const UAZAPI_BASE_URL  = (process.env.UAZAPI_BASE_URL  || '').replace(/\/$/, '')
const UAZAPI_ADMIN_TOKEN = process.env.UAZAPI_ADMIN_TOKEN || ''

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** Headers para chamadas autenticadas por instância */
function instanceHeaders(instanceToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'token': instanceToken,
  }
}

/** Remove caracteres fora do alfabeto latino/português (evita glitches de encoding da IA) */
export function sanitizeText(text: string): string {
  return text
    .replace(/[⺀-￿]/g, '')  // CJK e blocos asiáticos
    .replace(/[ɐ-ʯ]/g, '')  // IPA exótico
    .replace(/—|–/g, ',')   // travessão longo / en-dash → vírgula
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Divide a resposta em blocos de ~2 frases para envio múltiplo */
function splitIntoChunks(text: string): string[] {
  if (text.length < 100) return [text]

  const sentences = text.match(/[^.!?\n]+[.!?]*/g)?.map(s => s.trim()).filter(Boolean) ?? [text]

  const chunks: string[] = []
  let current = ''
  let sentenceCount = 0

  for (const sentence of sentences) {
    if (!sentence.length) continue
    current = current ? `${current} ${sentence}` : sentence
    sentenceCount++
    if (sentenceCount >= 2 || current.length > 140) {
      chunks.push(current.trim())
      current = ''
      sentenceCount = 0
    }
  }
  if (current.trim()) chunks.push(current.trim())

  return chunks.filter(c => c.length > 0)
}

/**
 * Busca o instance_token ativo de um nutricionista.
 * Não filtra por `status = 'connected'`: essa coluna só se autocorrige quando
 * alguém abre a tela de Integrações (GET /api/whatsapp/status), então fica
 * defasada e bloqueava envios reais mesmo com a instância conectada de
 * verdade na uazapi. A uazapi é a fonte de verdade sobre conectividade —
 * sendMessage já propaga o erro se o envio falhar de fato.
 */
async function getInstanceTokenForNutri(nutritionist_id: string): Promise<string | null> {
  const conn = await queryOne<{ instance_token: string }>(
    `SELECT instance_token FROM whatsapp_connections
     WHERE nutritionist_id = $1 AND instance_token IS NOT NULL
     LIMIT 1`,
    [nutritionist_id]
  )
  return conn?.instance_token ?? null
}

// ── Envio ─────────────────────────────────────────────────────────────────────

/**
 * Envia mensagem de texto via uazapi.
 * instanceToken: token de autenticação da instância (não é o admintoken).
 * readchat/readmessages: marca a conversa como lida ao enviar (equivalente ao markAsRead da Evolution).
 *
 * options.delay: atraso em ms antes de enviar (uazapi simula digitação no servidor).
 *   O template da mentoria usa string "5000" mas o uazapi provavelmente aceita number também.
 *   Validar contra payload real se houver comportamento inesperado.
 * options.readmessages: controla se marca mensagens como lidas (default: true).
 */
export async function sendMessage(
  phone: string,
  text: string,
  instanceToken: string,
  options?: { delay?: number; readmessages?: boolean }
): Promise<void> {
  const number = phone.replace(/\D/g, '').replace('@s.whatsapp.net', '')
  const payload: Record<string, unknown> = {
    number,
    text,
    readchat: true,
    readmessages: options?.readmessages ?? true,
  }
  if (options?.delay !== undefined) {
    payload.delay = options.delay
  }
  const res = await fetch(`${UAZAPI_BASE_URL}/send/text`, {
    method: 'POST',
    headers: instanceHeaders(instanceToken),
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`[uazapi] Erro ao enviar: ${errBody}`)
  }
}

/** Envia mensagem buscando automaticamente o instance_token do nutricionista no banco */
export async function sendMessageForNutri(
  nutritionist_id: string,
  phone: string,
  text: string
): Promise<void> {
  const instanceToken = await getInstanceTokenForNutri(nutritionist_id)
  if (!instanceToken) {
    console.warn(`[uazapi] Sem instância conectada para nutri ${nutritionist_id}`)
    return
  }
  await sendMessage(phone, text, instanceToken)
}

/**
 * Envia resposta da IA com comportamento humanizado:
 * – Sanitiza o texto
 * – Divide em blocos de ~2 frases
 * – Simula tempo de digitação antes de cada bloco
 *
 * Nota: a uazapi marca o chat como lido automaticamente via readchat/readmessages
 * no sendMessage — não há endpoint separado de "mark as read" como na Evolution API.
 * O parâmetro _messageId é mantido apenas para compatibilidade de assinatura.
 */
export async function sendWithHumanDelay(
  phone: string,
  text: string,
  instanceToken: string,
  _messageId?: string
): Promise<void> {
  const clean = sanitizeText(text)
  if (!clean) return

  const chunks = splitIntoChunks(clean)

  await sleep(800 + Math.random() * 800)

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const typingMs = Math.min(Math.max(chunk.length * 35, 700), 3500)
    await sleep(typingMs)
    await sendMessage(phone, chunk, instanceToken)
    if (i < chunks.length - 1) {
      await sleep(600 + Math.random() * 600)
    }
  }
}

/**
 * Envia mensagem configurada pelo nutri (greeting) como UMA ÚNICA mensagem.
 * Sem split — preserva o conteúdo exatamente como configurado.
 */
export async function sendConfiguredMessage(
  phone: string,
  text: string,
  instanceToken: string,
  _messageId?: string
): Promise<void> {
  const clean = sanitizeText(text)
  if (!clean) return

  await sleep(800 + Math.random() * 800)
  const typingMs = Math.min(Math.max(clean.length * 20, 1000), 4000)
  await sleep(typingMs)
  await sendMessage(phone, clean, instanceToken)
}

/**
 * Envia imagem ou PDF via uazapi.
 * Usado quando o nutri configura mídia dos planos para envio automático.
 */
export async function sendMediaMessage(
  phone: string,
  mediaUrl: string,
  mediaType: 'image' | 'pdf',
  fileName: string,
  instanceToken: string
): Promise<void> {
  const number = phone.replace(/\D/g, '').replace('@s.whatsapp.net', '')
  const body = mediaType === 'pdf'
    ? { number, type: 'document', file: mediaUrl, docName: fileName || 'planos.pdf' }
    : { number, type: 'image',    file: mediaUrl }

  const res = await fetch(`${UAZAPI_BASE_URL}/send/media`, {
    method: 'POST',
    headers: instanceHeaders(instanceToken),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`[uazapi] Erro ao enviar mídia: ${err}`)
  }
}

// ── Instância ─────────────────────────────────────────────────────────────────

/** Status da conexão de uma instância */
export async function getInstanceStatus(instanceToken: string): Promise<'connected' | 'connecting' | 'disconnected'> {
  try {
    const res = await fetch(`${UAZAPI_BASE_URL}/instance/status`, {
      headers: instanceHeaders(instanceToken),
    })
    if (!res.ok) return 'disconnected'
    const data = await res.json() as Record<string, any>

    // O campo de status nunca foi validado contra um payload real da uazapi —
    // versões diferentes da API expõem isso em lugares diferentes (raiz,
    // aninhado em "instance", ou como booleano "connected"/"loggedIn").
    // Checa todas as variantes plausíveis antes de assumir desconectado.
    const rawState = (
      data.status ??
      data.instance?.status ??
      data.state ??
      ''
    ) as string
    const normalized = String(rawState).toLowerCase()

    if (normalized === 'connected' || normalized === 'open') return 'connected'
    if (normalized === 'connecting' || normalized === 'qrcode' || normalized === 'starting') return 'connecting'

    // Sem campo de status legível — tenta booleano explícito antes de desistir
    if (data.connected === true || data.loggedIn === true || data.instance?.connected === true) {
      return 'connected'
    }

    // 'disconnected' | 'close' | 'hibernated' | qualquer outro estado → desconectado
    return 'disconnected'
  } catch {
    return 'disconnected'
  }
}

/**
 * Inicia ou reinicia a conexão de uma instância — endpoint unificado da uazapi.
 *
 * Sem phone → inicia sessão de QR code.
 * Com phone → gera pairing code (formato internacional, ex: "5511999999999").
 *
 * Retorna { qrCode, pairingCode } — apenas um deles será preenchido dependendo do modo.
 *
 * ATENÇÃO: o formato exato das respostas da uazapi (nomes dos campos qrcode/paircode)
 * ainda não foi validado contra um payload real em produção. Recomenda-se capturar
 * uma chamada real via webhook.cool antes de considerar 100% confiável.
 */
export async function connectInstance(
  instanceToken: string,
  phone?: string
): Promise<{ qrCode: string; pairingCode: string }> {
  const body = phone ? { phone: phone.replace(/\D/g, '') } : {}
  const res = await fetch(`${UAZAPI_BASE_URL}/instance/connect`, {
    method: 'POST',
    headers: instanceHeaders(instanceToken),
    body: JSON.stringify(body),
  })

  const data = res.ok
    ? (await res.json() as Record<string, unknown>)
    : {}

  if (phone) {
    // Pairing code: campo pode ser paircode, code ou pairingCode dependendo da versão da uazapi
    const pairingCode = ((data.paircode ?? data.code ?? data.pairingCode) ?? '') as string
    return { qrCode: '', pairingCode }
  }

  // QR code: pode vir direto no body da resposta
  const inlineQr = ((data.qrcode ?? data.base64 ?? data.qr) ?? '') as string
  if (inlineQr) return { qrCode: inlineQr, pairingCode: '' }

  // Fallback: busca via GET /instance/status (uazapi popula qrcode lá após o connect)
  try {
    const statusRes = await fetch(`${UAZAPI_BASE_URL}/instance/status`, {
      headers: instanceHeaders(instanceToken),
    })
    if (statusRes.ok) {
      const statusData = await statusRes.json() as Record<string, unknown>
      return { qrCode: ((statusData.qrcode ?? statusData.qr) ?? '') as string, pairingCode: '' }
    }
  } catch { /* silencioso */ }

  return { qrCode: '', pairingCode: '' }
}

/**
 * Cria uma nova instância na uazapi usando o admintoken global.
 *
 * Retorna { token, id } da instância criada — AMBOS devem ser persistidos no banco:
 *   - token → whatsapp_connections.instance_token (usado em todas as chamadas de API)
 *   - id    → whatsapp_connections.instance_id (usado para rotear webhooks recebidos)
 *
 * Retorna null em caso de falha. O token NÃO pode ser recuperado depois sem resetar a instância.
 */
export async function createInstance(name: string): Promise<{ token: string; id: string } | null> {
  try {
    const res = await fetch(`${UAZAPI_BASE_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'admintoken': UAZAPI_ADMIN_TOKEN,
      },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[uazapi] createInstance error:', err)
      return null
    }
    const data = await res.json() as Record<string, unknown>
    const token = (data.token ?? '') as string
    const id    = (data.id    ?? '') as string
    if (!token) {
      console.error('[uazapi] createInstance: token ausente na resposta', data)
      return null
    }
    return { token, id }
  } catch (e) {
    console.error('[uazapi] createInstance exception:', e)
    return null
  }
}

/** Desconecta (logout) uma instância — mantém a instância existindo, exige novo QR para reconectar */
export async function disconnectInstance(instanceToken: string): Promise<void> {
  try {
    await fetch(`${UAZAPI_BASE_URL}/instance/disconnect`, {
      method: 'POST',
      headers: instanceHeaders(instanceToken),
    })
  } catch { /* não crítico */ }
}

/**
 * Deleta completamente uma instância.
 * Diferença da Evolution API: sem instanceName na URL — o token no header identifica a instância.
 */
export async function deleteInstance(instanceToken: string): Promise<void> {
  try {
    await fetch(`${UAZAPI_BASE_URL}/instance`, {
      method: 'DELETE',
      headers: instanceHeaders(instanceToken),
    })
  } catch { /* não crítico */ }
}

/**
 * Configura o webhook de uma instância.
 * excludeMessages: ['wasSentByApi'] evita loop — a automação não recebe de volta as mensagens que ela mesma enviou.
 */
export async function setInstanceWebhook(instanceToken: string, webhookUrl: string): Promise<void> {
  try {
    const res = await fetch(`${UAZAPI_BASE_URL}/webhook`, {
      method: 'POST',
      headers: instanceHeaders(instanceToken),
      body: JSON.stringify({
        url: webhookUrl,
        events: ['messages'],
        excludeMessages: ['wasSentByApi'],
        enabled: true,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('[uazapi] setInstanceWebhook error:', err)
    }
  } catch (e) {
    console.error('[uazapi] setInstanceWebhook exception:', e)
  }
}
