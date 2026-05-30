import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, queryOne } from '../db'
import { writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import pdf from 'pdf-parse'
import { processMessage } from '../services/ai.service'

export async function assistantRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // GET /api/assistants — busca assistente da nutri
  app.get('/', auth, async (request, reply) => {
    const { id } = (request as any).user
    const assistant = await queryOne<any>(
      `SELECT id, name, tone, greeting_message, is_active, created_at,
              consultation_price, consultation_modalities, specialties,
              vacation_mode, vacation_message,
              followup_enabled, followup_delay_hours,
              service_plans, nutri_display_name,
              emoji_level, func_prospeccao, func_triagem, func_agendamento,
              CASE WHEN pdf_path IS NOT NULL THEN split_part(pdf_path, '/', -1) ELSE NULL END as pdf_filename
       FROM assistants WHERE nutritionist_id = $1`,
      [id]
    )
    return reply.send({ assistant: assistant ?? null })
  })

  // POST /api/assistants — cria ou atualiza assistente
  app.post('/', auth, async (request, reply) => {
    const { id } = (request as any).user
    const schema = z.object({
      name: z.string().min(1),
      tone: z.enum(['acolhedor', 'formal', 'descontraido']).default('acolhedor'),
      greeting_message: z.string().optional(),
      consultation_price: z.string().optional(),
      consultation_modalities: z.string().optional(),
      specialties: z.string().optional(),
      vacation_mode: z.boolean().optional(),
      vacation_message: z.string().optional(),
      followup_enabled: z.boolean().optional(),
      followup_delay_hours: z.number().int().min(1).max(48).optional(),
      service_plans: z.string().optional(),
      nutri_display_name: z.string().optional(),
      emoji_level: z.number().int().min(1).max(5).default(3),
      func_prospeccao: z.boolean().default(true),
      func_triagem: z.boolean().default(true),
      func_agendamento: z.boolean().default(true),
    })

    const body = schema.parse(request.body)

    const existing = await queryOne('SELECT id FROM assistants WHERE nutritionist_id = $1', [id])

    let assistant
    if (existing) {
      ;[assistant] = await query(
        `UPDATE assistants SET
           name = $2, tone = $3, greeting_message = $4,
           consultation_price = $5, consultation_modalities = $6, specialties = $7,
           vacation_mode = COALESCE($8, vacation_mode), vacation_message = $9,
           followup_enabled = COALESCE($10, followup_enabled),
           followup_delay_hours = COALESCE($11, followup_delay_hours),
           service_plans = $12, nutri_display_name = $13,
           emoji_level = $14,
           func_prospeccao = $15, func_triagem = $16, func_agendamento = $17,
           updated_at = NOW()
         WHERE nutritionist_id = $1
         RETURNING id, name, tone, greeting_message, is_active,
                   consultation_price, consultation_modalities, specialties,
                   vacation_mode, vacation_message,
                   followup_enabled, followup_delay_hours, service_plans, nutri_display_name,
                   emoji_level, func_prospeccao, func_triagem, func_agendamento`,
        [id, body.name, body.tone, body.greeting_message,
         body.consultation_price, body.consultation_modalities, body.specialties,
         body.vacation_mode, body.vacation_message,
         body.followup_enabled, body.followup_delay_hours,
         body.service_plans ?? null, body.nutri_display_name?.trim() || null,
         body.emoji_level, body.func_prospeccao, body.func_triagem, body.func_agendamento]
      )
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
        [id, body.name, body.tone, body.greeting_message,
         body.consultation_price, body.consultation_modalities, body.specialties,
         body.vacation_mode ?? false, body.vacation_message,
         body.followup_enabled ?? true, body.followup_delay_hours ?? 4,
         body.service_plans ?? null, body.nutri_display_name?.trim() || null,
         body.emoji_level ?? 3, body.func_prospeccao ?? true, body.func_triagem ?? true, body.func_agendamento ?? true]
      )
    }

    return reply.code(existing ? 200 : 201).send({ assistant })
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

    // Se reset, apaga conversa de teste anterior
    if (body.reset) {
      await query(
        `DELETE FROM conversations WHERE nutritionist_id = $1 AND client_phone = $2`,
        [nutritionist_id, testPhone]
      )
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
