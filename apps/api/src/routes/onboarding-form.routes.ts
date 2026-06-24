import { FastifyInstance } from 'fastify'
import { query } from '../db'

export async function onboardingFormRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // POST /api/onboarding-form — público, salva respostas do formulário
  app.post('/', async (request, reply) => {
    const body = request.body as any

    const [row] = await query<any>(
      `INSERT INTO onboarding_forms (slug, data, submitted_at)
       VALUES ($1, $2, NOW())
       RETURNING id, slug, submitted_at`,
      [body.slug ?? 'sem-slug', JSON.stringify(body)]
    )

    return reply.code(201).send({ ok: true, id: row.id })
  })

  // GET /api/onboarding-form — lista todos (qualquer usuário autenticado)
  app.get('/', auth, async (request, reply) => {
    const rows = await query<any>(
      `SELECT id, slug, data, submitted_at, processed
       FROM onboarding_forms
       ORDER BY submitted_at DESC`,
      []
    )
    return reply.send({ forms: rows })
  })

  // PATCH /api/onboarding-form/:id/processed — marca como processado
  app.patch('/:id/processed', auth, async (request, reply) => {

    const { id } = request.params as { id: string }
    await query(
      `UPDATE onboarding_forms SET processed = true WHERE id = $1`,
      [id]
    )
    return reply.send({ ok: true })
  })
}
