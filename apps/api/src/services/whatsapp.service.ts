// ── Evolution API — Serviço WhatsApp ──────────────────────

const EVOLUTION_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY || ''

const headers = {
  'Content-Type': 'application/json',
  'apikey': EVOLUTION_KEY
}

// ── Criar instância ────────────────────────────────────────
export async function createInstance(instanceName: string): Promise<void> {
  const res = await fetch(`${EVOLUTION_URL}/instance/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: {
        url: `${process.env.API_URL || 'http://localhost:3001'}/webhook/whatsapp`,
        byEvents: true,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE']
      }
    })
  })

  if (!res.ok) {
    const body = await res.text()
    // Se a instância já existe, não é erro
    if (!body.includes('already')) {
      throw new Error(`Erro ao criar instância Evolution API: ${body}`)
    }
  }
}

// ── Buscar QR Code ─────────────────────────────────────────
export async function getQRCode(instanceName: string): Promise<string> {
  // Aguarda a Evolution API gerar o QR
  await new Promise(r => setTimeout(r, 3000))

  const res = await fetch(`${EVOLUTION_URL}/instance/connect/${instanceName}`, {
    headers
  })

  if (!res.ok) throw new Error('Erro ao buscar QR Code')

  const data = await res.json() as any
  // Evolution API v2 pode retornar em diferentes formatos
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
  await fetch(`${EVOLUTION_URL}/instance/delete/${instanceName}`, {
    method: 'DELETE',
    headers
  })
}
