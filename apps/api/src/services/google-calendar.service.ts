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
    // readonly além de events: sem isso a API não deixa listar os calendários
    // disponíveis na conta (ex: quando a conta logada tem acesso a mais de um
    // calendário compartilhado, como "Heloísa Alves" e "David Effgen").
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
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
 * Monta um client OAuth2 autenticado pro nutricionista, já com listener pra
 * persistir tokens renovados automaticamente. Retorna null se não conectado.
 */
export async function getAuthedClient(nutritionistId: string) {
  const conn = await queryOne<any>(
    'SELECT * FROM google_calendar_connections WHERE nutritionist_id = $1',
    [nutritionistId]
  )
  if (!conn) return null

  const client = makeOAuth2Client()
  client.setCredentials({
    access_token:  conn.access_token,
    refresh_token: conn.refresh_token,
    expiry_date:   conn.token_expiry ? new Date(conn.token_expiry).getTime() : undefined,
  })

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

  return { client, calendarId: conn.calendar_id || 'primary' }
}

/**
 * Lista os calendários visíveis pra conta Google conectada (ex: quando a
 * conta logada tem acesso a mais de uma agenda — a própria e a de outra
 * pessoa que compartilhou). Usado pra deixar escolher qual sincronizar.
 */
export async function listAvailableCalendars(nutritionistId: string): Promise<
  { id: string; summary: string; primary: boolean; selected: boolean }[]
> {
  const authed = await getAuthedClient(nutritionistId)
  if (!authed) return []

  const { client, calendarId: currentCalendarId } = authed
  const calendar = google.calendar({ version: 'v3', auth: client })
  const res = await calendar.calendarList.list({ maxResults: 250 })

  return (res.data.items || [])
    .filter(c => c.accessRole === 'owner' || c.accessRole === 'writer') // só onde dá pra criar evento
    .map(c => ({
      id: c.id || '',
      summary: c.summary || c.id || '',
      primary: !!c.primary,
      selected: (c.id || '') === currentCalendarId,
    }))
}

/**
 * Troca qual calendário da conta é usado pra importar/enviar consultas.
 * Reseta gcal_synced_at das consultas futuras — trocar de calendário sem
 * isso deixaria elas "presas" como já sincronizadas com o calendário antigo.
 */
