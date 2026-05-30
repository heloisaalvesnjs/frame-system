import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, queryOne } from '../db'

export async function servicesRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // GET /api/services — lista serviços do consultório
  app.get('/', auth, async (request, reply) => {
    const { id } = (request as any).user
    const services = await query(
      `SELECT id, name, category, price, description, is_active, sort_order
       FROM services WHERE nutritionist_id = $1 AND is_active = true
       ORDER BY sort_order, created_at`,
      [id]
    )
    return reply.send({ services })
  })

  // POST /api/services — cria serviço
  app.post('/', auth, async (request, reply) => {
    const { id } = (request as any).user
    const schema = z.object({
      name:        z.string().min(1).max(100),
      category:    z.string().default('Consulta'),
      price:       z.string().optional(),
      description: z.string().optional(),
    })
    const body = schema.parse(request.body)

    const [service] = await query(
      `INSERT INTO services (nutritionist_id, name, category, price, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, category, price, description, is_active, sort_order`,
      [id, body.name, body.category, body.price ?? null, body.description ?? null]
    )
    return reply.code(201).send({ service })
  })

  // PUT /api/services/:serviceId — atualiza serviço
  app.put('/:serviceId', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { serviceId } = request.params as any
    const schema = z.object({
      name:        z.string().min(1).max(100).optional(),
      category:    z.string().optional(),
      price:       z.string().optional(),
      description: z.string().optional(),
    })
    const body = schema.parse(request.body)

    const [service] = await query(
      `UPDATE services SET
         name        = COALESCE($3, name),
         category    = COALESCE($4, category),
         price       = COALESCE($5, price),
         description = COALESCE($6, description)
       WHERE id = $1 AND nutritionist_id = $2
       RETURNING id, name, category, price, description, is_active, sort_order`,
      [serviceId, id, body.name, body.category, body.price, body.description]
    )
    if (!service) return reply.code(404).send({ error: 'Serviço não encontrado' })
    return reply.send({ service })
  })

  // DELETE /api/services/:serviceId — remove serviço
  app.delete('/:serviceId', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { serviceId } = request.params as any
    await query(
      'UPDATE services SET is_active = false WHERE id = $1 AND nutritionist_id = $2',
      [serviceId, id]
    )
    return reply.send({ ok: true })
  })

  // PUT /api/services/reorder — reordena serviços
  app.put('/reorder', auth, async (request, reply) => {
    const { id } = (request as any).user
    const schema = z.object({ ids: z.array(z.string().uuid()) })
    const { ids } = schema.parse(request.body)

    await Promise.all(
      ids.map((serviceId, index) =>
        query(
          'UPDATE services SET sort_order = $3 WHERE id = $1 AND nutritionist_id = $2',
          [serviceId, id, index]
        )
      )
    )
    return reply.send({ ok: true })
  })
}
