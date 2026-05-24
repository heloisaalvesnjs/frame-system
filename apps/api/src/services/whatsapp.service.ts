// ── Z-API — Serviço WhatsApp ──────────────────────────────────

const ZAPI_INSTANCE_ID = process.env.ZAPI_INSTANCE_ID || ''
const ZAPI_TOKEN       = process.env.ZAPI_TOKEN       || ''
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN || ''

const ZAPI_BASE = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}`

const headers = {
  'Content-Type': 'application/json',
  'Client-Token': ZAPI_CLIENT_TOKEN
}

// ── Status da instância ────────────────────────────────────────
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

// ── QR Code ────────────────────────────────────────────────────
export async function getQRCode(): Promise<string> {
  const res = await fetch(`${ZAPI_BASE}/qr-code`, { headers })
  if (!res.ok) return ''
  const data = await res.json() as any
  console.log('[Z-API getQRCode]', data?.value ? 'QR recebido' : JSON.stringify(data))
  return data.value || ''
}

// ── Pairing Code ───────────────────────────────────────────────
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

// ── Enviar mensagem ────────────────────────────────────────────
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

// ── Desconectar ────────────────────────────────────────────────
export async function disconnectInstance(): Promise<void> {
  await fetch(`${ZAPI_BASE}/disconnect`, { method: 'GET', headers })
}

// ── Compatibilidade — não usados no Z-API ─────────────────────
export async function createInstance(_name: string): Promise<string> { return '' }
export async function deleteInstance(_name: string): Promise<void> {}
