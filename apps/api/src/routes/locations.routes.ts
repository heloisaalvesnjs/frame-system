import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, queryOne } from '../db'

const SELECT_COLS = `id, name, city, address, color, modality, sort_order,
  price, payment_info, deposit_required, deposit_amount, confirmation_message`

export async function locationsRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // GET /api/locations
  app.get('/', auth, async (request, reply) => {
    const { id } = (request as any).user
    const rows = await query(
      `SELECT ${SELECT_COLS}
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
      name:                 z.string().min(1).max(100),
      city:                 z.string().nullish(),
      address:              z.string().nullish(),
      color:                z.string().default('#6366f1'),
      modality:             z.enum(['presencial', 'online', 'ambos']).default('presencial'),
      price:                z.string().nullish(),
      payment_info:         z.string().nullish(),
      deposit_required:     z.boolean().default(false),
      deposit_amount:       z.string().nullish(),
      confirmation_message: z.string().nullish(),
    })
    const body = schema.parse(request.body)
    const [loc] = await query(
      `INSERT INTO locations
         (nutritionist_id, name, city, address, color, modality,
          price, payment_info, deposit_required, deposit_amount, confirmation_message)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING ${SELECT_COLS}`,
      [id, body.name, body.city ?? null, body.address ?? null, body.color, body.modality,
       body.price ?? null, body.payment_info ?? null, body.deposit_required,
       body.deposit_amount ?? null, body.confirmation_message ?? null]
    )
    return reply.code(201).send({ location: loc })
  })

  // PUT /api/locations/:locationId
  app.put('/:locationId', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { locationId } = request.params as any
    const schema = z.object({
      name:                 z.string().min(1).max(100).optional(),
      city:                 z.string().nullish(),
      address:              z.string().nullish(),
      color:                z.string().optional(),
      modality:             z.enum(['presencial', 'online', 'ambos']).optional(),
      price:                z.string().nullish(),
      payment_info:         z.string().nullish(),
      deposit_required:     z.boolean().optional(),
      deposit_amount:       z.string().nullish(),
      confirmation_message: z.string().nullish(),
    })
    const body = schema.parse(request.body)
    const [loc] = await query(
      `UPDATE locations SET
         name                 = COALESCE($3,  name),
         city                 = COALESCE($4,  city),
         address              = COALESCE($5,  address),
         color                = COALESCE($6,  color),
         modality             = COALESCE($7,  modality),
         price                = $8,
         payment_info         = $9,
         deposit_required     = COALESCE($10, deposit_required),
         deposit_amount       = $11,
         confirmation_message = $12
       WHERE id = $1 AND nutritionist_id = $2
       RETURNING ${SELECT_COLS}`,
      [locationId, id,
       body.name, body.city, body.address, body.color, body.modality,
       body.price ?? null, body.payment_info ?? null,
       body.deposit_required, body.deposit_amount ?? null,
       body.confirmation_message ?? null]
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

  // ── Public: get location confirmation info (used by AI after booking) ────
  app.get('/confirmation/:nutritionistId', async (request, reply) => {
    const { nutritionistId } = request.params as any
    const { modality, city } = request.query as any
    let sql = `SELECT ${SELECT_COLS} FROM locations
               WHERE nutritionist_id = $1 AND is_active = true`
    const params: any[] = [nutritionistId]
    if (modality) { params.push(modality); sql += ` AND (modality = $${params.length} OR modality = 'ambos')` }
    if (city)     { params.push(`%${city}%`); sql += ` AND city ILIKE $${params.length}` }
    sql += ' ORDER BY sort_order LIMIT 1'
    const loc = await queryOne<any>(sql, params)
    return reply.send({ location: loc ?? null })
  })

  // ── Calendar Blocks ───────────────────────────────────────────────

  app.get('/blocks', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { start, end } = request.query as any
    let sql = `SELECT id, starts_at, ends_at, reason FROM calendar_blocks WHERE nutritionist_id = $1`
    const params: any[] = [id]
    if (start) { params.push(start); sql += ` AND ends_at >= $${params.length}` }
    if (end)   { params.push(end);   sql += ` AND starts_at <= $${params.length}` }
    sql += ' ORDER BY starts_at'
    const rows = await query(sql, params)
    return reply.send({ blocks: rows })
  })

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

  app.delete('/blocks/:blockId', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { blockId } = request.params as any
    await query('DELETE FROM calendar_blocks WHERE id = $1 AND nutritionist_id = $2', [blockId, id])
    return reply.send({ ok: true })
  })
}
