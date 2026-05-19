// ── Evolution API — Serviço WhatsApp ──────────────────────

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || ''

const headers = {
  'Content-Type': 'application/json',
  'apikey': EVOLUTION_KEY
}

// ── Criar instância ────────────────────────────────────────
export async function createInstance(instanceName: string): Promise<string> {
  const res = await fetch(`${EVOLUTION_URL}/instance/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    })
  })

  const body = await res.json() as any

  console.log('[Evolution createInstance] status:', res.status, JSON.stringify(body))

  if (!res.ok) {
    const msg = (Array.isArray(body?.response?.message) ? body.response.message[0] : body?.message) || JSON.stringify(body)
    if (!msg.toLowerCase().includes('already') && !msg.toLowerCase().includes('in use')) {
      throw new Error(`Erro ao criar instância: ${msg}`)
    }
    // Instância já existe — segue para buscar QR
  }

  // Evolution API v2 retorna o QR code direto na criação
  return body?.qrcode?.base64 || body?.base64 || ''
}

// ── Buscar QR Code ─────────────────────────────────────────
export async function getQRCode(instanceName: string): Promise<string> {
  const res = await fetch(`${EVOLUTION_URL}/instance/connect/${instanceName}`, {
    headers
  })

  if (!res.ok) return ''

  const data = await res.json() as any
  console.log('[Evolution getQRCode]', JSON.stringify(data))
  return data.base64 || data.qrcode?.base64 || data.code || ''
}

// ── Status da instância ────────────────────────────────────
export async function getInstanceStatus(instanceName: string): Promise<'connected' | 'connecting' | 'disconnected'> {
  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
      headers
    })

    if (!res.ok) return 'disconnected'

    const data = await res.json() as any
    const instance = Array.isArray(data) ? data[0] : data

    const state = instance?.instance?.state || instance?.state || ''

    if (state === 'open') return 'connected'
    if (state === 'connecting') return 'connecting'
    return 'disconnected'
  } catch {
    return 'disconnected'
  }
}

// ── Enviar mensagem ────────────────────────────────────────
export async function sendMessage(instanceName: string, phone: string, text: string): Promise<void> {
  const number = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`

  const res = await fetch(`${EVOLUTION_URL}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      number,
      text
    })
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Erro ao enviar mensagem: ${body}`)
  }
}

// ── Deletar instância ──────────────────────────────────────
export async function deleteInstance(instanceName: string): Promise<void> {
  const res = await fetch(`${EVOLUTION_URL}/instance/delete/${instanceName}`, {
    method: 'DELETE',
    headers
  })
  const body = await res.text()
  console.log('[Evolution deleteInstance] status:', res.status, 'body:', body)
}
