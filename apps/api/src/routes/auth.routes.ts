import { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import { query, queryOne } from '../db'
import { sendPasswordResetEmail } from '../services/email.service'

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

  // ── POST /api/auth/forgot-password ────────────────────────────────────────
  app.post('/forgot-password', async (request, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.body)

    // Always return 200 to avoid e-mail enumeration
    const nutri = await queryOne<any>(
      `SELECT id, name, email FROM nutritionists WHERE email = $1 AND is_active = true`,
      [email]
    )
    if (!nutri) return reply.send({ ok: true })

    // Invalidate any previous tokens
    await query(
      `UPDATE password_reset_tokens SET used_at = NOW() WHERE nutritionist_id = $1 AND used_at IS NULL`,
      [nutri.id]
    )

    const token     = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await query(
      `INSERT INTO password_reset_tokens (nutritionist_id, token, expires_at) VALUES ($1, $2, $3)`,
      [nutri.id, token, expiresAt]
    )

    await sendPasswordResetEmail(nutri.email, nutri.name, token)

    return reply.send({ ok: true })
  })

  // ── POST /api/auth/reset-password ─────────────────────────────────────────
  app.post('/reset-password', async (request, reply) => {
    const { token, password } = z.object({
      token:    z.string().min(1),
      password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    }).parse(request.body)

    const row = await queryOne<any>(
      `SELECT prt.id, prt.nutritionist_id, prt.expires_at, prt.used_at
       FROM password_reset_tokens prt
       WHERE prt.token = $1`,
      [token]
    )

    if (!row)                                   return reply.code(400).send({ error: 'Token inválido.' })
    if (row.used_at)                            return reply.code(400).send({ error: 'Este link já foi utilizado.' })
    if (new Date(row.expires_at) < new Date())  return reply.code(400).send({ error: 'Link expirado. Solicite um novo.' })

    const hash = await bcrypt.hash(password, 10)

    await query(`UPDATE nutritionists SET password_hash = $1 WHERE id = $2`, [hash, row.nutritionist_id])
    await query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, [row.id])

    return reply.send({ ok: true })
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
