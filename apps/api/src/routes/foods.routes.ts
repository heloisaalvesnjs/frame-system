import { FastifyInstance } from 'fastify'
import { searchFoods, getSubstitutions, calcMacros, UNIT_WEIGHTS } from '../data/taco'

export async function foodsRoutes(app: FastifyInstance) {

  /**
   * GET /api/foods/search?q=frango&limit=10
   * Público — busca alimentos da tabela TACO
   */
  app.get('/search', async (request, reply) => {
    const { q = '', limit = '12' } = request.query as { q?: string; limit?: string }
    const foods = searchFoods(q, parseInt(limit, 10))
    return reply.send({ foods })
  })

  /**
   * GET /api/foods/units
   * Retorna unidades de medida disponíveis com pesos
   */
  app.get('/units', async (_request, reply) => {
    return reply.send({ units: UNIT_WEIGHTS })
  })

  /**
   * GET /api/foods/:id
   * Retorna um alimento pelo ID TACO
   */
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { TACO } = await import('../data/taco')
    const food = TACO.find(f => f.id === parseInt(id, 10))
    if (!food) return reply.code(404).send({ error: 'Alimento não encontrado' })
    return reply.send({ food })
  })

  /**
   * GET /api/foods/:id/substitutions
   * Retorna substituições nutricionalmente similares
   */
  app.get('/:id/substitutions', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { limit = '5' } = request.query as { limit?: string }
    const subs = getSubstitutions(parseInt(id, 10), parseInt(limit, 10))
    return reply.send({ substitutions: subs })
  })

  /**
   * POST /api/foods/macros
   * Calcula macros para uma lista de itens
   * Body: { items: Array<{ food_id, quantity, unit }> }
   */
  app.post('/macros', async (request, reply) => {
    const { items } = request.body as {
      items: Array<{ food_id: number; quantity: number; unit: string }>
    }
    const { TACO } = await import('../data/taco')
    const results = items.map(item => {
      const food = TACO.find(f => f.id === item.food_id)
      if (!food) return null
      return { food_id: item.food_id, ...calcMacros(food, item.quantity, item.unit) }
    }).filter(Boolean)
    return reply.send({ results })
  })
}
