import { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db'
import {
  getAuthUrl,
  handleOAuthCallback,
  importEventsFromGoogle,
  syncAppointmentsToGoogle,
} from '../services/google-calendar.service'

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
    const painelUrl = process.env.PAINEL_URL || process.env.DASHBOARD_URL || 'http://localhost:3100'
    const redirectBase = `${painelUrl}/assistente?tab=integracoes`

    if (error || !code || !state) {
      return reply.redirect(`${redirectBase}&google_error=true`)
    }

    try {
      await handleOAuthCallback(code, state)
      return reply.redirect(`${redirectBase}&google_connected=true`)
    } catch (err) {
      console.error('[GCal callback]', err)
      return reply.redirect(`${redirectBase}&google_error=true`)
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
  // (o mesmo roda automaticamente em background — este botão força uma checagem imediata)
  app.post('/import', auth, async (request, reply) => {
    const { id } = (request as any).user
    const conn = await queryOne<any>('SELECT id FROM google_calendar_connections WHERE nutritionist_id = $1', [id])
    if (!conn) return reply.code(400).send({ error: 'Google Calendar não conectado' })

    const result = await importEventsFromGoogle(id)
    return reply.send({ ok: true, ...result })
  })

  // POST /api/google-calendar/sync — envia agendamentos ainda não sincronizados pro Google Calendar
  // (o mesmo roda automaticamente em background — este botão força uma checagem imediata)
  app.post('/sync', auth, async (request, reply) => {
    const { id } = (request as any).user
    const conn = await queryOne<any>('SELECT id FROM google_calendar_connections WHERE nutritionist_id = $1', [id])
    if (!conn) return reply.code(400).send({ error: 'Google Calendar não conectado' })

    const result = await syncAppointmentsToGoogle(id)
    return reply.send({ ok: true, ...result })
  })
}
