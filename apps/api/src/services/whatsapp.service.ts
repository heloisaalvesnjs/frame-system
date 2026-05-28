// Z-API -- Servico WhatsApp

const ZAPI_INSTANCE_ID  = process.env.ZAPI_INSTANCE_ID  || ''
const ZAPI_TOKEN        = process.env.ZAPI_TOKEN        || ''
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN || ''

const ZAPI_BASE = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}`

const headers = {
  'Content-Type': 'application/json',
  'Client-Token': ZAPI_CLIENT_TOKEN
}

// helpers
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** Remove caracteres fora do alfabeto latino/portugues (evita glitches de encoding da IA) */
export function sanitizeText(text: string): string {
  return text
    .replace(/[⺀-￿]/g, '')  // CJK e blocos asiaticos
    .replace(/[ɐ-ʯ]/g, '')  // IPA exotico
    .replace(/—|–/g, ',')   // travessao longo / en-dash -> virgula
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Divide a resposta em blocos de ~2 frases para envio multiplo */
function splitIntoChunks(text: string): string[] {
  if (text.length < 100) return [text]

  const sentences = text.match(/[^.!?\n]+[.!?]*/g)?.map(s => s.trim()).filter(Boolean) ?? [text]

  const chunks: string[] = []
  let current = ''
  let sentenceCount = 0

  for (const sentence of sentences) {
    if (sentence.length === 0) continue
    current = current ? `${current} ${sentence}` : sentence
    sentenceCount++

    // Novo chunk a cada 2 frases ou se ficou muito longo
    if (sentenceCount >= 2 || current.length > 140) {
      chunks.push(current.trim())
      current = ''
      sentenceCount = 0
    }
  }
  if (current.trim()) chunks.push(current.trim())

  return chunks.filter(c => c.length > 0)
}

// Status da instancia
export async function getInstanceStatus(): Promise<'connected' | 'connecting' | 'disconnected'> {
  try {
    const res = await fetch(`${ZAPI_BASE}/status`, { headers })
    if (!res.ok) return 'disconnected'
    const data = await res.json() as any
    console.log('[Z-API getStatus]', JSON.stringify(data))
    if (data.connected === true) return 'connected'
    return 'connecting'
  } catch {
    return 'disconnected'
  }
}

// QR Code
export async function getQRCode(): Promise<string> {
  const res = await fetch(`${ZAPI_BASE}/qr-code`, { headers })
  if (!res.ok) return ''
  const data = await res.json() as any
  console.log('[Z-API getQRCode]', data?.value ? 'QR recebido' : JSON.stringify(data))
  return data.value || ''
}

// Pairing Code
export async function getPairingCode(phoneNumber: string): Promise<string> {
  const phone = phoneNumber.replace(/\D/g, '')
  const res = await fetch(`${ZAPI_BASE}/paring-code`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ phone })
  })
  const data = await res.json() as any
  console.log('[Z-API getPairingCode]', JSON.stringify(data))
  if (!res.ok) {
    throw new Error(data?.message || data?.error || JSON.stringify(data))
  }
  return data.pairingCode || data.value || ''
}

// Enviar mensagem simples (uso interno e notificacoes)
export async function sendMessage(phone: string, text: string): Promise<void> {
  const number = phone.replace(/\D/g, '').replace('@s.whatsapp.net', '')
  const res = await fetch(`${ZAPI_BASE}/send-text`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ phone: number, message: text })
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Erro ao enviar mensagem: ${body}`)
  }
}

// Marcar como lida (silencioso se falhar)
async function markAsRead(phone: string, messageId?: string): Promise<void> {
  try {
    const number = phone.replace(/\D/g, '').replace('@s.whatsapp.net', '')
    await fetch(`${ZAPI_BASE}/read-message`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone: number, messageId: messageId ?? '' })
    })
  } catch { /* nao critico */ }
}

/**
 * Envia resposta da IA com comportamento humanizado:
 * - Sanitiza o texto (remove glitches de encoding)
 * - Divide em blocos de 2 frases
 * - Simula tempo de leitura + digitacao antes de cada bloco
 */
export async function sendWithHumanDelay(
  phone: string,
  text: string,
  messageId?: string
): Promise<void> {
  const clean = sanitizeText(text)
  if (!clean) return

  const chunks = splitIntoChunks(clean)

  // Simula "visualizou a mensagem" (800-1600ms)
  await markAsRead(phone, messageId)
  await sleep(800 + Math.random() * 800)

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]

    // Simula digitacao: ~35ms/char, min 700ms, max 3500ms
    const typingMs = Math.min(Math.max(chunk.length * 35, 700), 3500)
    await sleep(typingMs)

    await sendMessage(phone, chunk)

    // Pausa entre chunks (600-1200ms)
    if (i < chunks.length - 1) {
      await sleep(600 + Math.random() * 600)
    }
  }
}

// Desconectar
export async function disconnectInstance(): Promise<void> {
  await fetch(`${ZAPI_BASE}/disconnect`, { method: 'GET', headers })
}

// Compatibilidade
export async function createInstance(_name: string): Promise<string> { return '' }
export async function deleteInstance(_name: string): Promise<void> {}
