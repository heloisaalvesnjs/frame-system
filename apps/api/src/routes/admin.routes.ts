import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, queryOne } from '../db'
import { sendApprovalEmail } from '../services/email.service'

// Middleware: apenas conta mestre
async function authenticateMaster(request: any, reply: any) {
  try {
    await request.jwtVerify()
    if (!request.user.is_master) {
      return reply.code(403).send({ error: 'Acesso restrito ao administrador' })
    }
  } catch {
    return reply.code(401).send({ error: 'Token inválido' })
  }
}

export async function adminRoutes(app: FastifyInstance) {
  const auth = { onRequest: [authenticateMaster] }

  // GET /api/admin/nutritionists — lista todos (com filtro por status)
  app.get('/nutritionists', auth, async (request, reply) => {
    const { status } = request.query as Record<string, string>
    let sql = `SELECT id, name, email, phone, plan, status, is_master, is_active, created_at FROM nutritionists`
    const params: unknown[] = []
    if (status) {
      params.push(status)
      sql += ` WHERE status = $1`
    }
    sql += ` ORDER BY created_at DESC`
    const rows = await query(sql, params)
    return reply.send({ nutritionists: rows })
  })

  // PATCH /api/admin/nutritionists/:id/status — aprovar | suspender | reativar
  app.patch('/nutritionists/:id/status', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({ status: z.enum(['active', 'suspended', 'pending']) })
    const { status } = schema.parse(request.body)

    const [updated] = await query(
      `UPDATE nutritionists SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, status`,
      [status, id]
    )
    if (!updated) return reply.code(404).send({ error: 'Nutricionista não encontrada' })

    // Envia e-mail de aprovação quando conta é ativada
    if (status === 'active') {
      sendApprovalEmail(updated.email, updated.name).catch(err =>
        console.error('[admin] Erro ao enviar e-mail de aprovação:', err)
      )
    }

    return reply.send({ nutritionist: updated })
  })

  // PATCH /api/admin/nutritionists/:id/master — promover/despromover conta mestre
  app.patch('/nutritionists/:id/master', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({ is_master: z.boolean() })
    const { is_master } = schema.parse(request.body)

    const [updated] = await query(
      `UPDATE nutritionists SET is_master = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, is_master`,
      [is_master, id]
    )
    if (!updated) return reply.code(404).send({ error: 'Nutricionista não encontrada' })
    return reply.send({ nutritionist: updated })
  })

  // GET /api/admin/stats — resumo geral
  app.get('/stats', auth, async (_request, reply) => {
    const [stats] = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active')::int  AS active_nutritionists,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_nutritionists,
        (SELECT COUNT(*)::int FROM patient_accounts)    AS total_patients,
        (SELECT COUNT(*)::int FROM clients)             AS total_clients
      FROM nutritionists
    `, [])
    return reply.send({ stats })
  })
}
