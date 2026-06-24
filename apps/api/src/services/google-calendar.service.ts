// Google Calendar Integration Service

import { google } from 'googleapis'
import { queryOne, query } from '../db'

const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID     || ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

// URL pública da API (para o redirect OAuth)
const API_PUBLIC_URL = (process.env.API_PUBLIC_URL || '').replace(/\/$/, '')
const REDIRECT_URI   = `${API_PUBLIC_URL}/api/google-calendar/callback`

function makeOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

/** Gera URL de autorização do Google. state = nutritionist_id para o callback saber quem é. */
export function getAuthUrl(nutritionistId: string): string {
  const client = makeOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    prompt: 'consent',
    state: nutritionistId,
  })
}

/** Troca código por tokens e persiste no banco. */
export async function handleOAuthCallback(code: string, nutritionistId: string): Promise<void> {
  const client = makeOAuth2Client()
  const { tokens } = await client.getToken(code)

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Tokens incompletos retornados pelo Google.')
  }

  const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null

  await query(
    `INSERT INTO google_calendar_connections
       (nutritionist_id, access_token, refresh_token, token_expiry)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (nutritionist_id) DO UPDATE
       SET access_token  = $2,
           refresh_token = $3,
           token_expiry  = $4,
           updated_at    = NOW()`,
    [nutritionistId, tokens.access_token, tokens.refresh_token, expiryDate]
  )
}

/**
 * Cria um evento no Google Calendar do nutricionista.
 * Silencioso se não houver conexão ou ocorrer erro — não bloqueia o agendamento.
 */
export async function createCalendarEvent(nutritionistId: string, appointment: {
  client_name: string
  client_phone: string
  scheduled_at: string | Date
  duration?: number
  modality?: string
}): Promise<void> {
  const conn = await queryOne<any>(
    'SELECT * FROM google_calendar_connections WHERE nutritionist_id = $1',
    [nutritionistId]
  )
  if (!conn) return // Não conectado — ignora silenciosamente

  try {
    const client = makeOAuth2Client()
    client.setCredentials({
      access_token:  conn.access_token,
      refresh_token: conn.refresh_token,
      expiry_date:   conn.token_expiry ? new Date(conn.token_expiry).getTime() : undefined,
    })

    // Persiste tokens renovados automaticamente
    client.on('tokens', async (tokens) => {
      await query(
        `UPDATE google_calendar_connections
         SET access_token  = COALESCE($2, access_token),
             refresh_token = COALESCE($3, refresh_token),
             token_expiry  = $4,
             updated_at    = NOW()
         WHERE nutritionist_id = $1`,
        [
          nutritionistId,
          tokens.access_token   || null,
          tokens.refresh_token  || null,
          tokens.expiry_date    ? new Date(tokens.expiry_date) : null,
        ]
      )
    })

    const calendar = google.calendar({ version: 'v3', auth: client })

    const start = new Date(appointment.scheduled_at)
    const end   = new Date(start.getTime() + (appointment.duration ?? 50) * 60_000)

    const modalityLabel = appointment.modality === 'presencial' ? 'Presencial' : 'Online'

    await calendar.events.insert({
      calendarId: conn.calendar_id || 'primary',
      requestBody: {
        summary:     `📋 Consulta ${modalityLabel} — ${appointment.client_name}`,
        description: `Agendado via Frame System\n\nCliente: ${appointment.client_name}\nWhatsApp: ${appointment.client_phone}\nModalidade: ${modalityLabel}`,
        start: { dateTime: start.toISOString(), timeZone: 'America/Sao_Paulo' },
        end:   { dateTime: end.toISOString(),   timeZone: 'America/Sao_Paulo' },
        colorId: appointment.modality === 'presencial' ? '3' : '1', // 3=sage, 1=lavender
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      },
    })

    console.log(`[GCal] Evento criado para ${appointment.client_name} em ${start.toISOString()}`)
  } catch (err: any) {
    // Relança o erro para o chamador decidir como tratar
    const msg = err?.response?.data?.error?.message || err?.message || String(err)
    console.error('[GCal] Erro ao criar evento:', msg)
    throw new Error(`Google Calendar: ${msg}`)
  }
}
