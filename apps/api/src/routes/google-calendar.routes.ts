import { FastifyInstance } from 'fastify'
import { google } from 'googleapis'
import { query, queryOne } from '../db'
import { getAuthUrl, handleOAuthCallback, createCalendarEvent } from '../services/google-calendar.service'

export async function googleCalendarRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // GET /api/google-calendar/auth-url — retorna URL de autorização Google
  app.get('/auth-url', auth, async (request, reply) => {
    const { id } = (request as any).user
    const url = getAuthUrl(id)
    return reply.send({ url })
  })

  // GET /api/google-calendar/callback — recebe o código do Google e salva tokens
  app.get('/callback', async (request, reply) => {
    const { code, state, error } = request.query as any
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000'

    if (error || !code || !state) {
      return reply.redirect(`${dashboardUrl}/agenda?google_error=true`)
    }

    try {
      await handleOAuthCallback(code, state)
      return reply.redirect(`${dashboardUrl}/agenda?google_connected=true`)
    } catch (err) {
      console.error('[GCal callback]', err)
      return reply.redirect(`${dashboardUrl}/agenda?google_error=true`)
    }
  })

  // GET /api/google-calendar/status — verifica se o nutri está conectado
  app.get('/status', auth, async (request, reply) => {
    const { id } = (request as any).user
    const conn = await queryOne<any>(
      'SELECT id, calendar_id, created_at FROM google_calendar_connections WHERE nutritionist_id = $1',
      [id]
    )
    return reply.send({ connected: !!conn, calendar_id: conn?.calendar_id ?? 'primary' })
  })

  // DELETE /api/google-calendar/disconnect — desconecta o Google Calendar
  app.delete('/disconnect', auth, async (request, reply) => {
    const { id } = (request as any).user
    await query('DELETE FROM google_calendar_connections WHERE nutritionist_id = $1', [id])
    return reply.send({ ok: true })
  })

  // POST /api/google-calendar/import — importa eventos futuros do Google Calendar para o sistema
  app.post('/import', auth, async (request, reply) => {
    const { id } = (request as any).user

    const conn = await queryOne<any>('SELECT * FROM google_calendar_connections WHERE nutritionist_id = $1', [id])
    if (!conn) return reply.code(400).send({ error: 'Google Calendar não conectado' })

    const client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    )
    client.setCredentials({ access_token: conn.access_token, refresh_token: conn.refresh_token })

    const calendar = google.calendar({ version: 'v3', auth: client })
    const now = new Date()
    const future = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 dias

    const res = await calendar.events.list({
      calendarId: conn.calendar_id || 'primary',
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    })

    const events = (res.data.items || []).filter(e =>
      e.start?.dateTime && // ignora eventos de dia inteiro
      !e.summary?.includes('Frame System') // ignora os que já vieram do sistema
    )

    let imported = 0
    let skipped  = 0

    for (const event of events) {
      const scheduledAt = new Date(event.start!.dateTime!)

      // Verifica se já existe agendamento nesse horário
      const existing = await queryOne<any>(
        `SELECT id FROM appointments
         WHERE nutritionist_id = $1
           AND ABS(EXTRACT(EPOCH FROM (scheduled_at - $2::timestamptz))) < 300
           AND status != 'cancelled'`,
        [id, scheduledAt.toISOString()]
      )
      if (existing) { skipped++; continue }

      // Extrai nome do cliente do título do evento (ex: "Consulta — Maria Silva")
      const title = event.summary || ''
      const clientName = title.replace(/consulta\s*[-–—]?\s*/i, '').trim() || 'Paciente (Google Agenda)'

      try {
        // Busca ou cria o cliente (phone único por nome para evitar conflito de UNIQUE)
        let client_id: string | null = null
        const existingClient = await queryOne<any>(
          `SELECT id FROM clients WHERE nutritionist_id = $1 AND name ILIKE $2`,
          [id, `%${clientName}%`]
        )
        if (existingClient) {
          client_id = existingClient.id
        } else {
          const fakePhone = `gcal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
          const [newClient] = await query<any>(
            `INSERT INTO clients (nutritionist_id, name, phone) VALUES ($1, $2, $3) RETURNING id`,
            [id, clientName, fakePhone]
          )
          client_id = newClient.id
        }

        const durationMs = event.end?.dateTime
          ? new Date(event.end.dateTime).getTime() - scheduledAt.getTime()
          : 50 * 60 * 1000
        const duration = Math.round(durationMs / 60000)

        await query(
          `INSERT INTO appointments (nutritionist_id, client_id, scheduled_at, duration, modality, status, notes, created_by)
           VALUES ($1, $2, $3, $4, 'presencial', 'scheduled', $5, 'nutritionist')`,
          [id, client_id, scheduledAt.toISOString(), duration,
           `Importado do Google Agenda: ${event.summary}`]
        )
        imported++
      } catch (err) {
        app.log.warn({ err, event: event.summary }, '[GCal import] Falha ao importar evento')
        skipped++
      }
    }

    return reply.send({ ok: true, imported, skipped, total: events.length })
  })

  // POST /api/google-calendar/sync — envia todos os agendamentos futuros para o Google Calendar
  app.post('/sync', auth, async (request, reply) => {
    const { id } = (request as any).user

    const appointments = await query<any>(
      `SELECT a.id, a.scheduled_at, a.duration, a.modality,
              c.name AS client_name, c.phone AS client_phone
       FROM appointments a
       LEFT JOIN clients c ON c.id = a.client_id
       WHERE a.nutritionist_id = $1
         AND a.scheduled_at >= NOW()
         AND a.status NOT IN ('cancelled')
       ORDER BY a.scheduled_at`,
      [id]
    )

    let synced = 0
    let lastError = ''
    for (const appt of appointments) {
      try {
        await createCalendarEvent(id, {
          client_name:  appt.client_name || 'Paciente',
          client_phone: appt.client_phone || '',
          scheduled_at: appt.scheduled_at,
          duration:     appt.duration ?? 50,
          modality:     appt.modality ?? 'online',
        })
        synced++
      } catch (err: any) {
        lastError = err?.message || String(err)
        app.log.error({ err }, '[GCal sync] Falha ao enviar evento')
      }
    }

    return reply.send({ ok: true, synced, total: appointments.length, lastError: lastError || undefined })
  })
}
