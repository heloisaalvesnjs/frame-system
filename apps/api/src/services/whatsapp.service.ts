// Evolution API — Serviço WhatsApp

import { queryOne } from '../db'

const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || 'http://localhost:8080').replace(/\/$/, '')
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''

const evoHeaders = {
  'Content-Type': 'application/json',
  'apikey': EVOLUTION_API_KEY
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/** Remove caracteres fora do alfabeto latino/portugues (evita glitches de encoding da IA) */
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

/** Busca o instance_name ativo de um nutricionista */
async function getInstanceForNutri(nutritionist_id: string): Promise<string | null> {
  const conn = await queryOne<any>(
    `SELECT instance_name FROM whatsapp_connections
     WHERE nutritionist_id = $1 AND status = 'connected'
     LIMIT 1`,
    [nutritionist_id]
  )
  return conn?.instance_name ?? null
}

// ── Envio ─────────────────────────────────────────────────────────────────────

/** Envia mensagem de texto via Evolution API */
export async function sendMessage(phone: string, text: string, instanceName: string): Promise<void> {
  const number = phone.replace(/\D/g, '').replace('@s.whatsapp.net', '')
  const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers: evoHeaders,
    body: JSON.stringify({ number, text })
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`[Evolution] Erro ao enviar: ${body}`)
  }
}

/** Envia mensagem buscando automaticamente a instância do nutricionista */
export async function sendMessageForNutri(
  nutritionist_id: string,
  phone: string,
  text: string
): Promise<void> {
  const instanceName = await getInstanceForNutri(nutritionist_id)
  if (!instanceName) {
    console.warn(`[Evolution] Sem instância conectada para nutri ${nutritionist_id}`)
    return
  }
  await sendMessage(phone, text, instanceName)
}

/** Marca mensagem como lida (silencioso se falhar) */
async function markAsRead(phone: string, messageId: string | undefined, instanceName: string): Promise<void> {
  try {
    const number = phone.replace(/\D/g, '').replace('@s.whatsapp.net', '')
    await fetch(`${EVOLUTION_API_URL}/chat/markMessageAsRead/${instanceName}`, {
      method: 'POST',
      headers: evoHeaders,
      body: JSON.stringify({
        readMessages: [{ id: messageId ?? '', remoteJid: `${number}@s.whatsapp.net`, fromMe: false }]
      })
    })
  } catch { /* não crítico */ }
}

/**
 * Envia resposta da IA com comportamento humanizado:
 * – Sanitiza o texto
 * – Divide em blocos de ~2 frases
 * – Simula leitura + digitação antes de cada bloco
 */
export async function sendWithHumanDelay(
  phone: string,
  text: string,
  instanceName: string,
  messageId?: string
): Promise<void> {
  const clean = sanitizeText(text)
  if (!clean) return

  const chunks = splitIntoChunks(clean)

  await markAsRead(phone, messageId, instanceName)
  await sleep(800 + Math.random() * 800)

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const typingMs = Math.min(Math.max(chunk.length * 35, 700), 3500)
    await sleep(typingMs)
    await sendMessage(phone, chunk, instanceName)
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
  instanceName: string,
  messageId?: string
): Promise<void> {
  const clean = sanitizeText(text)
  if (!clean) return

  await markAsRead(phone, messageId, instanceName)
  await sleep(800 + Math.random() * 800)
  const typingMs = Math.min(Math.max(clean.length * 20, 1000), 4000)
  await sleep(typingMs)
  await sendMessage(phone, clean, instanceName)
}

/**
 * Envia imagem ou PDF via Evolution API.
 * Usado quando o nutri configura mídia dos planos para envio automático.
 */
export async function sendMediaMessage(
  phone: string,
  mediaUrl: string,
  mediaType: 'image' | 'pdf',
  fileName: string,
  instanceName: string
): Promise<void> {
  const number = phone.replace(/\D/g, '').replace('@s.whatsapp.net', '')
  // Evolution API aceita tanto URL pública quanto data URL (base64)
  const isBase64 = mediaUrl.startsWith('data:')
  const mimetype = isBase64
    ? mediaUrl.split(';')[0].replace('data:', '')
    : (mediaType === 'pdf' ? 'application/pdf' : 'image/jpeg')
  const body = mediaType === 'pdf'
    ? { number, mediatype: 'document', mimetype, media: mediaUrl, fileName: fileName || 'planos.pdf' }
    : { number, mediatype: 'image',    mimetype, media: mediaUrl }

  const res = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`, {
    method: 'POST',
    headers: evoHeaders,
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`[Evolution] Erro ao enviar mídia: ${err}`)
  }
}

// ── Instância ─────────────────────────────────────────────────────────────────

/** Status da conexão de uma instância */
export async function getInstanceStatus(instanceName: string): Promise<'connected' | 'connecting' | 'disconnected'> {
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      headers: evoHeaders
    })
    if (!res.ok) return 'disconnected'
    const data = await res.json() as any
    const state = data.instance?.state ?? data.state
    if (state === 'open') return 'connected'
    if (state === 'connecting') return 'connecting'
    return 'disconnected'
  } catch {
    return 'disconnected'
  }
}

/** QR Code para conectar (retorna base64) */
export async function getQRCode(instanceName: string): Promise<string> {
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      headers: evoHeaders
    })
    if (!res.ok) return ''
    const data = await res.json() as any
    return data.base64 || ''
  } catch {
    return ''
  }
}

/** Pairing code — login pelo número de telefone */
export async function getPairingCode(phoneNumber: string, instanceName: string): Promise<string> {
  const phone = phoneNumber.replace(/\D/g, '')
  const res = await fetch(`${EVOLUTION_API_URL}/instance/pairingCode/${instanceName}`, {
    method: 'POST',
    headers: evoHeaders,
    body: JSON.stringify({ number: phone })
  })
  const data = await res.json() as any
  if (!res.ok) throw new Error(data?.message || JSON.stringify(data))
  return data.code || ''
}

/**
 * Cria uma instância na Evolution API e configura o webhook automaticamente.
 * Chamado quando o nutricionista conecta o WhatsApp pela primeira vez.
 */
export async function createInstance(instanceName: string, webhookUrl?: string): Promise<string> {
  try {
    const body: any = {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    }

    if (webhookUrl) {
      body.webhook = {
        url: webhookUrl,
        byEvents: false,
        base64: true,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE']
      }
    }

    const res = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: evoHeaders,
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json() as any
    return data.instance?.instanceName || instanceName
  } catch (e) {
    console.error('[Evolution] createInstance error:', e)
    return ''
  }
}

/** Desconecta (logout) uma instância */
export async function disconnectInstance(instanceName: string): Promise<void> {
  try {
    await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: evoHeaders
    })
  } catch { /* não crítico */ }
}

/** Deleta completamente uma instância */
export async function deleteInstance(instanceName: string): Promise<void> {
  try {
    await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: evoHeaders
    })
  } catch { /* não crítico */ }
}

/** Configura o webhook de uma instância */
export async function setInstanceWebhook(instanceName: string, webhookUrl: string): Promise<void> {
  try {
    await fetch(`${EVOLUTION_API_URL}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: evoHeaders,
      body: JSON.stringify({
        url: webhookUrl,
        byEvents: false,
        base64: true,
        enabled: true,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE']
      })
    })
  } catch (e) {
    console.error('[Evolution] setInstanceWebhook error:', e)
  }
}
