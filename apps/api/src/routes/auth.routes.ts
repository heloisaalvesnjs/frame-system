import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { query, queryOne } from '../db'

export async function authRoutes(app: FastifyInstance) {

  // ── POST /api/auth/register (nutricionista) ────────────────────────────────
  app.post('/register', async (request, reply) => {
    const schema = z.object({
      name:     z.string().min(2),
      email:    z.string().email(),
      password: z.string().min(6),
      phone:    z.string().optional()
    })

    const body = schema.parse(request.body)
    const hash = await bcrypt.hash(body.password, 10)

    const existing = await queryOne('SELECT id FROM nutritionists WHERE email = $1', [body.email])
    if (existing) return reply.code(409).send({ error: 'E-mail já cadastrado' })

    // New registrations start as 'pending' (must be approved by master)
    const [nutritionist] = await query(
      `INSERT INTO nutritionists (name, email, password_hash, phone, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, name, email, phone, plan, status, created_at`,
      [body.name, body.email, hash, body.phone ?? null]
    )

    return reply.code(201).send({
      nutritionist,
      message: 'Cadastro recebido. Aguardando aprovação do administrador.',
      pending: true,
    })
  })

  // ── POST /api/auth/login (nutricionista) ───────────────────────────────────
  app.post('/login', async (request, reply) => {
    const schema = z.object({ email: z.string().email(), password: z.string() })
    const body = schema.parse(request.body)

    const nutritionist = await queryOne<any>(
      `SELECT * FROM nutritionists WHERE email = $1 AND is_active = true`,
      [body.email]
    )

    if (!nutritionist) return reply.code(401).send({ error: 'Credenciais inválidas' })

    const valid = await bcrypt.compare(body.password, nutritionist.password_hash)
    if (!valid) return reply.code(401).send({ error: 'Credenciais inválidas' })

    // Check approval status
    if (nutritionist.status === 'pending') {
      return reply.code(403).send({ error: 'Cadastro aguardando aprovação do administrador.' })
    }
    if (nutritionist.status === 'suspended') {
      return reply.code(403).send({ error: 'Conta suspensa. Entre em contato com o suporte.' })
    }

    const token = app.jwt.sign(
      { id: nutritionist.id, email: nutritionist.email, role: 'nutritionist', is_master: !!nutritionist.is_master },
      { expiresIn: '30d' }
    )

    const { password_hash, ...safe } = nutritionist
    return reply.send({ token, nutritionist: safe })
  })

  // ── GET /api/auth/me ───────────────────────────────────────────────────────
  app.get('/me', { onRequest: [(app as any).authenticate] }, async (request, reply) => {
    const { id } = (request as any).user
    const nutritionist = await queryOne(
      `SELECT id, name, email, phone, specialty, bio, avatar_url, plan, status, is_master, created_at
       FROM nutritionists WHERE id = $1`,
      [id]
    )
    if (!nutritionist) return reply.code(404).send({ error: 'Usuário não encontrado' })
    return reply.send({ nutritionist })
  })
}
