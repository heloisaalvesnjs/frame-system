import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, queryOne } from '../db'
import { writeFileSync, mkdirSync, unlinkSync } from 'fs'
import path from 'path'
import pdf from 'pdf-parse'
import { processMessage } from '../services/ai.service'

export async function assistantRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // GET /api/assistants — busca assistente da nutri
  app.get('/', auth, async (request, reply) => {
    const { id } = (request as any).user

    // Tenta busca completa (com colunas novas de automação)
    let assistant: any = null
    try {
      assistant = await queryOne<any>(
        `SELECT id, name, tone, greeting_message, is_active, created_at,
                consultation_price, consultation_modalities, specialties,
                vacation_mode, vacation_message,
                followup_enabled, followup_delay_hours,
                service_plans, nutri_display_name,
                emoji_level, func_prospeccao, func_triagem, func_agendamento,
                followup_message_1, followup_message_2,
                auto_feedback_enabled, auto_feedback_delay_hours, auto_feedback_message,
                auto_reminder_enabled, auto_reminder_hours_before, auto_reminder_message,
                auto_return_enabled, auto_return_days, auto_return_message,
                services_message, services_message_enabled,
                services_message_online, services_message_online_enabled,
                services_message_presencial, services_message_presencial_enabled,
                pos_consulta_message, retorno_message, retorno_days,
                ai_paused,
                plans_media_enabled, plans_media_type, plans_media_original_name,
                CASE WHEN plans_media_path IS NOT NULL THEN true ELSE false END as has_plans_media,
                plans_media,
                CASE WHEN pdf_path IS NOT NULL THEN split_part(pdf_path, '/', -1) ELSE NULL END as pdf_filename,
                farewell_message, frases_proibidas, frases_preferidas, custom_objections,
                conversation_examples, clinical_rules
         FROM assistants WHERE nutritionist_id = $1`,
        [id]
      )
    } catch {
      // Fallback sem colunas novas (migration ainda não rodou)
      assistant = await queryOne<any>(
        `SELECT id, name, tone, greeting_message, is_active, created_at,
                consultation_price, consultation_modalities, specialties,
                vacation_mode, vacation_message,
                followup_enabled, followup_delay_hours,
                service_plans, nutri_display_name,
                emoji_level, func_prospeccao, func_triagem, func_agendamento,
                followup_message_1, followup_message_2,
                services_message, services_message_enabled,
                services_message_online, services_message_online_enabled,
                services_message_presencial, services_message_presencial_enabled,
                pos_consulta_message, retorno_message, retorno_days,
                ai_paused,
                plans_media_enabled, plans_media_type, plans_media_original_name,
                CASE WHEN plans_media_path IS NOT NULL THEN true ELSE false END as has_plans_media,
                plans_media,
                CASE WHEN pdf_path IS NOT NULL THEN split_part(pdf_path, '/', -1) ELSE NULL END as pdf_filename
         FROM assistants WHERE nutritionist_id = $1`,
        [id]
      )
    }

    return reply.send({ assistant: assistant ?? null })
  })

  // POST /api/assistants — cria ou atualiza assistente
  app.post('/', auth, async (request, reply) => {
    const { id } = (request as any).user
    const ns = (f?: z.ZodTypeAny) => z.string().nullish().transform(v => v ?? undefined).pipe(f ?? z.string().optional())
    const schema = z.object({
      name: z.string().min(1).optional(),
      tone: z.string().optional(),
      greeting_message: z.string().nullish().transform(v => v ?? undefined),
      consultation_price: z.string().nullish().transform(v => v ?? undefined),
      consultation_modalities: z.string().nullish().transform(v => v ?? undefined),
      specialties: z.string().nullish().transform(v => v ?? undefined),
      vacation_mode: z.boolean().nullish().transform(v => v ?? undefined),
      vacation_message: z.string().nullish().transform(v => v ?? undefined),
      followup_enabled: z.boolean().nullish().transform(v => v ?? undefined),
      followup_delay_hours: z.number().int().min(1).max(48).nullish().transform(v => v ?? undefined),
      service_plans: z.string().nullish().transform(v => v ?? undefined),
      nutri_display_name: z.string().nullish().transform(v => v ?? undefined),
      emoji_level: z.number().int().min(1).max(5).default(3),
      func_prospeccao: z.boolean().default(true),
      func_triagem: z.boolean().default(true),
      func_agendamento: z.boolean().default(true),
      followup_message_1: z.string().nullish().transform(v => v ?? undefined),
      followup_message_2: z.string().nullish().transform(v => v ?? undefined),
      auto_feedback_enabled: z.boolean().nullish().transform(v => v ?? undefined),
      auto_feedback_delay_hours: z.number().int().min(1).nullish().transform(v => v ?? undefined),
      auto_feedback_message: z.string().nullish().transform(v => v ?? undefined),
      auto_reminder_enabled: z.boolean().nullish().transform(v => v ?? undefined),
      auto_reminder_hours_before: z.number().int().min(1).nullish().transform(v => v ?? undefined),
      auto_reminder_message: z.string().nullish().transform(v => v ?? undefined),
      auto_return_enabled: z.boolean().nullish().transform(v => v ?? undefined),
      auto_return_days: z.number().int().min(1).nullish().transform(v => v ?? undefined),
      auto_return_message: z.string().nullish().transform(v => v ?? undefined),
      services_message: z.string().nullish().transform(v => v ?? undefined),
      services_message_enabled: z.boolean().nullish().transform(v => v ?? undefined),
      services_message_online: z.string().nullish().transform(v => v ?? undefined),
      services_message_online_enabled: z.boolean().nullish().transform(v => v ?? undefined),
      services_message_presencial: z.string().nullish().transform(v => v ?? undefined),
      services_message_presencial_enabled: z.boolean().nullish().transform(v => v ?? undefined),
      // Campos de automação n8n
      pos_consulta_message: z.string().nullish().transform(v => v ?? undefined),
      retorno_message: z.string().nullish().transform(v => v ?? undefined),
      retorno_days: z.number().int().min(1).max(365).nullish().transform(v => v ?? undefined),
      // Perfil da atendente (B.4)
      farewell_message: z.string().nullish().transform(v => v ?? undefined),
      frases_proibidas: z.array(z.string()).nullish().transform(v => v ?? undefined),
      frases_preferidas: z.array(z.string()).nullish().transform(v => v ?? undefined),
      // Roteiros de venda — objeções personalizadas (B.7)
      custom_objections: z.array(z.object({
        gatilho: z.string(),
        resposta: z.string(),
      })).nullish().transform(v => v ?? undefined),
      // Exemplos de conversas (B.8)
      conversation_examples: z.array(z.object({
        situacao: z.string(),
        resposta: z.string(),
      })).nullish().transform(v => v ?? undefined),
      // Regras clínicas / limites (B.9)
      clinical_rules: z.array(z.string()).nullish().transform(v => v ?? undefined),
    }).passthrough()

    const body = schema.parse(request.body)

    const existing = await queryOne('SELECT id FROM assistants WHERE nutritionist_id = $1', [id])

    let assistant
    if (existing) {
      ;[assistant] = await query(
        `UPDATE assistants SET
           name = COALESCE($2, name), tone = COALESCE($3, tone), greeting_message = $4,
           consultation_price = $5, consultation_modalities = $6, specialties = $7,
           vacation_mode = COALESCE($8, vacation_mode), vacation_message = $9,
           followup_enabled = COALESCE($10, followup_enabled),
           followup_delay_hours = COALESCE($11, followup_delay_hours),
           service_plans = $12, nutri_display_name = $13,
           emoji_level = $14,
           func_prospeccao = $15, func_triagem = $16, func_agendamento = $17,
           followup_message_1 = $18, followup_message_2 = $19,
           services_message = $20,
           services_message_enabled = COALESCE($21, services_message_enabled),
           services_message_online = $22,
           services_message_online_enabled = COALESCE($23, services_message_online_enabled),
           services_message_presencial = $24,
           services_message_presencial_enabled = COALESCE($25, services_message_presencial_enabled),
           updated_at = NOW()
         WHERE nutritionist_id = $1
         RETURNING id, name, tone, greeting_message, is_active,
                   consultation_price, consultation_modalities, specialties,
                   vacation_mode, vacation_message,
                   followup_enabled, followup_delay_hours, service_plans, nutri_display_name,
                   emoji_level, func_prospeccao, func_triagem, func_agendamento,
                   followup_message_1, followup_message_2,
                   services_message, services_message_enabled,
                   services_message_online, services_message_online_enabled,
                   services_message_presencial, services_message_presencial_enabled`,
        [id, body.name, body.tone, body.greeting_message,
         body.consultation_price, body.consultation_modalities, body.specialties,
         body.vacation_mode, body.vacation_message,
         body.followup_enabled, body.followup_delay_hours,
         body.service_plans ?? null, body.nutri_display_name?.trim() || null,
         body.emoji_level, body.func_prospeccao, body.func_triagem, body.func_agendamento,
         body.followup_message_1 ?? null, body.followup_message_2 ?? null,
         body.services_message ?? null, body.services_message_enabled ?? null,
         body.services_message_online ?? null, body.services_message_online_enabled ?? null,
         body.services_message_presencial ?? null, body.services_message_presencial_enabled ?? null]
      )

      // Atualiza campos de automação separadamente (defensivo — colunas podem não existir até rodar migration)
      try {
        const autoUpdates: string[] = []
        const autoParams: any[] = [id]
        let p = 2
        if (body.auto_feedback_enabled !== undefined)      { autoUpdates.push(`auto_feedback_enabled = $${p++}`);      autoParams.push(body.auto_feedback_enabled) }
        if (body.auto_feedback_delay_hours !== undefined)  { autoUpdates.push(`auto_feedback_delay_hours = $${p++}`);  autoParams.push(body.auto_feedback_delay_hours) }
        if (body.auto_feedback_message !== undefined)      { autoUpdates.push(`auto_feedback_message = $${p++}`);      autoParams.push(body.auto_feedback_message) }
        if (body.auto_reminder_enabled !== undefined)      { autoUpdates.push(`auto_reminder_enabled = $${p++}`);      autoParams.push(body.auto_reminder_enabled) }
        if (body.auto_reminder_hours_before !== undefined) { autoUpdates.push(`auto_reminder_hours_before = $${p++}`); autoParams.push(body.auto_reminder_hours_before) }
        if (body.auto_reminder_message !== undefined)      { autoUpdates.push(`auto_reminder_message = $${p++}`);      autoParams.push(body.auto_reminder_message) }
        if (body.auto_return_enabled !== undefined)        { autoUpdates.push(`auto_return_enabled = $${p++}`);        autoParams.push(body.auto_return_enabled) }
        if (body.auto_return_days !== undefined)           { autoUpdates.push(`auto_return_days = $${p++}`);           autoParams.push(body.auto_return_days) }
        if (body.auto_return_message !== undefined)        { autoUpdates.push(`auto_return_message = $${p++}`);        autoParams.push(body.auto_return_message) }
        if (body.pos_consulta_message !== undefined)       { autoUpdates.push(`pos_consulta_message = $${p++}`);       autoParams.push(body.pos_consulta_message) }
        if (body.retorno_message !== undefined)            { autoUpdates.push(`retorno_message = $${p++}`);            autoParams.push(body.retorno_message) }
        if (body.retorno_days !== undefined)               { autoUpdates.push(`retorno_days = $${p++}`);               autoParams.push(body.retorno_days) }
        if (body.farewell_message !== undefined)           { autoUpdates.push(`farewell_message = $${p++}`);           autoParams.push(body.farewell_message) }
        if (body.frases_proibidas !== undefined)           { autoUpdates.push(`frases_proibidas = $${p++}`);           autoParams.push(JSON.stringify(body.frases_proibidas)) }
        if (body.frases_preferidas !== undefined)          { autoUpdates.push(`frases_preferidas = $${p++}`);          autoParams.push(JSON.stringify(body.frases_preferidas)) }
        if (body.custom_objections !== undefined)          { autoUpdates.push(`custom_objections = $${p++}`);          autoParams.push(JSON.stringify(body.custom_objections)) }
        if (body.conversation_examples !== undefined)      { autoUpdates.push(`conversation_examples = $${p++}`);      autoParams.push(JSON.stringify(body.conversation_examples)) }
        if (body.clinical_rules !== undefined)             { autoUpdates.push(`clinical_rules = $${p++}`);             autoParams.push(JSON.stringify(body.clinical_rules)) }
        if (autoUpdates.length > 0) {
          await query(`UPDATE assistants SET ${autoUpdates.join(', ')} WHERE nutritionist_id = $1`, autoParams)
        }
      } catch {
        // Colunas de automação ainda não existem — ignorar até rodar migration
      }
    } else {
      ;[assistant] = await query(
        `INSERT INTO assistants
           (nutritionist_id, name, tone, greeting_message,
            consultation_price, consultation_modalities, specialties,
            vacation_mode, vacation_message,
            followup_enabled, followup_delay_hours, service_plans, nutri_display_name,
            emoji_level, func_prospeccao, func_triagem, func_agendamento)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         RETURNING id, name, tone, greeting_message, is_active,
                   consultation_price, consultation_modalities, specialties,
                   vacation_mode, vacation_message,
                   followup_enabled, followup_delay_hours, service_plans, nutri_display_name,
                   emoji_level, func_prospeccao, func_triagem, func_agendamento`,
        [id, body.name ?? 'Assistente', body.tone ?? 'acolhedor', body.greeting_message,
         body.consultation_price, body.consultation_modalities, body.specialties,
         body.vacation_mode ?? false, body.vacation_message,
         body.followup_enabled ?? true, body.followup_delay_hours ?? 4,
         body.service_plans ?? null, body.nutri_display_name?.trim() || null,
         body.emoji_level ?? 3, body.func_prospeccao ?? true, body.func_triagem ?? true, body.func_agendamento ?? true]
      )
    }

    return reply.code(existing ? 200 : 201).send({ assistant })
  })

  // GET /api/assistants/manual-content — retorna o conteúdo do manual/pdf atual
  app.get('/manual-content', auth, async (request, reply) => {
    const { id } = (request as any).user
    const assistant = await queryOne<any>(
      'SELECT pdf_content FROM assistants WHERE nutritionist_id = $1',
      [id]
    )
    return reply.send({ content: assistant?.pdf_content ?? null })
  })

  // POST /api/assistants/upload-pdf — upload do PDF com instruções
  app.post('/upload-pdf', auth, async (request, reply) => {
    const { id } = (request as any).user

    const assistant = await queryOne('SELECT id FROM assistants WHERE nutritionist_id = $1', [id])
    if (!assistant) {
      return reply.code(404).send({ error: 'Configure a assistente antes de fazer upload do PDF' })
    }

    const data = await request.file()
    if (!data) return reply.code(400).send({ error: 'Nenhum arquivo enviado' })
    if (!data.mimetype.includes('pdf')) {
      return reply.code(400).send({ error: 'Apenas arquivos PDF são aceitos' })
    }

    // Salva o arquivo
    const uploadDir = path.join(process.cwd(), 'uploads', id)
    mkdirSync(uploadDir, { recursive: true })
    const filePath = path.join(uploadDir, `instructions_${Date.now()}.pdf`)

    const buffer = await data.toBuffer()
    writeFileSync(filePath, buffer)

    // Extrai texto do PDF
    let pdfContent = ''
    try {
      const parsed = await pdf(buffer)
      pdfContent = parsed.text.trim()
    } catch (err) {
      return reply.code(422).send({ error: 'Não foi possível ler o PDF. Verifique se o arquivo contém texto.' })
    }

    if (!pdfContent) {
      return reply.code(422).send({ error: 'PDF não contém texto legível.' })
    }

    // Salva no banco
    await query(
      `UPDATE assistants SET pdf_path = $2, pdf_content = $3, updated_at = NOW()
       WHERE nutritionist_id = $1`,
      [id, filePath, pdfContent]
    )

    return reply.send({
      ok: true,
      message: 'PDF processado com sucesso!',
      preview: pdfContent.slice(0, 300) + (pdfContent.length > 300 ? '...' : '')
    })
  })

  // DELETE /api/assistants/pdf — remove o PDF
  app.delete('/pdf', auth, async (request, reply) => {
    const { id } = (request as any).user
    await query(
      'UPDATE assistants SET pdf_path = NULL, pdf_content = NULL WHERE nutritionist_id = $1',
      [id]
    )
    return reply.send({ ok: true })
  })

  // ─────────────────────────────────────────────────────────
  // FORMULÁRIO DE TREINAMENTO DO CONSULTÓRIO
  // ─────────────────────────────────────────────────────────

  // GET /api/assistants/training-form — busca formulário salvo
  app.get('/training-form', auth, async (request, reply) => {
    const { id } = (request as any).user
    const assistant = await queryOne<any>(
      'SELECT training_form FROM assistants WHERE nutritionist_id = $1',
      [id]
    )
    return reply.send({ form: assistant?.training_form ?? null })
  })

  // POST /api/assistants/training-form — salva formulário e monta pdf_content
  app.post('/training-form', auth, async (request, reply) => {
    const { id } = (request as any).user
    const schema = z.object({
      // Identidade
      nome_titulo:    z.string().default(''),
      especialidades: z.array(z.string()).default([]),
      modalidade:     z.string().default(''),
      experiencia:    z.string().default(''),
      diferencial:    z.string().default(''),
      // Público e resultados
      faixa_etaria:   z.array(z.string()).default([]),
      objetivos:      z.array(z.string()).default([]),
      resultados:     z.string().default(''),
      // FAQ
      faq:            z.string().default(''),
      // Instruções
      sempre:         z.array(z.string()).default([]),
      nunca:          z.array(z.string()).default([]),
      instrucoes_extras: z.string().default(''),
    })
    const body = schema.parse(request.body)

    // Monta o conteúdo estruturado que a IA vai consumir
    const parts: string[] = []

    // Identidade
    const idLines: string[] = []
    if (body.nome_titulo)         idLines.push(body.nome_titulo)
    if (body.especialidades.length) idLines.push(`Especialidades: ${body.especialidades.join(', ')}`)
    if (body.modalidade)           idLines.push(`Modalidade: ${body.modalidade}`)
    if (body.experiencia)          idLines.push(`Experiência: ${body.experiencia}`)
    if (body.diferencial)          idLines.push(`Diferencial: ${body.diferencial}`)
    if (idLines.length) parts.push(`IDENTIDADE DO CONSULTÓRIO:\n${idLines.join('\n')}`)

    // Público
    const pubLines: string[] = []
    if (body.faixa_etaria.length) pubLines.push(`Faixa etária predominante: ${body.faixa_etaria.join(', ')}`)
    if (body.objetivos.length)    pubLines.push(`Objetivos mais atendidos: ${body.objetivos.join(', ')}`)
    if (body.resultados)          pubLines.push(body.resultados)
    if (pubLines.length) parts.push(`PÚBLICO ATENDIDO E RESULTADOS:\n${pubLines.join('\n')}`)

    // FAQ
    if (body.faq.trim())
      parts.push(`PERGUNTAS FREQUENTES — USE ESTAS RESPOSTAS EXATAS:\n${body.faq.trim()}`)

    // Instruções
    const instrLines: string[] = []
    if (body.sempre.length) instrLines.push(`SEMPRE MENCIONAR:\n${body.sempre.map(s => `- ${s}`).join('\n')}`)
    if (body.nunca.length)  instrLines.push(`NUNCA DIZER OU PROMETER:\n${body.nunca.map(s => `- ${s}`).join('\n')}`)
    if (body.instrucoes_extras.trim()) instrLines.push(body.instrucoes_extras.trim())
    if (instrLines.length) parts.push(`INSTRUÇÕES ESPECIAIS:\n${instrLines.join('\n\n')}`)

    const assembled = parts.join('\n\n') || null

    await query(
      `UPDATE assistants
         SET training_form = $2,
             pdf_content   = $3,
             pdf_path      = NULL,
             updated_at    = NOW()
       WHERE nutritionist_id = $1`,
      [id, JSON.stringify(body), assembled]
    )

    return reply.send({ ok: true })
  })

  // POST /api/assistants/interview — salva conteúdo compilado da entrevista
  app.post('/interview', auth, async (request, reply) => {
    const { id } = (request as any).user
    const schema = z.object({ content: z.string().min(10) })
    const { content } = schema.parse(request.body)
    await query(
      `UPDATE assistants
         SET pdf_content = $2, pdf_path = NULL, training_form = NULL, updated_at = NOW()
       WHERE nutritionist_id = $1`,
      [id, content]
    )
    return reply.send({ ok: true })
  })

  // ─────────────────────────────────────────────────────────
  // TREINAMENTO UNIVERSAL DA IA
  // ─────────────────────────────────────────────────────────

  // POST /api/assistants/training — salva nota de treinamento global
  app.post('/training', auth, async (request, reply) => {
    const schema = z.object({
      content: z.string().min(5).max(1000),
      category: z.enum(['geral', 'abertura', 'objecoes', 'agendamento', 'tom']).default('geral')
    })
    const body = schema.parse(request.body)

    const [note] = await query(
      `INSERT INTO ai_training_notes (category, content)
       VALUES ($1, $2)
       RETURNING id, category, content, created_at`,
      [body.category, body.content]
    )

    // ── Obsidian integration (opcional) ──────────────────────
    const vaultPath = process.env.OBSIDIAN_VAULT_PATH
    if (vaultPath) {
      try {
        const date = new Date().toISOString().slice(0, 10)
        const slug = body.content
          .slice(0, 40)
          .toLowerCase()
          .normalize('NFD').replace(/[̀-ͯ]/g, '')  // remove acentos
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
        const dir = path.join(vaultPath, 'NutriApp', 'Treinamentos')
        mkdirSync(dir, { recursive: true })
        const filename = path.join(dir, `${date}-${body.category}-${slug}.md`)
        const md = `---\ntags: [nutriapp, treinamento, ${body.category}]\ndate: ${date}\ncategory: ${body.category}\n---\n\n${body.content}\n`
        writeFileSync(filename, md, 'utf-8')
        app.log.info(`[training] Nota salva no Obsidian: ${filename}`)
      } catch (obsErr) {
        app.log.warn({ err: obsErr }, '[training] Obsidian write falhou (continuando)')
      }
    }

    return reply.code(201).send({ ok: true, note })
  })

  /** PATCH /api/assistants/toggle-ai — pausa ou ativa a IA */
  app.patch('/toggle-ai', auth, async (request, reply) => {
    const { id } = (request as any).user
    const { paused } = request.body as { paused: boolean }
    await query('UPDATE assistants SET ai_paused = $2 WHERE nutritionist_id = $1', [id, paused])
    return reply.send({ ok: true, ai_paused: paused })
  })

  // ── Mídia dos Planos ──────────────────────────────────────────────

  // ── Helper: lê/escreve plans_media JSONB ──────────────────────────────
  type MediaVariant = 'geral' | 'online' | 'presencial'

  /** POST /api/assistants/plans-media?variant=geral|online|presencial */
  app.post('/plans-media', auth, async (request, reply) => {
    const { id } = (request as any).user
    const variant = ((request.query as any).variant ?? 'geral') as MediaVariant

    const assistant = await queryOne<any>('SELECT id, plans_media FROM assistants WHERE nutritionist_id = $1', [id])
    if (!assistant) return reply.code(404).send({ error: 'Configure a assistente primeiro' })

    const data = await request.file()
    if (!data) return reply.code(400).send({ error: 'Nenhum arquivo enviado' })

    const isImage = data.mimetype.startsWith('image/')
    const isPdf   = data.mimetype === 'application/pdf'
    if (!isImage && !isPdf) return reply.code(400).send({ error: 'Apenas imagens (JPG, PNG) ou PDF são aceitos' })

    const ext       = isPdf ? 'pdf' : (data.mimetype.includes('png') ? 'png' : 'jpg')
    const uploadDir = path.join(process.cwd(), 'uploads', 'plans', id)
    mkdirSync(uploadDir, { recursive: true })

    // Remove arquivo anterior desta variante
    const current = (assistant.plans_media ?? {})[variant]
    if (current?.path) { try { unlinkSync(current.path) } catch {} }

    const filename = `${variant}_media.${ext}`
    const filePath = path.join(uploadDir, filename)
    writeFileSync(filePath, await data.toBuffer())

    const mediaType = isPdf ? 'pdf' : 'image'
    const entry = { path: filePath, type: mediaType, enabled: true, name: data.filename || filename }
    const updated = { ...(assistant.plans_media ?? {}), [variant]: entry }

    await query(
      `UPDATE assistants SET plans_media = $2::jsonb WHERE nutritionist_id = $1`,
      [id, JSON.stringify(updated)]
    )

    const publicUrl = `${process.env.API_PUBLIC_URL || ''}/uploads/plans/${id}/${filename}`
    return reply.send({ ok: true, url: publicUrl, type: mediaType, name: data.filename, variant })
  })

  /** DELETE /api/assistants/plans-media?variant=... */
  app.delete('/plans-media', auth, async (request, reply) => {
    const { id } = (request as any).user
    const variant = ((request.query as any).variant ?? 'geral') as MediaVariant

    const assistant = await queryOne<any>('SELECT plans_media FROM assistants WHERE nutritionist_id = $1', [id])
    const current = (assistant?.plans_media ?? {})[variant]
    if (current?.path) { try { unlinkSync(current.path) } catch {} }

    const updated = { ...(assistant?.plans_media ?? {}) }
    delete updated[variant]
    await query(`UPDATE assistants SET plans_media = $2::jsonb WHERE nutritionist_id = $1`, [id, JSON.stringify(updated)])
    return reply.send({ ok: true })
  })

  /** PATCH /api/assistants/plans-media/toggle?variant=... */
  app.patch('/plans-media/toggle', auth, async (request, reply) => {
    const { id } = (request as any).user
    const variant  = ((request.query as any).variant ?? 'geral') as MediaVariant
    const { enabled } = request.body as { enabled: boolean }

    const assistant = await queryOne<any>('SELECT plans_media FROM assistants WHERE nutritionist_id = $1', [id])
    const current = assistant?.plans_media ?? {}
    if (!current[variant]) return reply.code(400).send({ error: 'Nenhum arquivo enviado para esta variante' })
    const updated = { ...current, [variant]: { ...current[variant], enabled } }
    await query(`UPDATE assistants SET plans_media = $2::jsonb WHERE nutritionist_id = $1`, [id, JSON.stringify(updated)])
    return reply.send({ ok: true })
  })

  // GET /api/assistants/diagnose — testa se a IA está respondendo
  app.get('/diagnose', auth, async (request, reply) => {
    const results: Record<string, string> = {}

    // Testa Claude
    try {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })
      const res = await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 20,
        messages: [{ role: 'user', content: 'responda só "ok"' }]
      })
      results.claude = `✅ ok — modelo: claude-3-5-haiku-20241022 — resposta: "${(res.content[0] as any).text?.slice(0,30)}"`
    } catch (e: any) {
      results.claude = `❌ ${e?.status ?? ''} ${e?.message ?? e}`
    }

    // Testa Groq
    try {
      const Groq = (await import('groq-sdk')).default
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' })
      const res = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'say ok' }]
      })
      results.groq = `✅ ok — "${res.choices[0]?.message?.content?.slice(0,30)}"`
    } catch (e: any) {
      results.groq = `❌ ${e?.status ?? ''} ${e?.message ?? e}`
    }

    // Variáveis de ambiente (sem expor valores)
    results.env_anthropic = process.env.ANTHROPIC_API_KEY ? `✅ definida (${process.env.ANTHROPIC_API_KEY.length} chars)` : '❌ NÃO definida'
    results.env_groq      = process.env.GROQ_API_KEY      ? `✅ definida` : '❌ NÃO definida'
    results.env_gemini    = process.env.GEMINI_API_KEY     ? `✅ definida` : '❌ NÃO definida'

    return reply.send({ diagnose: results })
  })

  // GET /api/assistants/training — lista notas de treinamento
  app.get('/training', auth, async (request, reply) => {
    const notes = await query(
      `SELECT id, category, content, is_active, created_at
       FROM ai_training_notes ORDER BY created_at DESC`,
      []
    )
    return reply.send({ notes })
  })

  // DELETE /api/assistants/training/:noteId — desativa nota
  app.delete('/training/:noteId', auth, async (request, reply) => {
    const { noteId } = request.params as any
    await query('UPDATE ai_training_notes SET is_active = false WHERE id = $1', [noteId])
    return reply.send({ ok: true })
  })

  // POST /api/assistants/test — simula uma mensagem de cliente para testar a Sofia
  app.post('/test', auth, async (request, reply) => {
    const { id: nutritionist_id } = (request as any).user
    const schema = z.object({
      message: z.string().min(1).max(500),
      history: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string()
      })).optional().default([]),
      reset: z.boolean().optional().default(false)
    })

    const body = schema.parse(request.body)

    // Usa um "telefone" fictício para o modo teste — nunca cria agendamento real
    const testPhone = `test_${nutritionist_id}`

    // Se reset, apaga conversa de teste e retorna imediatamente
    // (não chama processMessage — evita criar conversa com '__reset__' no histórico)
    if (body.reset) {
      await query(
        `DELETE FROM conversations WHERE nutritionist_id = $1 AND client_phone = $2`,
        [nutritionist_id, testPhone]
      )
      return reply.send({ response: '', action: null })
    }

    try {
      // Busca conversa de teste existente para manter o histórico entre mensagens
      const existingConv = await queryOne<any>(
        `SELECT id FROM conversations WHERE nutritionist_id = $1 AND client_phone = $2
         ORDER BY created_at DESC LIMIT 1`,
        [nutritionist_id, testPhone]
      )

      const result = await processMessage({
        nutritionist_id,
        client_phone: testPhone,
        message: body.message,
        conversation_id: existingConv?.id,
      })

      return reply.send({ response: result.text, action: result.action })
    } catch (err: any) {
      return reply.code(500).send({ error: err?.message ?? 'Erro ao processar mensagem' })
    }
  })
}
