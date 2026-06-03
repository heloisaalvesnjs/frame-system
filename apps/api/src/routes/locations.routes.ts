import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, queryOne } from '../db'

export async function locationsRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // GET /api/locations
  app.get('/', auth, async (request, reply) => {
    const { id } = (request as any).user
    const rows = await query(
      `SELECT id, name, city, address, color, sort_order
       FROM locations WHERE nutritionist_id = $1 AND is_active = true
       ORDER BY sort_order, created_at`,
      [id]
    )
    return reply.send({ locations: rows })
  })

  // POST /api/locations
  app.post('/', auth, async (request, reply) => {
    const { id } = (request as any).user
    const schema = z.object({
      name:    z.string().min(1).max(100),
      city:    z.string().optional(),
      address: z.string().optional(),
      color:   z.string().default('#6366f1'),
    })
    const body = schema.parse(request.body)
    const [loc] = await query(
      `INSERT INTO locations (nutritionist_id, name, city, address, color)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, name, city, address, color, sort_order`,
      [id, body.name, body.city ?? null, body.address ?? null, body.color]
    )
    return reply.code(201).send({ location: loc })
  })

  // PUT /api/locations/:locationId
  app.put('/:locationId', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { locationId } = request.params as any
    const schema = z.object({
      name:    z.string().min(1).max(100).optional(),
      city:    z.string().nullish(),
      address: z.string().nullish(),
      color:   z.string().optional(),
    })
    const body = schema.parse(request.body)
    const [loc] = await query(
      `UPDATE locations SET
         name    = COALESCE($3, name),
         city    = COALESCE($4, city),
         address = COALESCE($5, address),
         color   = COALESCE($6, color)
       WHERE id = $1 AND nutritionist_id = $2
       RETURNING id, name, city, address, color, sort_order`,
      [locationId, id, body.name, body.city, body.address, body.color]
    )
    if (!loc) return reply.code(404).send({ error: 'Local não encontrado' })
    return reply.send({ location: loc })
  })

  // DELETE /api/locations/:locationId
  app.delete('/:locationId', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { locationId } = request.params as any
    await query('UPDATE locations SET is_active = false WHERE id = $1 AND nutritionist_id = $2', [locationId, id])
    return reply.send({ ok: true })
  })

  // ── Calendar Blocks ───────────────────────────────────────────────

  // GET /api/locations/blocks?start=&end=
  app.get('/blocks', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { start, end } = request.query as any
    let sql = `SELECT id, starts_at, ends_at, reason FROM calendar_blocks
               WHERE nutritionist_id = $1`
    const params: any[] = [id]
    if (start) { params.push(start); sql += ` AND ends_at >= $${params.length}` }
    if (end)   { params.push(end);   sql += ` AND starts_at <= $${params.length}` }
    sql += ' ORDER BY starts_at'
    const rows = await query(sql, params)
    return reply.send({ blocks: rows })
  })

  // POST /api/locations/blocks
  app.post('/blocks', auth, async (request, reply) => {
    const { id } = (request as any).user
    const schema = z.object({
      starts_at: z.string(),
      ends_at:   z.string(),
      reason:    z.string().optional(),
    })
    const body = schema.parse(request.body)
    const [block] = await query(
      `INSERT INTO calendar_blocks (nutritionist_id, starts_at, ends_at, reason)
       VALUES ($1,$2,$3,$4) RETURNING id, starts_at, ends_at, reason`,
      [id, body.starts_at, body.ends_at, body.reason ?? null]
    )
    return reply.code(201).send({ block })
  })

  // DELETE /api/locations/blocks/:blockId
  app.delete('/blocks/:blockId', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { blockId } = request.params as any
    await query('DELETE FROM calendar_blocks WHERE id = $1 AND nutritionist_id = $2', [blockId, id])
    return reply.send({ ok: true })
  })
}