export async function setCalendar(nutritionistId: string, calendarId: string): Promise<void> {
  await query(
    'UPDATE google_calendar_connections SET calendar_id = $1, updated_at = NOW() WHERE nutritionist_id = $2',
    [calendarId, nutritionistId]
  )
  await query(
    `UPDATE appointments SET gcal_synced_at = NULL
     WHERE nutritionist_id = $1 AND scheduled_at >= NOW() AND status NOT IN ('cancelled')`,
    [nutritionistId]
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
  const authed = await getAuthedClient(nutritionistId)
  if (!authed) return // Não conectado — ignora silenciosamente

  try {
    const { client, calendarId } = authed
    const calendar = google.calendar({ version: 'v3', auth: client })

    const start = new Date(appointment.scheduled_at)
    const end   = new Date(start.getTime() + (appointment.duration ?? 50) * 60_000)

    const modalityLabel = appointment.modality === 'presencial' ? 'Presencial' : 'Online'

    await calendar.events.insert({
      calendarId,
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

/**
 * Importa eventos futuros/recentes do Google Calendar do nutricionista pro sistema.
 * Ignora eventos de dia inteiro e os que já vieram do próprio Frame System.
 */
export async function importEventsFromGoogle(nutritionistId: string): Promise<{ imported: number; skipped: number; total: number }> {
  const authed = await getAuthedClient(nutritionistId)
  if (!authed) return { imported: 0, skipped: 0, total: 0 }

  const { client, calendarId } = authed
  const calendar = google.calendar({ version: 'v3', auth: client })
  const now = new Date()
  // Só pra frente (com 1h de folga pra pegar algo criado momentos atrás) — o
  // objetivo é evitar duplo agendamento em consultas FUTURAS, não importar o
  // histórico inteiro. Uma janela de 30 dias pra trás varria anos de
  // anotações antigas do nutri na agenda (nomes com preço/observação tipo
  // "Fulana – mensal (R$450)") e criava um "cliente" fantasma com telefone
  // falso pra cada uma — poluía Pacientes sem nenhuma utilidade real, já que
  // esse telefone falso nunca vai bater com uma conversa de WhatsApp real.
  const start = new Date(now.getTime() - 1 * 60 * 60 * 1000)
  const future = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  const res = await calendar.events.list({
    calendarId,
    timeMin: start.toISOString(),
    timeMax: future.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 100,
  })

  const events = (res.data.items || []).filter(e =>
    e.start?.dateTime &&
    !e.summary?.includes('Frame System') &&
    !e.summary?.includes('Consulta') // evita reimportar o que o proprio sync criou (createCalendarEvent usa "Consulta ...")
  )

  let imported = 0
  let skipped = 0

  for (const event of events) {
    const scheduledAt = new Date(event.start!.dateTime!)

    const existing = await queryOne<any>(
      `SELECT id FROM appointments
       WHERE nutritionist_id = $1
         AND ABS(EXTRACT(EPOCH FROM (scheduled_at - $2::timestamptz))) < 300
         AND status != 'cancelled'`,
      [nutritionistId, scheduledAt.toISOString()]
    )
    if (existing) { skipped++; continue }

    const title = event.summary || ''
    const clientName = title.replace(/consulta\s*[-–—]?\s*/i, '').trim() || 'Paciente (Google Agenda)'

    try {
      let client_id: string | null = null
      const existingClient = await queryOne<any>(
        `SELECT id FROM clients WHERE nutritionist_id = $1 AND name ILIKE $2`,
        [nutritionistId, `%${clientName}%`]
      )
      if (existingClient) {
        client_id = existingClient.id
      } else {
        const fakePhone = `gcal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        const [newClient] = await query<any>(
          `INSERT INTO clients (nutritionist_id, name, phone) VALUES ($1, $2, $3) RETURNING id`,
          [nutritionistId, clientName, fakePhone]
        )
        client_id = newClient.id
      }

      const durationMs = event.end?.dateTime
        ? new Date(event.end.dateTime).getTime() - scheduledAt.getTime()
        : 50 * 60 * 1000
      const duration = Math.round(durationMs / 60000)

      // gcal_synced_at = NOW() aqui é essencial: esse agendamento VEIO do
      // Google Agenda, o evento já existe lá. Sem isso, o próximo ciclo do
      // sync (appointments -> Google) tratava como "nunca sincronizado" e
      // criava um evento NOVO duplicado pro mesmo horário.
      await query(
        `INSERT INTO appointments (nutritionist_id, client_id, scheduled_at, duration, modality, status, notes, created_by, gcal_synced_at)
         VALUES ($1, $2, $3, $4, 'presencial', 'scheduled', $5, 'nutritionist', NOW())`,
        [nutritionistId, client_id, scheduledAt.toISOString(), duration,
         `Importado do Google Agenda: ${event.summary}`]
      )
      imported++
    } catch (err) {
      console.error('[GCal import] Falha ao importar evento:', event.summary, err)
      skipped++
    }
  }

  return { imported, skipped, total: events.length }
}

/** Envia todos os agendamentos futuros (ainda não sincronizados) pro Google Calendar. */
export async function syncAppointmentsToGoogle(nutritionistId: string): Promise<{ synced: number; total: number; lastError?: string }> {
  const appointments = await query<any>(
    `SELECT a.id, a.scheduled_at, a.duration, a.modality,
            c.name AS client_name, c.phone AS client_phone
     FROM appointments a
     LEFT JOIN clients c ON c.id = a.client_id
     WHERE a.nutritionist_id = $1
       AND a.scheduled_at >= NOW()
       AND a.status NOT IN ('cancelled')
       AND a.gcal_synced_at IS NULL`,
    [nutritionistId]
  )

  let synced = 0
  let lastError = ''
  for (const appt of appointments) {
    try {
      await createCalendarEvent(nutritionistId, {
        client_name:  appt.client_name || 'Paciente',
        client_phone: appt.client_phone || '',
        scheduled_at: appt.scheduled_at,
        duration:     appt.duration ?? 50,
        modality:     appt.modality ?? 'online',
      })
      await query('UPDATE appointments SET gcal_synced_at = NOW() WHERE id = $1', [appt.id])
      synced++
    } catch (err: any) {
      lastError = err?.message || String(err)
      console.error('[GCal sync] Falha ao enviar evento:', err)
    }
  }

  return { synced, total: appointments.length, lastError: lastError || undefined }
}

/**
 * Correção pontual (2026-07-11): agendamentos importados do Google Agenda
 * ANTES do fix que marca gcal_synced_at na importação ficaram com esse campo
 * NULL, e o sync (appointments -> Google) tentou reenviá-los pro Google,
 * duplicando eventos que já existiam lá. Isso marca esses agendamentos como
 * já sincronizados, pra parar de gerar mais duplicatas no próximo ciclo.
 */
export async function markLegacyImportsAsSynced(nutritionistId: string): Promise<number> {
  const rows = await query<{ id: string }>(
    `UPDATE appointments SET gcal_synced_at = NOW()
     WHERE nutritionist_id = $1
       AND notes LIKE 'Importado do Google Agenda:%'
       AND gcal_synced_at IS NULL
     RETURNING id`,
    [nutritionistId]
  )
  return rows.length
}

/**
 * Correção pontual (2026-07-11): remove os eventos duplicados que o sync
 * criou no Google Agenda pra agendamentos que já tinham vindo de lá (ver
 * markLegacyImportsAsSynced acima). Só apaga eventos com a assinatura da
 * nossa própria criação ("📋 Consulta ...", vem de createCalendarEvent) que
 * caem bem no horário de um agendamento marcado como "Importado do Google
 * Agenda" — nunca toca em eventos que não tenham essa assinatura.
 */
export async function removeDuplicateSyncedEvents(nutritionistId: string): Promise<{ checked: number; deleted: number }> {
  const authed = await getAuthedClient(nutritionistId)
  if (!authed) return { checked: 0, deleted: 0 }
  const { client, calendarId } = authed
  const calendar = google.calendar({ version: 'v3', auth: client })

  const imported = await query<{ id: string; scheduled_at: string }>(
    `SELECT id, scheduled_at::text FROM appointments
     WHERE nutritionist_id = $1 AND notes LIKE 'Importado do Google Agenda:%'`,
    [nutritionistId]
  )

  let deleted = 0
  for (const appt of imported) {
    const start = new Date(appt.scheduled_at)
    const windowStart = new Date(start.getTime() - 5 * 60 * 1000)
    const windowEnd = new Date(start.getTime() + 5 * 60 * 1000)

    try {
      const res = await calendar.events.list({
        calendarId,
        timeMin: windowStart.toISOString(),
        timeMax: windowEnd.toISOString(),
        singleEvents: true,
      })
      const duplicates = (res.data.items || []).filter(e => e.summary?.startsWith('📋 Consulta'))
      for (const dup of duplicates) {
        if (!dup.id) continue
        await calendar.events.delete({ calendarId, eventId: dup.id })
        deleted++
      }
    } catch (err) {
      console.error('[GCal cleanup] Falha ao checar/apagar duplicata:', err)
    }
  }

  return { checked: imported.length, deleted }
}

/**
 * Cron de sincronização automática de mão dupla — roda periodicamente pra
 * todos os nutricionistas conectados, sem precisar de ação manual no painel.
 */
export async function runGoogleCalendarAutoSync(): Promise<void> {
  const connections = await query<{ nutritionist_id: string }>(
    'SELECT nutritionist_id FROM google_calendar_connections'
  )
  for (const conn of connections) {
    try {
      await importEventsFromGoogle(conn.nutritionist_id)
      await syncAppointmentsToGoogle(conn.nutritionist_id)
    } catch (err) {
      console.error(`[GCal auto-sync] Erro pra nutri ${conn.nutritionist_id}:`, err)
    }
  }
}
