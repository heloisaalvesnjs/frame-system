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
      nutri_display_name: z.string().optional()
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
           service_plans = $12,
           nutri_display_name = $13,
           updated_at = NOW()
         WHERE nutritionist_id = $1
         RETURNING id, name, tone, greeting_message, is_active,
                   consultation_price, consultation_modalities, specialties,
                   vacation_mode, vacation_message,
                   followup_enabled, followup_delay_hours, service_plans, nutri_display_name`,
        [id, body.name, body.tone, body.greeting_message,
         body.consultation_price, body.consultation_modalities, body.specialties,
         body.vacation_mode, body.vacation_message,
         body.followup_enabled, body.followup_delay_hours,
         body.service_plans ?? null, body.nutri_display_name?.trim() || null]
      )
    } else {
      ;[assistant] = await query(
        `INSERT INTO assistants
           (nutritionist_id, name, tone, greeting_message,
            consultation_price, consultation_modalities, specialties,
            vacation_mode, vacation_message,
            followup_enabled, followup_delay_hours, service_plans, nutri_display_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id, name, tone, greeting_message, is_active,
                   consultation_price, consultation_modalities, specialties,
                   vacation_mode, vacation_message,
                   followup_enabled, followup_delay_hours, service_plans, nutri_display_name`,
        [id, body.name, body.tone, body.greeting_message,
         body.consultation_price, body.consultation_modalities, body.specialties,
         body.vacation_mode ?? false, body.vacation_message,
         body.followup_enabled ?? true, body.followup_delay_hours ?? 4,
         body.service_plans ?? null, body.nutri_display_name?.trim() || null]
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
      const result = await processMessage({
        nutritionist_id,
        client_phone: testPhone,
        message: body.message,
      })

      return reply.send({ response: result.text, action: result.action })
    } catch (err: any) {
      return reply.code(500).send({ error: err?.message ?? 'Erro ao processar mensagem' })
    }
  })
}
