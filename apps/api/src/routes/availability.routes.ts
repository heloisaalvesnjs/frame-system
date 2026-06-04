import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query } from '../db'

const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export async function availabilityRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // GET /api/availability — retorna configuração dos 7 dias da semana
  app.get('/', auth, async (request, reply) => {
    const { id } = (request as any).user

    const rows = await query<any>(
      `SELECT day_of_week, start_time, end_time, slot_duration, is_active, break_start, break_end
       FROM availability WHERE nutritionist_id = $1 ORDER BY day_of_week`,
      [id]
    )

    const days = Array.from({ length: 7 }, (_, i) => {
      const found = rows.find((r: any) => r.day_of_week === i)
      return {
        day_of_week:   i,
        label:         DAY_LABELS[i],
        is_active:     found?.is_active ?? false,
        start_time:    found?.start_time?.slice(0, 5)   ?? '08:00',
        end_time:      found?.end_time?.slice(0, 5)     ?? '18:00',
        slot_duration: found?.slot_duration             ?? 60,
        break_start:   found?.break_start?.slice(0, 5) ?? null,
        break_end:     found?.break_end?.slice(0, 5)   ?? null,
      }
    })

    return reply.send({ availability: days })
  })

  // PUT /api/availability — salva todos os dias de uma vez
  app.put('/', auth, async (request, reply) => {
    const { id } = (request as any).user

    const daySchema = z.object({
      day_of_week:   z.number().int().min(0).max(6),
      is_active:     z.boolean(),
      start_time:    z.string().regex(/^\d{2}:\d{2}$/),
      end_time:      z.string().regex(/^\d{2}:\d{2}$/),
      slot_duration: z.number().int().min(15).max(240).default(60),
      break_start:   z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
      break_end:     z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    })
    const bodySchema = z.object({ availability: z.array(daySchema) })
    const body = bodySchema.parse(request.body)

    await query('DELETE FROM availability WHERE nutritionist_id = $1', [id])

    if (body.availability.length > 0) {
      const values = body.availability.map((d, i) => {
        const base = i * 7
        return `($1, $${base+2}, $${base+3}, $${base+4}, $${base+5}, $${base+6}, $${base+7}, $${base+8})`
      }).join(', ')

      const params: any[] = [id]
      for (const d of body.availability) {
        params.push(
          d.day_of_week, d.start_time, d.end_time, d.slot_duration, d.is_active,
          d.break_start ?? null, d.break_end ?? null
        )
      }

      await query(
        `INSERT INTO availability (nutritionist_id, day_of_week, start_time, end_time, slot_duration, is_active, break_start, break_end)
         VALUES ${values}`,
        params
      )
    }

    return reply.send({ ok: true })
  })

  // ── Datas bloqueadas ────────────────────────────────────────────────────────

  // GET /api/availability/blocked — lista datas bloqueadas (mês atual e futuras)
  app.get('/blocked', auth, async (request, reply) => {
    const { id } = (request as any).user
    const rows = await query<any>(
      `SELECT id, blocked_date, reason FROM blocked_dates
       WHERE nutritionist_id = $1 AND blocked_date >= date_trunc('month', NOW())
       ORDER BY blocked_date`,
      [id]
    )
    return reply.send({ blocked: rows })
  })

  // POST /api/availability/blocked — adiciona data bloqueada
  app.post('/blocked', auth, async (request, reply) => {
    const { id } = (request as any).user
    const body = z.object({
      blocked_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      reason:       z.string().optional(),
    }).parse(request.body)

    const [row] = await query<any>(
      `INSERT INTO blocked_dates (nutritionist_id, blocked_date, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (nutritionist_id, blocked_date) DO UPDATE SET reason = $3
       RETURNING id, blocked_date, reason`,
      [id, body.blocked_date, body.reason ?? null]
    )
    return reply.send({ blocked: row })
  })

  // DELETE /api/availability/blocked/:date — remove data bloqueada
  app.delete('/blocked/:date', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { date } = request.params as any
    await query(
      `DELETE FROM blocked_dates WHERE nutritionist_id = $1 AND blocked_date = $2`,
      [id, date]
    )
    return reply.send({ ok: true })
  })
}
