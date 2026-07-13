import { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db'
import { z } from 'zod'
import {
  getAuthUrl,
  handleOAuthCallback,
  importEventsFromGoogle,
  syncAppointmentsToGoogle,
  listAvailableCalendars,
  setCalendar,
  markLegacyImportsAsSynced,
  removeDuplicateSyncedEvents,
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

  // GET /api/google-calendar/calendars — lista os calendários disponíveis na conta conectada
  // (ex: quando a conta tem acesso a mais de uma agenda, tipo a própria e a de outra pessoa)
  app.get('/calendars', auth, async (request, reply) => {
    const { id } = (request as any).user
    const conn = await queryOne<any>('SELECT id FROM google_calendar_connections WHERE nutritionist_id = $1', [id])
    if (!conn) return reply.code(400).send({ error: 'Google Calendar não conectado' })

    try {
      const calendars = await listAvailableCalendars(id)
      return reply.send({ calendars })
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || String(err)
      // Erro comum: conta conectada antes do escopo readonly existir — precisa reconectar.
      return reply.code(502).send({ error: `Erro ao listar calendários: ${msg}` })
    }
  })

  // PUT /api/google-calendar/calendar — escolhe qual calendário da conta sincronizar
  app.put('/calendar', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { calendar_id } = z.object({ calendar_id: z.string().min(1) }).parse(request.body)
    await setCalendar(id, calendar_id)
    return reply.send({ ok: true })
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

  // POST /api/google-calendar/fix-duplicates — correção pontual (2026-07-11):
  // marca importados antigos como já sincronizados e apaga os eventos
  // duplicados que o sync criou por engano no Google Agenda do nutri.
  // Remover essa rota depois de rodada uma vez.
  app.post('/fix-duplicates', auth, async (request, reply) => {
    const { id } = (request as any).user
    const marked = await markLegacyImportsAsSynced(id)
    const { checked, deleted } = await removeDuplicateSyncedEvents(id)
    return reply.send({ ok: true, marked_as_synced: marked, checked, deleted })
  })
}
