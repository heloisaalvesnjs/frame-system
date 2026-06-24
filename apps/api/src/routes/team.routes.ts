import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { query, queryOne } from '../db'

export async function teamRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // GET /api/team — lista membros da equipe
  app.get('/', auth, async (request, reply) => {
    const { id } = (request as any).user
    const apiBase = process.env.NEXT_PUBLIC_API_URL || process.env.APP_BASE_URL || ''

    const members = await query<any>(
      `SELECT id, name, email, role, status, created_at, invite_token
       FROM team_members
       WHERE nutritionist_id = $1
       ORDER BY created_at DESC`,
      [id]
    )

    // Adiciona link de convite para membros pendentes
    const result = members.map((m: any) => ({
      ...m,
      invite_link: m.status === 'pending' ? `${apiBase}/convite/${m.invite_token}` : undefined,
      invite_token: undefined, // não expor o token diretamente
    }))

    return reply.send({ members: result })
  })

  // POST /api/team/invite — cria convite para novo membro
  app.post('/invite', auth, async (request, reply) => {
    const { id } = (request as any).user
    const schema = z.object({
      email: z.string().email(),
      role:  z.enum(['admin', 'receptionist', 'viewer']).default('receptionist'),
    })
    const body = schema.parse(request.body)

    // Verifica se já existe
    const existing = await queryOne<any>(
      'SELECT id FROM team_members WHERE nutritionist_id = $1 AND email = $2',
      [id, body.email]
    )
    if (existing) return reply.code(409).send({ error: 'Este e-mail já foi convidado.' })

    const [member] = await query<any>(
      `INSERT INTO team_members (nutritionist_id, email, role, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id, email, role, status, invite_token, created_at`,
      [id, body.email, body.role]
    )

    const apiBase = process.env.APP_BASE_URL || ''
    return reply.code(201).send({
      member: {
        ...member,
        invite_link: `${apiBase}/convite/${member.invite_token}`,
        invite_token: undefined,
      }
    })
  })

  // DELETE /api/team/:memberId — remove membro
  app.delete('/:memberId', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { memberId } = request.params as { memberId: string }

    await query(
      'DELETE FROM team_members WHERE id = $1 AND nutritionist_id = $2',
      [memberId, id]
    )
    return reply.send({ ok: true })
  })

  // PATCH /api/team/:memberId/role — altera role
  app.patch('/:memberId/role', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { memberId } = request.params as { memberId: string }
    const { role } = z.object({ role: z.enum(['admin', 'receptionist', 'viewer']) }).parse(request.body)

    await query(
      'UPDATE team_members SET role = $1 WHERE id = $2 AND nutritionist_id = $3',
      [role, memberId, id]
    )
    return reply.send({ ok: true })
  })

  // ── Rotas públicas (sem auth) ─────────────────────────────────

  // GET /api/team/join/:token — info do convite (página pública)
  app.get('/join/:token', async (request, reply) => {
    const { token } = request.params as { token: string }

    const member = await queryOne<any>(
      `SELECT tm.id, tm.email, tm.role, tm.status,
              n.name AS nutritionist_name
       FROM team_members tm
       JOIN nutritionists n ON n.id = tm.nutritionist_id
       WHERE tm.invite_token = $1 AND tm.status = 'pending'`,
      [token]
    )

    if (!member) return reply.code(404).send({ error: 'Convite inválido ou já usado.' })
    return reply.send({ member })
  })

  // POST /api/team/join/:token — aceita convite e cria conta
  app.post('/join/:token', async (request, reply) => {
    const { token } = request.params as { token: string }
    const schema = z.object({
      name:     z.string().min(2),
      password: z.string().min(6),
    })
    const body = schema.parse(request.body)

    const member = await queryOne<any>(
      `SELECT tm.id, tm.email, tm.role, tm.nutritionist_id,
              n.name AS nutritionist_name
       FROM team_members tm
       JOIN nutritionists n ON n.id = tm.nutritionist_id
       WHERE tm.invite_token = $1 AND tm.status = 'pending'`,
      [token]
    )
    if (!member) return reply.code(404).send({ error: 'Convite inválido ou já usado.' })

    const hash = await bcrypt.hash(body.password, 10)

    // Ativa o membro
    await query(
      `UPDATE team_members
       SET name = $1, password_hash = $2, status = 'active', updated_at = NOW()
       WHERE id = $3`,
      [body.name, hash, member.id]
    )

    // Gera JWT que faz o colaborador operar como o dono
    const token_jwt = (app as any).jwt.sign({
      id:              member.nutritionist_id,  // usa o ID do dono para todas as queries
      team_member_id:  member.id,
      team_member_name: body.name,
      role:            member.role,
      is_team_member:  true,
    })

    return reply.send({
      token: token_jwt,
      name:  body.name,
      role:  member.role,
      nutritionist_name: member.nutritionist_name,
    })
  })

  // POST /api/team/forgot-password — gera token de reset (público)
  app.post('/forgot-password', async (request, reply) => {
    const { email } = z.object({ email: z.string().email() }).parse(request.body)

    const member = await queryOne<any>(
      `SELECT id FROM team_members WHERE email = $1 AND status = 'active'`,
      [email]
    )

    // Sempre retorna 200 para não revelar se o e-mail existe
    if (!member) return reply.send({ ok: true })

    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    await query(
      `UPDATE team_members SET reset_token = $1, reset_expires = $2 WHERE id = $3`,
      [token, expires, member.id]
    )

    const baseUrl = process.env.APP_BASE_URL || process.env.DASHBOARD_URL || 'https://app.framesystem.com.br'
    const resetUrl = `${baseUrl}/redefinir-senha-equipe?token=${token}`

    // Tenta enviar email se Resend estiver configurado
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: 'Frame System <noreply@framesystem.com.br>',
        to: email,
        subject: 'Redefinir senha — Frame System',
        html: `<p>Clique no link abaixo para redefinir sua senha (válido por 1 hora):</p>
               <p><a href="${resetUrl}">${resetUrl}</a></p>`,
      })
    } catch (_) {}

    return reply.send({ ok: true })
  })

  // POST /api/team/reset-password — redefine senha com token (público)
  app.post('/reset-password', async (request, reply) => {
    const body = z.object({
      token:    z.string().min(1),
      password: z.string().min(6),
    }).parse(request.body)

    const member = await queryOne<any>(
      `SELECT id FROM team_members WHERE reset_token = $1 AND reset_expires > NOW()`,
      [body.token]
    )
    if (!member) return reply.code(400).send({ error: 'Link inválido ou expirado.' })

    const hash = await bcrypt.hash(body.password, 10)
    await query(
      `UPDATE team_members SET password_hash = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2`,
      [hash, member.id]
    )
    return reply.send({ ok: true })
  })

  // POST /api/team/login — login de colaborador (e-mail + senha)
  app.post('/login', async (request, reply) => {
    const schema = z.object({ email: z.string().email(), password: z.string() })
    const body = schema.parse(request.body)

    const member = await queryOne<any>(
      `SELECT tm.id, tm.name, tm.email, tm.role, tm.password_hash, tm.nutritionist_id,
              n.name AS nutritionist_name
       FROM team_members tm
       JOIN nutritionists n ON n.id = tm.nutritionist_id
       WHERE tm.email = $1 AND tm.status = 'active'`,
      [body.email]
    )
    if (!member) return reply.code(401).send({ error: 'Credenciais inválidas' })

    const valid = await bcrypt.compare(body.password, member.password_hash)
    if (!valid) return reply.code(401).send({ error: 'Credenciais inválidas' })

    const token_jwt = (app as any).jwt.sign({
      id:              member.nutritionist_id,
      team_member_id:  member.id,
      team_member_name: member.name,
      role:            member.role,
      is_team_member:  true,
    })

    return reply.send({
      token: token_jwt,
      name:  member.name,
      role:  member.role,
      nutritionist_name: member.nutritionist_name,
    })
  })
}
