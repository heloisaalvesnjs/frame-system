import { FastifyInstance } from 'fastify'
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
