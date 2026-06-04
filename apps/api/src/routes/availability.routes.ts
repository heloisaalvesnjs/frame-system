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
      `SELECT day_of_week, start_time, end_time, slot_duration, is_active
       FROM availability WHERE nutritionist_id = $1 ORDER BY day_of_week`,
      [id]
    )

    // Retorna sempre os 7 dias (preenche ausentes com padrão)
    const days = Array.from({ length: 7 }, (_, i) => {
      const found = rows.find((r: any) => r.day_of_week === i)
      return {
        day_of_week:    i,
        label:          DAY_LABELS[i],
        is_active:      found?.is_active ?? false,
        start_time:     found?.start_time?.slice(0, 5) ?? '08:00',
        end_time:       found?.end_time?.slice(0, 5) ?? '18:00',
        slot_duration:  found?.slot_duration ?? 60,
      }
    })

    return reply.send({ availability: days })
  })

  // PUT /api/availability — salva todos os dias de uma vez (upsert)
  app.put('/', auth, async (request, reply) => {
    const { id } = (request as any).user

    const daySchema = z.object({
      day_of_week:   z.number().int().min(0).max(6),
      is_active:     z.boolean(),
      start_time:    z.string().regex(/^\d{2}:\d{2}$/),
      end_time:      z.string().regex(/^\d{2}:\d{2}$/),
      slot_duration: z.number().int().min(15).max(240).default(60),
    })
    const bodySchema = z.object({ availability: z.array(daySchema) })
    const body = bodySchema.parse(request.body)

    // Deleta e reinsere (mais simples que upsert com múltiplos parâmetros)
    await query('DELETE FROM availability WHERE nutritionist_id = $1', [id])

    if (body.availability.length > 0) {
      const values = body.availability.map((d, i) => {
        const base = i * 5
        return `($1, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`
      }).join(', ')

      const params: any[] = [id]
      for (const d of body.availability) {
        params.push(d.day_of_week, d.start_time, d.end_time, d.slot_duration, d.is_active)
      }

      await query(
        `INSERT INTO availability (nutritionist_id, day_of_week, start_time, end_time, slot_duration, is_active)
         VALUES ${values}`,
        params
      )
    }

    return reply.send({ ok: true })
  })
}
