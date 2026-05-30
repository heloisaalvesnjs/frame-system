import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, queryOne } from '../db'

export async function clientRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // GET /api/clients — lista todos os clientes com resumo
  app.get('/', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { search } = request.query as Record<string, string>

    let sql = `
      SELECT
        cl.id,
        cl.name,
        cl.phone,
        cl.goal,
        cl.notes,
        cl.birthdate::text AS birthdate,
        cl.gender,
        cl.height_cm::text AS height_cm,
        cl.created_at,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status != 'cancelled')::INT  AS appointment_count,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed')::INT   AS completed_count,
        MAX(conv.last_message_at)                                          AS last_contact
      FROM clients cl
      LEFT JOIN appointments a    ON a.client_id       = cl.id
      LEFT JOIN conversations conv
        ON conv.client_phone    = cl.phone
       AND conv.nutritionist_id = cl.nutritionist_id
      WHERE cl.nutritionist_id = $1
    `
    const params: unknown[] = [id]

    if (search) {
      params.push(`%${search}%`)
      sql += ` AND (cl.name ILIKE $${params.length} OR cl.phone LIKE $${params.length})`
    }

    sql += ' GROUP BY cl.id ORDER BY last_contact DESC NULLS LAST'

    const clients = await query(sql, params)
    return reply.send({ clients })
  })

  // POST /api/clients — cadastrar cliente manualmente
  app.post('/', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const body = request.body as any
    const { name, phone, email, goal, notes, birthdate, gender, height_cm } = body

    if (!phone?.trim()) return reply.code(400).send({ error: 'Telefone é obrigatório' })

    const existing = await queryOne<any>(
      'SELECT id FROM clients WHERE nutritionist_id = $1 AND phone = $2',
      [nutritionistId, phone.trim()]
    )
    if (existing) return reply.code(409).send({ error: 'Já existe um cliente com esse telefone' })

    const client = await queryOne<any>(
      `INSERT INTO clients (nutritionist_id, name, phone, email, goal, notes, birthdate, gender, height_cm)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        nutritionistId,
        name?.trim()    || null,
        phone.trim(),
        email?.trim()   || null,
        goal?.trim()    || null,
        notes?.trim()   || null,
        birthdate       || null,
        gender?.trim()  || null,
        height_cm       ? Number(height_cm) : null,
      ]
    )
    return reply.code(201).send({ client })
  })

  // PUT /api/clients/:clientId — atualiza dados do cliente
  app.put('/:clientId', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as any
    const schema = z.object({
      name:      z.string().optional(),
      email:     z.string().email().optional().or(z.literal('')),
      goal:      z.string().optional(),
      notes:     z.string().optional(),
      birthdate: z.string().optional(),
      gender:    z.string().optional(),
      height_cm: z.number().optional(),
    })
    const body = schema.parse(request.body)

    const [client] = await query(
      `UPDATE clients SET
         name      = COALESCE($3, name),
         email     = COALESCE(NULLIF($4,''), email),
         goal      = COALESCE($5, goal),
         notes     = COALESCE($6, notes),
         birthdate = COALESCE($7, birthdate),
         gender    = COALESCE($8, gender),
         height_cm = COALESCE($9, height_cm),
         updated_at = NOW()
       WHERE id = $1 AND nutritionist_id = $2
       RETURNING *, birthdate::text AS birthdate, height_cm::text AS height_cm`,
      [clientId, nutritionistId, body.name, body.email, body.goal,
       body.notes, body.birthdate, body.gender, body.height_cm]
    )
    if (!client) return reply.code(404).send({ error: 'Cliente não encontrado' })
    return reply.send({ client })
  })

  // POST /api/clients/import — importação em massa via CSV
  app.post('/import', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const body = request.body as { csv: string }
    if (!body.csv?.trim()) return reply.code(400).send({ error: 'CSV vazio' })

    const lines = body.csv.trim().split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return reply.code(400).send({ error: 'CSV precisa de cabeçalho + ao menos 1 linha' })

    // Detecta separador (vírgula ou ponto-e-vírgula)
    const sep = lines[0].includes(';') ? ';' : ','
    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/['"]/g, ''))

    const colIndex = (names: string[]) => names.map(n => headers.indexOf(n)).find(i => i >= 0) ?? -1

    const iName      = colIndex(['nome', 'name'])
    const iPhone     = colIndex(['telefone', 'phone', 'fone', 'celular', 'whatsapp'])
    const iEmail     = colIndex(['email', 'e-mail'])
    const iGoal      = colIndex(['objetivo', 'goal'])
    const iGender    = colIndex(['sexo', 'genero', 'gênero', 'gender'])
    const iHeight    = colIndex(['altura', 'height', 'height_cm'])
    const iBirthdate = colIndex(['nascimento', 'data_nascimento', 'birthdate'])

    if (iPhone < 0) return reply.code(400).send({ error: 'Coluna de telefone não encontrada (use: telefone, phone, celular ou whatsapp)' })

    let imported = 0
    let skipped  = 0
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map(c => c.trim().replace(/^["']|["']$/g, ''))
      const phone = cols[iPhone]?.trim()
      if (!phone) { skipped++; continue }

      try {
        const existing = await queryOne<any>(
          'SELECT id FROM clients WHERE nutritionist_id = $1 AND phone = $2',
          [nutritionistId, phone]
        )
        if (existing) { skipped++; continue }

        await query(
          `INSERT INTO clients (nutritionist_id, name, phone, email, goal, gender, height_cm, birthdate)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (nutritionist_id, phone) DO NOTHING`,
          [
            nutritionistId,
            iName  >= 0 ? cols[iName]  || null : null,
            phone,
            iEmail >= 0 ? cols[iEmail] || null : null,
            iGoal  >= 0 ? cols[iGoal]  || null : null,
            iGender    >= 0 ? cols[iGender]    || null : null,
            iHeight    >= 0 && cols[iHeight] ? Number(cols[iHeight].replace(',', '.')) : null,
            iBirthdate >= 0 ? cols[iBirthdate] || null : null,
          ]
        )
        imported++
      } catch (err: any) {
        errors.push(`Linha ${i + 1}: ${err.message}`)
      }
    }

    return reply.send({ ok: true, imported, skipped, errors: errors.slice(0, 10) })
  })

  // GET /api/clients/:clientId — perfil completo do cliente
  app.get('/:clientId', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }

    const client = await queryOne<any>(
      `SELECT *, birthdate::text AS birthdate FROM clients WHERE id = $1 AND nutritionist_id = $2`,
      [clientId, nutritionistId]
    )
    if (!client) return reply.code(404).send({ error: 'Cliente não encontrado' })

    const appointments = await query(
      `SELECT a.id, a.scheduled_at, a.duration, a.modality, a.status, a.notes, a.created_by, a.created_at
       FROM appointments a
       WHERE a.client_id = $1
       ORDER BY a.scheduled_at DESC`,
      [clientId]
    )

    const conversations = await query(
      `SELECT
          c.id, c.status, c.created_at, c.last_message_at,
          COUNT(m.id)::INT AS message_count
       FROM conversations c
       LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.client_phone = $1 AND c.nutritionist_id = $2
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [client.phone, nutritionistId]
    )

    return reply.send({ client, appointments, conversations })
  })

  // GET /api/clients/:clientId/tracking — dados de tracking do paciente (para a nutri)
  app.get('/:clientId/tracking', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }

    // Verify ownership
    const client = await queryOne<{ id: string }>(
      `SELECT id FROM clients WHERE id = $1 AND nutritionist_id = $2`,
      [clientId, nutritionistId]
    )
    if (!client) return reply.code(404).send({ error: 'Cliente não encontrado' })

    // Weight history (last 60)
    const weightLogs = await query<any>(
      `SELECT id, weight_kg::text, waist_cm::text, hip_cm::text, notes, logged_at::text
       FROM weight_logs WHERE client_id = $1 ORDER BY logged_at DESC LIMIT 60`,
      [clientId]
    )

    // Check-ins (last 12 weeks)
    const checkins = await query<any>(
      `SELECT id, week_start::text, hunger_score, energy_score, sleep_score, mood_score, notes, created_at
       FROM weekly_checkins WHERE client_id = $1 ORDER BY week_start DESC LIMIT 12`,
      [clientId]
    )

    // Activity logs (last 30)
    const activityLogs = await query<any>(
      `SELECT id, activity_type, duration_minutes, notes, logged_at::text
       FROM activity_logs WHERE client_id = $1 ORDER BY logged_at DESC LIMIT 30`,
      [clientId]
    )

    // Water stats: last 7 days
    const waterStats = await query<any>(
      `SELECT logged_at::text, SUM(amount_ml)::int AS total_ml
       FROM water_logs
       WHERE client_id = $1 AND logged_at >= CURRENT_DATE - INTERVAL '6 days'
       GROUP BY logged_at ORDER BY logged_at DESC`,
      [clientId]
    )

    return reply.send({ weightLogs, checkins, activityLogs, waterStats })
  })

  // PATCH /api/clients/:clientId — atualiza dados do paciente
  app.patch('/:clientId', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }

    const schema = z.object({
      name:      z.string().min(1).optional(),
      goal:      z.string().optional(),
      notes:     z.string().optional(),
      birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    })
    const body = schema.parse(request.body)

    const [updated] = await query(
      `UPDATE clients SET
         name      = COALESCE($3, name),
         goal      = COALESCE($4, goal),
         notes     = COALESCE($5, notes),
         birthdate = COALESCE($6::DATE, birthdate),
         updated_at = NOW()
       WHERE id = $1 AND nutritionist_id = $2
       RETURNING *`,
      [clientId, nutritionistId, body.name, body.goal, body.notes, body.birthdate ?? null]
    )
    if (!updated) return reply.code(404).send({ error: 'Cliente não encontrado' })
    return reply.send(updated)
  })
}
