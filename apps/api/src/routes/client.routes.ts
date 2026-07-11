import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, queryOne } from '../db'
import * as XLSX from 'xlsx'

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

  // GET /api/clients/opportunities — lista clientes agrupados por estágio do funil
  app.get('/opportunities', auth, async (request, reply) => {
    const { id } = (request as any).user
    const includeLost = (request.query as any)?.include_lost === 'true'

    const opportunities = await query(
      `
      SELECT
        cl.id,
        cl.name,
        cl.phone,
        cl.goal,
        cl.stage,
        cl.source,
        cl.estimated_value::text AS estimated_value,
        cl.stage_updated_at,
        cl.created_at
      FROM clients cl
      WHERE cl.nutritionist_id = $1
        ${includeLost ? '' : `AND COALESCE(cl.stage, 'novo_contato') != 'perdido'`}
      ORDER BY cl.stage_updated_at DESC NULLS LAST
      `,
      [id]
    )
    return reply.send({ opportunities })
  })

  // PATCH /api/clients/:clientId/stage — move o cliente para outra etapa do funil
  app.patch('/:clientId/stage', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }

    const schema = z.object({
      stage: z.enum([
        'novo_contato',
        'em_atendimento',
        'qualificado',
        'avaliando',
        'agendamento_pendente',
        'consulta_marcada',
        'perdido',
      ]),
    })
    const { stage } = schema.parse(request.body)

    const client = await queryOne<any>(
      `UPDATE clients
       SET stage = $1, stage_updated_at = NOW()
       WHERE id = $2 AND nutritionist_id = $3
       RETURNING id, name, stage, stage_updated_at`,
      [stage, clientId, nutritionistId]
    )

    if (!client) return reply.code(404).send({ error: 'Cliente não encontrado' })
    return reply.send({ client })
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

  // POST /api/clients/import/analyze — IA analisa CSV e sugere mapeamento de colunas
  app.post('/import/analyze', auth, async (request, reply) => {
    const body = request.body as { csv: string }
    if (!body.csv?.trim()) return reply.code(400).send({ error: 'CSV vazio' })

    const raw = body.csv.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = raw.trim().split('\n').filter(Boolean)
    if (lines.length < 2) return reply.code(400).send({ error: 'CSV precisa de cabeçalho + ao menos 1 linha' })

    const sep = lines[0].includes(';') ? ';' : ','
    const headers = lines[0].split(sep).map(h => h.trim().replace(/['"]/g, ''))

    // Pega até 3 linhas de amostra para a IA entender o conteúdo
    const sampleRows = lines.slice(1, 4).map(l => l.split(sep).map(c => c.trim().replace(/['"]/g, '')))
    const sampleText = sampleRows.map((r, i) => `Linha ${i + 2}: ${headers.map((h, j) => `${h}="${r[j] ?? ''}"`).join(', ')}`).join('\n')

    const prompt = `Analise este CSV de pacientes e mapeie cada coluna para um dos campos do sistema.

Cabeçalhos: ${headers.join(' | ')}

${sampleText}

Campos disponíveis no sistema:
- name: nome completo do paciente
- phone: telefone/celular/WhatsApp (OBRIGATÓRIO — se não existir, retorne error)
- email: e-mail
- goal: objetivo (emagrecer, ganhar massa, saúde, etc.)
- gender: sexo/gênero
- height_cm: altura em cm
- birthdate: data de nascimento
- notes: observações gerais
- (ignore): ignore esta coluna

Retorne APENAS um JSON válido no formato:
{
  "mapping": {
    "NomeExatoColuna": "campodoSistema"
  },
  "total_rows": ${lines.length - 1},
  "has_phone": true/false
}

Mapeie TODAS as colunas. Se uma coluna não corresponder a nenhum campo, use "ignore".`

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY || '')
      const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash', generationConfig: { maxOutputTokens: 500, responseMimeType: 'application/json' } })
      const result = await model.generateContent(prompt)
      const jsonText = result.response.text().trim()
      const parsed = JSON.parse(jsonText)
      return reply.send({ ok: true, headers, sample_rows: sampleRows.slice(0, 2), mapping: parsed.mapping, total_rows: parsed.total_rows, has_phone: parsed.has_phone })
    } catch {
      // Fallback: mapeamento por heurística simples
      const fieldMap: Record<string, string> = {}
      for (const h of headers) {
        const hl = h.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (['nome', 'paciente', 'name', 'cliente'].some(t => hl.includes(t)))           fieldMap[h] = 'name'
        else if (['telefone', 'celular', 'whatsapp', 'fone', 'phone', 'tel'].some(t => hl.includes(t))) fieldMap[h] = 'phone'
        else if (['email', 'mail'].some(t => hl.includes(t)))                             fieldMap[h] = 'email'
        else if (['objetivo', 'goal', 'meta'].some(t => hl.includes(t)))                  fieldMap[h] = 'goal'
        else if (['sexo', 'genero', 'gender'].some(t => hl.includes(t)))                  fieldMap[h] = 'gender'
        else if (['altura', 'height'].some(t => hl.includes(t)))                          fieldMap[h] = 'height_cm'
        else if (['nascimento', 'birthdate', 'birth'].some(t => hl.includes(t)))          fieldMap[h] = 'birthdate'
        else if (['obs', 'note', 'observ'].some(t => hl.includes(t)))                     fieldMap[h] = 'notes'
        else fieldMap[h] = 'ignore'
      }
      return reply.send({ ok: true, headers, sample_rows: sampleRows.slice(0, 2), mapping: fieldMap, total_rows: lines.length - 1, has_phone: Object.values(fieldMap).includes('phone') })
    }
  })

  // POST /api/clients/import — importação em massa via CSV
  // Aceita { csv, mapping } onde mapping = { "ColunaCsv": "campodoSistema" }
  app.post('/import', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const body = request.body as { csv: string; mapping?: Record<string, string> }
    if (!body.csv?.trim()) return reply.code(400).send({ error: 'CSV vazio' })
    const customMapping: Record<string, string> | undefined = body.mapping

    // Remove BOM (Excel UTF-8 com BOM: ﻿) e normaliza quebras de linha
    const rawCsv = body.csv
      .replace(/^﻿/, '')        // BOM UTF-8
      .replace(/\r\n/g, '\n')        // Windows CRLF
      .replace(/\r/g, '\n')          // Mac CR antigo

    const lines = rawCsv.trim().split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return reply.code(400).send({ error: 'CSV precisa de cabeçalho + ao menos 1 linha de dados' })

    // Detecta separador (ponto-e-vírgula tem precedência — padrão Excel BR)
    const sep = lines[0].includes(';') ? ';' : ','

    // Limpa headers: lowercase, sem aspas, sem BOM residual
    const headers = lines[0]
      .split(sep)
      .map(h => h.trim().toLowerCase().replace(/['"]/g, '').replace(/﻿/g, ''))

    // Correspondência exata OU se o header CONTÉM um dos termos
    const colIndex = (terms: string[]) => {
      // 1ª prioridade: match exato
      const exact = terms.map(n => headers.indexOf(n)).find(i => i >= 0)
      if (exact !== undefined) return exact
      // 2ª prioridade: header contém o termo
      for (const term of terms) {
        const idx = headers.findIndex(h => h.includes(term))
        if (idx >= 0) return idx
      }
      return -1
    }

    // Se tem mapeamento customizado (da IA), usa ele; senão faz heurística
    const findMapped = (field: string): number => {
      if (!customMapping) return -1
      // O customMapping usa os headers originais (antes do lowercase)
      const rawHeaders = lines[0].split(sep).map((h: string) => h.trim().replace(/['"]/g, '').replace(/﻿/g, ''))
      const col = Object.entries(customMapping).find(([, v]) => v === field)
      if (!col) return -1
      return rawHeaders.indexOf(col[0])
    }

    const iName      = findMapped('name')      >= 0 ? findMapped('name')      : colIndex(['nome do paciente', 'nome', 'paciente', 'name', 'cliente'])
    const iPhone     = findMapped('phone')     >= 0 ? findMapped('phone')     : colIndex(['telefone', 'celular', 'whatsapp', 'phone', 'fone', 'tel'])
    const iEmail     = findMapped('email')     >= 0 ? findMapped('email')     : colIndex(['email', 'e-mail', 'e_mail'])
    const iGoal      = findMapped('goal')      >= 0 ? findMapped('goal')      : colIndex(['objetivo', 'goal', 'meta'])
    const iGender    = findMapped('gender')    >= 0 ? findMapped('gender')    : colIndex(['sexo', 'genero', 'gênero', 'gender'])
    const iHeight    = findMapped('height_cm') >= 0 ? findMapped('height_cm'): colIndex(['altura', 'height', 'height_cm'])
    const iBirthdate = findMapped('birthdate') >= 0 ? findMapped('birthdate'): colIndex(['data de nascimento', 'nascimento', 'data_nascimento', 'birthdate', 'dt_nascimento'])

    if (iPhone < 0) {
      return reply.code(400).send({
        error: `Coluna de telefone não encontrada. Cabeçalhos detectados: [${headers.join(', ')}]. Use: telefone, celular, whatsapp ou phone.`
      })
    }

    // Converte data de DD/MM/YYYY ou DD-MM-YYYY → YYYY-MM-DD
    function parseDate(raw: string): string | null {
      if (!raw?.trim()) return null
      const s = raw.trim()
      // já está em YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
      // DD/MM/YYYY ou DD-MM-YYYY
      const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
      if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`
      return null
    }

    // Normaliza telefone: mantém só dígitos (para consistência)
    function parsePhone(raw: string): string {
      return raw.replace(/\D/g, '')
    }

    // Parser simples de linha CSV que respeita campos entre aspas
    function parseLine(line: string, separator: string): string[] {
      const cols: string[] = []
      let cur = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"' || ch === "'") {
          inQuotes = !inQuotes
        } else if (ch === separator && !inQuotes) {
          cols.push(cur.trim())
          cur = ''
        } else {
          cur += ch
        }
      }
      cols.push(cur.trim())
      return cols
    }

    let imported = 0
    let skipped  = 0
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i], sep)
      const rawPhone = cols[iPhone]?.trim()
      if (!rawPhone) { skipped++; continue }

      const phone = parsePhone(rawPhone)
      if (phone.length < 8) { skipped++; continue }

      try {
        await query(
          `INSERT INTO clients (nutritionist_id, name, phone, email, goal, gender, height_cm, birthdate)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (nutritionist_id, phone) DO NOTHING`,
          [
            nutritionistId,
            iName      >= 0 ? cols[iName]?.trim()  || null : null,
            phone,
            iEmail     >= 0 ? cols[iEmail]?.trim() || null : null,
            iGoal      >= 0 ? cols[iGoal]?.trim()  || null : null,
            iGender    >= 0 ? cols[iGender]?.trim()|| null : null,
            iHeight    >= 0 && cols[iHeight]?.trim()
              ? Number(cols[iHeight].trim().replace(',', '.')) || null
              : null,
            iBirthdate >= 0 ? parseDate(cols[iBirthdate]) : null,
          ]
        )
        imported++
      } catch (err: any) {
        errors.push(`Linha ${i + 1} (${rawPhone}): ${err.message?.slice(0, 80)}`)
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

    // Próxima consulta futura (não cancelada)
    const next_appointment = await queryOne<any>(
      `SELECT id, scheduled_at, duration, modality, status, notes
       FROM appointments
       WHERE client_id = $1 AND status != 'cancelled' AND scheduled_at > NOW()
       ORDER BY scheduled_at ASC
       LIMIT 1`,
      [clientId]
    )

    // Plano alimentar ativo
    const meal_plan = await queryOne<any>(
      `SELECT id, title, meals, notes, is_active, created_at, updated_at
       FROM meal_plans
       WHERE client_id = $1 AND nutritionist_id = $2 AND is_active = true
       ORDER BY updated_at DESC
       LIMIT 1`,
      [clientId, nutritionistId]
    )

    return reply.send({ client, appointments, conversations, next_appointment: next_appointment ?? null, meal_plan: meal_plan ?? null })
  })

  // GET /api/clients/:clientId/appointments — agendamentos do cliente ordenados por data
  app.get('/:clientId/appointments', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }

    const client = await queryOne<{ id: string }>(
      `SELECT id FROM clients WHERE id = $1 AND nutritionist_id = $2`,
      [clientId, nutritionistId]
    )
    if (!client) return reply.code(404).send({ error: 'Cliente não encontrado' })

    const appointments = await query<any>(
      `SELECT a.id, a.scheduled_at, a.duration, a.modality, a.status, a.notes,
              a.created_by, a.created_at,
              l.name AS location_name, l.address AS location_address
       FROM appointments a
       LEFT JOIN locations l ON l.id = a.location_id
       WHERE a.client_id = $1
       ORDER BY a.scheduled_at DESC`,
      [clientId]
    )

    const next_appointment = appointments.find((a: any) =>
      a.status !== 'cancelled' && new Date(a.scheduled_at) > new Date()
    ) ?? null

    return reply.send({ appointments, next_appointment })
  })

  // GET /api/clients/:clientId/meal-plan — plano alimentar ativo do cliente
  app.get('/:clientId/meal-plan', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }

    const client = await queryOne<{ id: string }>(
      `SELECT id FROM clients WHERE id = $1 AND nutritionist_id = $2`,
      [clientId, nutritionistId]
    )
    if (!client) return reply.code(404).send({ error: 'Cliente não encontrado' })

    const meal_plan = await queryOne<any>(
      `SELECT id, title, meals, notes, is_active, created_at, updated_at
       FROM meal_plans
       WHERE client_id = $1 AND nutritionist_id = $2 AND is_active = true
       ORDER BY updated_at DESC
       LIMIT 1`,
      [clientId, nutritionistId]
    )

    if (!meal_plan) return reply.send({ meal_plan: null })
    return reply.send({ meal_plan })
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
      name:        z.string().min(1).optional(),
      goal:        z.string().nullish(),
      notes:       z.string().nullish(),
      birthdate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      // Data de retorno definida pela nutri (quando o paciente deve voltar).
      // '' limpa a data (envia null pro banco).
      return_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish().or(z.literal('')),
      ai_memory: z.object({
        restricoes: z.array(z.string()).optional(),
        preferencias: z.array(z.string()).optional(),
        observacoes: z.string().optional(),
      }).optional()
    })
    const body = schema.parse(request.body)
    // Só toca em return_date se o campo veio no request; '' limpa (null).
    const touchReturn = body.return_date !== undefined
    const returnDate  = body.return_date ? body.return_date : null

    const [updated] = await query(
      `UPDATE clients SET
         name        = COALESCE($3, name),
         goal        = COALESCE($4, goal),
         notes       = COALESCE($5, notes),
         birthdate   = COALESCE($6::DATE, birthdate),
         ai_memory   = COALESCE($7::JSONB, ai_memory),
         return_date = CASE WHEN $9 THEN $8::DATE ELSE return_date END,
         updated_at  = NOW()
       WHERE id = $1 AND nutritionist_id = $2
       RETURNING *`,
      [clientId, nutritionistId, body.name, body.goal, body.notes, body.birthdate ?? null,
       body.ai_memory ? JSON.stringify(body.ai_memory) : null,
       returnDate, touchReturn]
    )
    if (!updated) return reply.code(404).send({ error: 'Cliente não encontrado' })
    return reply.send(updated)
  })

  // POST /api/clients/import-csv — importa pacientes de CSV ou Excel
  app.post('/import-csv', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user

    const data = await (request as any).file()
    if (!data) return reply.code(400).send({ error: 'Nenhum arquivo enviado' })

    const buffer = await data.toBuffer()
    const filename: string = data.filename ?? ''

    let rows: Record<string, string>[] = []

    try {
      const wb = XLSX.read(buffer, { type: 'buffer' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, string>[]
    } catch {
      return reply.code(400).send({ error: 'Não foi possível ler o arquivo. Use CSV ou Excel (.xlsx).' })
    }

    if (rows.length === 0) return reply.code(400).send({ error: 'Arquivo vazio ou sem dados.' })

    // Normaliza nomes de coluna: lowercase, sem acento, sem espaço
    function norm(s: string) {
      return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_')
    }

    // ── Anamnese ─────────────────────────────────────────────────────────────

  // GET /api/clients/:clientId/anamnesis — retorna anamnese ou null
  app.get('/:clientId/anamnesis', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }

    const client = await queryOne<{ id: string }>(
      `SELECT id FROM clients WHERE id = $1 AND nutritionist_id = $2`,
      [clientId, nutritionistId]
    )
    if (!client) return reply.code(404).send({ error: 'Cliente não encontrado' })

    const anamnesis = await queryOne<any>(
      `SELECT id, data, updated_at, created_at FROM anamneses
       WHERE nutritionist_id = $1 AND client_id = $2`,
      [nutritionistId, clientId]
    )
    return reply.send({ anamnesis: anamnesis ?? null })
  })

  // PUT /api/clients/:clientId/anamnesis — upsert da anamnese
  app.put('/:clientId/anamnesis', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }

    const schema = z.object({ data: z.record(z.string(), z.any()) })
    const body = schema.parse(request.body)

    const client = await queryOne<{ id: string }>(
      `SELECT id FROM clients WHERE id = $1 AND nutritionist_id = $2`,
      [clientId, nutritionistId]
    )
    if (!client) return reply.code(404).send({ error: 'Cliente não encontrado' })

    const [anamnesis] = await query<any>(
      `INSERT INTO anamneses (nutritionist_id, client_id, data)
       VALUES ($1, $2, $3)
       ON CONFLICT (nutritionist_id, client_id)
       DO UPDATE SET data = $3, updated_at = NOW()
       RETURNING id, data, updated_at, created_at`,
      [nutritionistId, clientId, JSON.stringify(body.data)]
    )
    return reply.send({ anamnesis })
  })

  // ── Medidas (nutricionista registra) ─────────────────────────────────────

  // POST /api/clients/:clientId/measurements — insere medida em weight_logs
  app.post('/:clientId/measurements', auth, async (request, reply) => {
    const { id: nutritionistId } = (request as any).user
    const { clientId } = request.params as { clientId: string }

    const schema = z.object({
      weight_kg: z.number().positive().optional(),
      waist_cm:  z.number().positive().optional(),
      hip_cm:    z.number().positive().optional(),
      notes:     z.string().optional(),
      logged_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).refine(
      d => d.weight_kg !== undefined || d.waist_cm !== undefined || d.hip_cm !== undefined,
      { message: 'Informe ao menos um dado numérico (weight_kg, waist_cm ou hip_cm)' }
    )
    const body = schema.parse(request.body)

    const client = await queryOne<{ id: string }>(
      `SELECT id FROM clients WHERE id = $1 AND nutritionist_id = $2`,
      [clientId, nutritionistId]
    )
    if (!client) return reply.code(404).send({ error: 'Cliente não encontrado' })

    const [log] = await query<any>(
      `INSERT INTO weight_logs (client_id, weight_kg, waist_cm, hip_cm, notes, logged_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE))
       RETURNING id, weight_kg::text, waist_cm::text, hip_cm::text, notes, logged_at::text, created_at`,
      [clientId, body.weight_kg ?? null, body.waist_cm ?? null, body.hip_cm ?? null,
       body.notes ?? null, body.logged_at ?? null]
    )
    return reply.code(201).send({ log })
  })

  // ── Import CSV/Excel ──────────────────────────────────────────────────────

    let imported = 0
    let skipped  = 0

    for (const row of rows) {
      const normalized: Record<string, string> = {}
      for (const k of Object.keys(row)) normalized[norm(k)] = String(row[k] ?? '').trim()

      const name  = normalized['nome'] || normalized['nome_do_paciente'] || normalized['name'] || normalized['paciente'] || normalized['cliente'] || ''
      const phone = (normalized['telefone'] || normalized['telefone_celular'] || normalized['celular'] || normalized['phone'] || normalized['whatsapp'] || normalized['fone'] || '')
        .replace(/\D/g, '')
      const email = normalized['email'] || ''

      if (!name || !phone || phone.length < 10) { skipped++; continue }

      // Upsert: se já existe o telefone para essa nutri, ignora
      const inserted = await query(
        `INSERT INTO clients (nutritionist_id, name, phone, email)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (nutritionist_id, phone) DO NOTHING
         RETURNING id`,
        [nutritionistId, name, phone, email || null]
      ).catch(() => [])

      if ((inserted as any[]).length > 0) imported++
      else skipped++
    }

    return reply.send({ imported, skipped })
  })
}
