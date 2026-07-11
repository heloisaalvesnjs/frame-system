import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { query, queryOne } from '../db'
import { sendMessage } from '../services/whatsapp.service'
import { runFollowupSequences, runAppointmentReminders } from '../services/followup.service'
import { runWeeklyReport } from '../services/report.service'
import { notifyNewLead } from '../services/notification.service'

/**
 * Rotas internas — autenticadas via x-internal-key (para n8n e cron jobs).
 * Nunca expor estas rotas publicamente sem a chave.
 */
export async function internalRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticateInternal] }

  // ── GET /api/internal/health ──────────────────────────────
  // Permite o n8n verificar se a API está no ar antes de executar fluxos.
  app.get('/health', auth, async (_request, reply) => {
    return reply.send({ ok: true, timestamp: new Date().toISOString() })
  })

  // ── GET /api/internal/nutritionists ──────────────────────
  // Lista todas as nutricionistas ativas com suas instâncias WhatsApp.
  // Usado em cron jobs que iteram todas as nutricionistas.
  app.get('/nutritionists', auth, async (_request, reply) => {
    const nutritionists = await query(`
      SELECT
        n.id,
        n.name,
        n.email,
        n.phone,
        w.instance_token,
        w.status  AS whatsapp_status,
        w.phone_number AS whatsapp_number
      FROM nutritionists n
      LEFT JOIN whatsapp_connections w ON w.nutritionist_id = n.id
      WHERE n.is_active = true
      ORDER BY n.name
    `)
    return reply.send({ nutritionists })
  })

  // ── GET /api/internal/appointments ───────────────────────
  // Lista agendamentos com filtros de data e status.
  // Query params:
  //   date       — filtra por data (YYYY-MM-DD). Ex: ?date=2026-05-20
  //   status     — filtra por status. Ex: ?status=scheduled
  //   nutritionist_id — filtra por nutricionista (opcional)
  app.get('/appointments', auth, async (request, reply) => {
    const { date, status, nutritionist_id } = request.query as Record<string, string>

    let sql = `
      SELECT
        a.id,
        a.scheduled_at,
        a.duration AS duration_minutes,
        a.modality,
        a.status,
        a.notes,
        a.created_by,
        c.name  AS client_name,
        c.phone AS client_phone,
        n.name  AS nutritionist_name,
        n.phone AS nutritionist_phone,
        w.instance_token,
        w.phone_number AS whatsapp_number
      FROM appointments a
      JOIN clients c        ON c.id = a.client_id
      JOIN nutritionists n  ON n.id = a.nutritionist_id
      LEFT JOIN whatsapp_connections w ON w.nutritionist_id = a.nutritionist_id
      WHERE 1=1
    `
    const params: unknown[] = []

    if (date) {
      params.push(date)
      sql += ` AND DATE(a.scheduled_at AT TIME ZONE 'America/Sao_Paulo') = $${params.length}`
    }
    if (status) {
      params.push(status)
      sql += ` AND a.status = $${params.length}`
    }
    if (nutritionist_id) {
      params.push(nutritionist_id)
      sql += ` AND a.nutritionist_id = $${params.length}`
    }

    sql += ' ORDER BY a.scheduled_at ASC'

    const appointments = await query(sql, params)
    return reply.send({ appointments })
  })

  // ── POST /api/internal/whatsapp/send ─────────────────────
  // Envia uma mensagem WhatsApp via uazapi.
  // Body: { nutritionist_id, phone, text } — busca o token no banco
  //    ou: { instance_token, phone, text }  — token direto
  // Campos opcionais:
  //   delay        — ms de atraso antes de enviar (uazapi simula digitação)
  //   readmessages — marca as mensagens como lidas (default: true)
  app.post('/whatsapp/send', auth, async (request, reply) => {
    const schema = z.object({
      nutritionist_id: z.string().uuid().optional(),
      instance_token:  z.string().optional(),
      phone:           z.string().min(8),
      text:            z.string().min(1),
      delay:           z.number().int().min(0).optional(),
      readmessages:    z.boolean().optional(),
    })

    const body = schema.parse(request.body)

    try {
      let token = body.instance_token

      if (!token && body.nutritionist_id) {
        // Não filtra por status = 'connected': essa coluna só se autocorrige
        // quando alguém abre Integrações, então fica defasada e já bloqueou
        // envios reais com a instância de fato conectada na uazapi (fonte de
        // verdade). sendMessage propaga erro se o envio realmente falhar.
        const conn = await queryOne<{ instance_token: string }>(
          `SELECT instance_token FROM whatsapp_connections
           WHERE nutritionist_id = $1 AND instance_token IS NOT NULL
           LIMIT 1`,
          [body.nutritionist_id]
        )
        token = conn?.instance_token
      }

      if (!token) {
        return reply.code(400).send({ error: 'instance_token ou nutritionist_id com instância conectada é obrigatório' })
      }

      await sendMessage(body.phone, body.text, token, {
        delay:        body.delay,
        readmessages: body.readmessages,
      })
      return reply.send({ ok: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar mensagem'
      return reply.code(502).send({ error: message })
    }
  })

  // ── PATCH /api/internal/appointments/:id/status ──────────
  // Atualiza status de um agendamento (ex: marcar como completed após consulta).
  app.patch('/appointments/:id/status', auth, async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({
      status: z.enum(['scheduled', 'confirmed', 'cancelled', 'completed']),
    })

    const { status } = schema.parse(request.body)

    const [updated] = await query(
      `UPDATE appointments SET status = $1 WHERE id = $2 RETURNING id, status, scheduled_at`,
      [status, id]
    )

    if (!updated) return reply.code(404).send({ error: 'Agendamento não encontrado' })
    return reply.send({ ok: true, appointment: updated })
  })

  // ── DELETE /api/internal/conversations/reset ─────────────
  // Apaga histórico de conversa de um número (útil para testes).
  // Body: { phone, nutritionist_id? }
  app.delete('/conversations/reset', auth, async (request, reply) => {
    const { phone, nutritionist_id } = request.body as { phone: string, nutritionist_id?: string }

    if (!phone) return reply.code(400).send({ error: 'phone obrigatório' })

    const params: unknown[] = [phone.replace(/\D/g, '')]
    let filter = nutritionist_id ? ` AND nutritionist_id = $2` : ''
    if (nutritionist_id) params.push(nutritionist_id)

    // Apaga mensagens das conversas desse número
    await query(`
      DELETE FROM messages WHERE conversation_id IN (
        SELECT id FROM conversations WHERE client_phone = $1${filter}
      )
    `, params)

    // Apaga as conversas
    const deleted = await query(
      `DELETE FROM conversations WHERE client_phone = $1${filter} RETURNING id`,
      params
    )

    return reply.send({ ok: true, deleted: deleted.length })
  })

  // ── GET /api/internal/conversations/open ─────────────────
  // Lista conversas ativas das últimas N horas (padrão 24h).
  // Útil para o n8n monitorar conversas sem resposta.
  app.get('/conversations/open', auth, async (request, reply) => {
    const { hours = '24', nutritionist_id } = request.query as Record<string, string>

    let sql = `
      SELECT
        conv.id,
        conv.client_phone,
        conv.status,
        conv.last_message_at,
        cl.name AS client_name,
        n.name  AS nutritionist_name,
        w.instance_token
      FROM conversations conv
      JOIN nutritionists n ON n.id = conv.nutritionist_id
      LEFT JOIN clients cl ON cl.phone = conv.client_phone AND cl.nutritionist_id = conv.nutritionist_id
      LEFT JOIN whatsapp_connections w ON w.nutritionist_id = conv.nutritionist_id
      WHERE conv.status = 'active'
        AND conv.last_message_at >= NOW() - INTERVAL '${Number(hours)} hours'
    `
    const params: unknown[] = []

    if (nutritionist_id) {
      params.push(nutritionist_id)
      sql += ` AND conv.nutritionist_id = $${params.length}`
    }

    sql += ' ORDER BY conv.last_message_at DESC'

    const conversations = await query(sql, params)
    return reply.send({ conversations })
  })

  // ── POST /api/internal/followups/run ─────────────────────
  // Dispara manualmente o follow-up de leads frios (teste / n8n).
  app.post('/followups/run', auth, async (_request, reply) => {
    runFollowupSequences().catch(console.error) // fire-and-forget
    return reply.send({ ok: true, message: 'Follow-up iniciado em background' })
  })

  // ── POST /api/internal/reminders/run ─────────────────────
  // Dispara manualmente os lembretes de consulta (teste / n8n).
  app.post('/reminders/run', auth, async (_request, reply) => {
    runAppointmentReminders().catch(console.error) // fire-and-forget
    return reply.send({ ok: true, message: 'Lembretes iniciados em background' })
  })

  // ── POST /api/internal/report/run ────────────────────────
  // Dispara manualmente o relatório semanal (teste).
  app.post('/report/run', auth, async (_request, reply) => {
    runWeeklyReport().catch(console.error) // fire-and-forget
    return reply.send({ ok: true, message: 'Relatório semanal iniciado em background' })
  })

  // ══════════════════════════════════════════════════════════════════
  // Endpoints internos para o n8n — prefixo /n8n/*
  // Autenticados via x-internal-key (mesmo auth acima).
  // O n8n é o único consumidor. Nunca expor publicamente.
  // ══════════════════════════════════════════════════════════════════

  // ── GET /api/internal/n8n/context ────────────────────────────────
  // Retorna o contexto completo que o n8n precisa para processar uma
  // mensagem: nutritionist, assistant, services, locations, client e
  // histórico recente da conversa.
  app.get('/n8n/context', auth, async (request, reply) => {
    const { nutritionist_id, client_phone } = request.query as Record<string, string>

    if (!nutritionist_id || !client_phone) {
      return reply.code(400).send({ error: 'nutritionist_id e client_phone são obrigatórios' })
    }

    try {
      // 1. Nutritionist + instância WhatsApp
      const nutritionist = await queryOne<any>(
        `SELECT n.id, n.name, n.phone, w.instance_token
         FROM nutritionists n
         LEFT JOIN whatsapp_connections w ON w.nutritionist_id = n.id
         WHERE n.id = $1`,
        [nutritionist_id]
      )
      if (!nutritionist) return reply.code(404).send({ error: 'Nutricionista não encontrada' })

      // 2. Assistente IA ativo
      const assistant = await queryOne<any>(
        `SELECT id, name, tone, greeting_message, farewell_message, pdf_content,
                frases_preferidas, frases_proibidas, custom_objections,
                conversation_examples, clinical_rules
         FROM assistants
         WHERE nutritionist_id = $1 AND is_active = true`,
        [nutritionist_id]
      )

      // 3. Serviços ativos
      const services = await query<any>(
        `SELECT id, name, price, modality, description
         FROM services
         WHERE nutritionist_id = $1 AND is_active = true
         ORDER BY sort_order, created_at`,
        [nutritionist_id]
      )

      // 4. Locais de atendimento ativos
      const locations = await query<any>(
        `SELECT id, name, city, address, modality
         FROM locations
         WHERE nutritionist_id = $1 AND is_active = true
         ORDER BY sort_order`,
        [nutritionist_id]
      )

      // 5. Busca ou cria cliente pelo telefone
      let client = await queryOne<any>(
        `SELECT id, name, phone, goal, stage, ai_summary, created_at, is_legacy_patient
         FROM clients
         WHERE nutritionist_id = $1 AND phone = $2`,
        [nutritionist_id, client_phone]
      )
      if (!client) {
        const rows = await query<any>(
          `INSERT INTO clients (nutritionist_id, phone, stage)
           VALUES ($1, $2, 'novo_contato')
           RETURNING id, name, phone, goal, stage, created_at`,
          [nutritionist_id, client_phone]
        )
        client = rows[0]
        notifyNewLead(nutritionist_id, client_phone) // fire-and-forget, não bloqueia o fluxo da IA
      }

      // 6. Busca ou cria conversa ativa
      let conversation = await queryOne<any>(
        `SELECT c.id, c.status, c.mode,
                (SELECT COUNT(*)::int FROM messages m WHERE m.conversation_id = c.id) AS message_count
         FROM conversations c
         WHERE c.nutritionist_id = $1 AND c.client_phone = $2 AND c.status = 'active'
         ORDER BY c.created_at DESC LIMIT 1`,
        [nutritionist_id, client_phone]
      )
      if (!conversation) {
        const rows = await query<any>(
          `INSERT INTO conversations (nutritionist_id, client_phone, client_id, status, last_message_at)
           VALUES ($1, $2, $3, 'active', NOW())
           RETURNING id, status, mode`,
          [nutritionist_id, client_phone, client.id]
        )
        conversation = { ...rows[0], message_count: 0 }
      }

      // 7. Últimas 10 mensagens (retorna em ordem cronológica ascendente)
      const rawMessages = await query<any>(
        `SELECT role, content AS text, sent_at AS created_at
         FROM messages
         WHERE conversation_id = $1
         ORDER BY sent_at DESC LIMIT 10`,
        [conversation.id]
      )
      const recentMessages = rawMessages.reverse().map((m: any) => ({
        sender: m.role === 'user' ? 'client' : 'assistant',
        text: m.text,
        created_at: m.created_at,
      }))

      // 8. Determina is_returning (tem agendamento anterior no sistema, OU veio
      // da importacao de pacientes antigos do David - is_legacy_patient marca
      // quem ja era paciente antes do sistema existir, sem historico aqui)
      const apptCountRow = await queryOne<any>(
        `SELECT COUNT(*)::int AS count FROM appointments
         WHERE client_id = $1 AND status != 'cancelled'`,
        [client.id]
      )
      const isReturning = (apptCountRow?.count ?? 0) > 0 || client.is_legacy_patient === true

      // 9. Próxima consulta futura (se houver) — permite a IA reconhecer "já agendada"
      // sem precisar perguntar de novo.
      const nextAppointment = await queryOne<any>(
        `SELECT a.id, a.scheduled_at, a.modality, l.name AS location_name, l.address, l.city
         FROM appointments a
         LEFT JOIN locations l ON l.id = a.location_id
         WHERE a.client_id = $1 AND a.status != 'cancelled' AND a.scheduled_at > NOW()
         ORDER BY a.scheduled_at ASC LIMIT 1`,
        [client.id]
      )

      // 10. Última consulta passada (se houver) — ajuda a IA a distinguir paciente
      // atual/antigo de lead novo, mesmo sem consulta futura marcada.
      const lastAppointment = await queryOne<any>(
        `SELECT scheduled_at, status
         FROM appointments
         WHERE client_id = $1 AND status != 'cancelled' AND scheduled_at <= NOW()
         ORDER BY scheduled_at DESC LIMIT 1`,
        [client.id]
      )

      return reply.send({
        nutritionist: {
          id: nutritionist.id,
          name: nutritionist.name,
          phone: nutritionist.phone,
        },
        whatsapp: {
          instance_token:  nutritionist.instance_token,
          uazapi_base_url: process.env.UAZAPI_BASE_URL || '',
        },
        assistant: assistant ? {
          id: assistant.id,
          name: assistant.name,
          tone: assistant.tone,
          greeting_message: assistant.greeting_message,
          farewell_message: assistant.farewell_message,
          pdf_content: assistant.pdf_content,
          frases_preferidas: assistant.frases_preferidas ?? [],
          frases_proibidas: assistant.frases_proibidas ?? [],
          custom_objections: assistant.custom_objections ?? [],
          conversation_examples: assistant.conversation_examples ?? [],
          clinical_rules: assistant.clinical_rules ?? [],
        } : null,
        services,
        locations,
        client: {
          id: client.id,
          name: client.name,
          phone: client.phone,
          goal: client.goal,
          stage: client.stage || 'novo_contato',
          is_returning: isReturning,
          ai_summary: client.ai_summary ?? null,
          has_upcoming_appointment: !!nextAppointment,
          next_appointment: nextAppointment ? {
            scheduled_at:  nextAppointment.scheduled_at,
            modality:      nextAppointment.modality,
            location_name: nextAppointment.location_name,
            address:       nextAppointment.address,
            city:          nextAppointment.city,
          } : null,
          last_appointment: lastAppointment ? {
            scheduled_at: lastAppointment.scheduled_at,
            status:       lastAppointment.status,
          } : null,
        },
        conversation: {
          id: conversation.id,
          status: conversation.status,
          mode: conversation.mode,
          message_count: conversation.message_count,
        },
        recent_messages: recentMessages,
      })
    } catch (err) {
      app.log.error({ err }, '[n8n/context] Erro ao buscar contexto')
      return reply.code(500).send({ error: 'Erro interno ao buscar contexto' })
    }
  })

  // ── GET /api/internal/n8n/available-slots ─────────────────────────
  // Retorna horários disponíveis para uma data específica.
  // Para presencial exige city e verifica date_location_overrides.
  // Para online apenas verifica a disponibilidade semanal configurada.
  app.get('/n8n/available-slots', auth, async (request, reply) => {
    const { nutritionist_id, date, modality, city } = request.query as Record<string, string>

    if (!nutritionist_id || !date || !modality) {
      return reply.code(400).send({ error: 'nutritionist_id, date e modality são obrigatórios' })
    }
    if (modality === 'presencial' && !city) {
      return reply.code(400).send({ error: 'city é obrigatório para modalidade presencial' })
    }

    try {
      // Calcula dia da semana (evita bug de UTC: parse direto dos componentes)
      const [yearN, monthN, dayN] = date.split('-').map(Number)
      const targetDate = new Date(yearN, monthN - 1, dayN)
      const dayOfWeek = targetDate.getDay()

      // Verifica data bloqueada manualmente
      const blocked = await queryOne<any>(
        `SELECT id FROM blocked_dates WHERE nutritionist_id = $1 AND blocked_date = $2`,
        [nutritionist_id, date]
      )
      if (blocked) {
        return reply.send({ available: false, reason: 'Data bloqueada pelo nutricionista' })
      }

      // Busca os horarios do dia. Online usa a agenda propria (colunas online_*
      // em nutritionists). Presencial usa o horario DESSE DIA especifico em
      // date_location_overrides (o nutri define local + horario juntos no
      // calendario — nao existe mais grade semanal fixa, o horario muda de
      // local pra local). Override sem horario definido cai no fallback.
      const DEFAULT_START = '08:00', DEFAULT_END = '18:00', DEFAULT_SLOT = 30
      let avail: any
      let locationData: { id: string; name: string; address: string | null } | null = null

      if (modality === 'online') {
        const cfg = await queryOne<any>(
          `SELECT online_enabled, online_weekdays,
                  online_start::text AS start_time, online_end::text AS end_time,
                  online_slot_duration AS slot_duration,
                  online_break_start::text AS break_start, online_break_end::text AS break_end,
                  min_advance_hours, max_appointments_per_day
           FROM nutritionists WHERE id = $1`,
          [nutritionist_id]
        )
        const weekdays: number[] = cfg?.online_weekdays ?? []
        if (!cfg?.online_enabled || !weekdays.includes(dayOfWeek)) {
          return reply.send({ available: false, reason: 'Sem atendimento online neste dia da semana' })
        }
        avail = cfg
      } else {
        const override = await queryOne<any>(
          `SELECT dlo.location_id, l.name, l.address, l.city,
                  dlo.start_time::text AS start_time, dlo.end_time::text AS end_time,
                  dlo.slot_duration,
                  dlo.break_start::text AS break_start, dlo.break_end::text AS break_end,
                  n.min_advance_hours, n.max_appointments_per_day
           FROM date_location_overrides dlo
           JOIN locations l ON l.id = dlo.location_id
           JOIN nutritionists n ON n.id = dlo.nutritionist_id
           WHERE dlo.nutritionist_id = $1 AND dlo.date = $2
             AND l.city ILIKE $3`,
          [nutritionist_id, date, `%${city}%`]
        )
        if (!override) {
          return reply.send({
            available: false,
            reason: `Sem atendimento presencial em ${city} nessa data`,
          })
        }
        locationData = { id: override.location_id, name: override.name, address: override.address }
        avail = {
          start_time:    override.start_time ?? DEFAULT_START,
          end_time:      override.end_time ?? DEFAULT_END,
          slot_duration: override.slot_duration ?? DEFAULT_SLOT,
          break_start: override.break_start ?? null,
          break_end: override.break_end ?? null,
          min_advance_hours: override.min_advance_hours,
          max_appointments_per_day: override.max_appointments_per_day,
        }
      }

      // Busca agendamentos existentes para a data
      const existingAppts = await query<any>(
        `SELECT scheduled_at FROM appointments
         WHERE nutritionist_id = $1
           AND DATE(scheduled_at AT TIME ZONE 'America/Sao_Paulo') = $2
           AND status IN ('scheduled', 'confirmed')`,
        [nutritionist_id, date]
      )

      // Verifica max_appointments_per_day
      const maxPerDay: number = avail.max_appointments_per_day ?? 8
      if (existingAppts.length >= maxPerDay) {
        return reply.send({ available: false, reason: 'Limite de agendamentos do dia atingido' })
      }

      // Horários ocupados em BRT (HH:MM)
      const bookedTimes = new Set<string>(
        existingAppts.map((a: any) => {
          const d = new Date(a.scheduled_at)
          const bStr = d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
          return new Date(bStr).toTimeString().slice(0, 5)
        })
      )

      // Bloqueios de calendário (calendar_blocks)
      const calBlocks = await query<any>(
        `SELECT starts_at, ends_at FROM calendar_blocks
         WHERE nutritionist_id = $1
           AND starts_at < ($2::date + INTERVAL '1 day')::timestamptz
           AND ends_at > $2::date::timestamptz`,
        [nutritionist_id, date]
      ).catch(() => [] as any[])

      // Agora em BRT para aplicar min_advance_hours
      const nowBrt = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
      const minAdvanceHours: number = avail.min_advance_hours ?? 3
      const minSlotDatetime = new Date(nowBrt.getTime() + minAdvanceHours * 60 * 60 * 1000)

      // Gera slots
      const slotDur: number = avail.slot_duration || 60
      const [startH, startM] = avail.start_time.slice(0, 5).split(':').map(Number)
      const [endH, endM]   = avail.end_time.slice(0, 5).split(':').map(Number)

      const breakStart = avail.break_start
        ? (() => { const [bH, bM] = avail.break_start.slice(0, 5).split(':').map(Number); return bH * 60 + bM })()
        : null
      const breakEnd = avail.break_end
        ? (() => { const [bH, bM] = avail.break_end.slice(0, 5).split(':').map(Number); return bH * 60 + bM })()
        : null

      const slots: string[] = []
      let currentMin = startH * 60 + startM
      const endMin = endH * 60 + endM

      while (currentMin + slotDur <= endMin) {
        // Pula slots dentro da pausa
        if (breakStart !== null && breakEnd !== null) {
          if (currentMin >= breakStart && currentMin < breakEnd) {
            currentMin += slotDur
            continue
          }
          if (currentMin < breakStart && currentMin + slotDur > breakStart) {
            currentMin = breakEnd
            continue
          }
        }

        const h = Math.floor(currentMin / 60).toString().padStart(2, '0')
        const m = (currentMin % 60).toString().padStart(2, '0')
        const timeStr = `${h}:${m}`

        // Slot como Date local (BRT via construção com componentes)
        const slotDatetime = new Date(yearN, monthN - 1, dayN, Number(h), Number(m))

        // Aplica min_advance_hours
        if (slotDatetime <= minSlotDatetime) {
          currentMin += slotDur
          continue
        }

        // Verifica ocupação
        if (bookedTimes.has(timeStr)) {
          currentMin += slotDur
          continue
        }

        // Verifica calendar_blocks
        const slotEnd = new Date(slotDatetime.getTime() + slotDur * 60 * 1000)
        const blockedByCalendar = calBlocks.some((b: any) => {
          const bStart = new Date(b.starts_at)
          const bEnd = new Date(b.ends_at)
          return slotDatetime < bEnd && slotEnd > bStart
        })
        if (blockedByCalendar) {
          currentMin += slotDur
          continue
        }

        slots.push(timeStr)
        currentMin += slotDur
      }

      return reply.send({
        available: true,
        date,
        modality,
        city: city || null,
        location: locationData,
        slots,
        slot_duration_minutes: slotDur,
      })
    } catch (err) {
      app.log.error({ err }, '[n8n/available-slots] Erro ao buscar slots')
      return reply.code(500).send({ error: 'Erro interno ao buscar slots disponíveis' })
    }
  })

  // ── GET /api/internal/n8n/available-dates ────────────────────────────
  // Retorna datas disponíveis para agendamento dentro de um único mês.
  // Usado pelo n8n para oferecer datas ao paciente após ele informar a cidade
  // (presencial) ou depois de confirmar interesse (online).
  // Query params:
  //   nutritionist_id — obrigatório
  //   modality        — 'presencial' | 'online' (obrigatório)
  //   city            — nome da cidade (obrigatório se modality=presencial)
  //   month           — opcional, formato YYYY-MM. Sem isso, usa o mês atual.
  //                     Nunca retorna datas antes de hoje, mesmo se month for o mês atual.
  //   scope           — opcional, 'hoje' | 'semana'. Restringe o limite superior pra
  //                     hoje ou pro fim da semana corrente (domingo) em vez do mês
  //                     inteiro — usado quando o lead pede "hoje" ou "essa semana"
  //                     em vez de um mês específico.
  app.get('/n8n/available-dates', auth, async (request, reply) => {
    const { nutritionist_id, modality, city, month, scope } = request.query as Record<string, string>

    if (!nutritionist_id || !modality) {
      return reply.code(400).send({ error: 'nutritionist_id e modality são obrigatórios' })
    }
    if (!['presencial', 'online'].includes(modality)) {
      return reply.code(400).send({ error: 'modality deve ser "presencial" ou "online"' })
    }
    if (modality === 'presencial' && !city) {
      return reply.code(400).send({ error: 'city é obrigatório para modality=presencial' })
    }

    // Resolve o mês alvo (padrão: mês atual) e limita o início ao dia de hoje,
    // pra nunca oferecer uma data que já passou.
    const now = new Date()
    let targetYear = now.getFullYear()
    let targetMonthIdx = now.getMonth() // 0-indexed
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number)
      targetYear = y
      targetMonthIdx = m - 1
    }
    const monthStart         = new Date(targetYear, targetMonthIdx, 1)
    let monthEndExclusive    = new Date(targetYear, targetMonthIdx + 1, 1)
    const today               = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const rangeStartDate      = monthStart > today ? monthStart : today
    const monthLabel          = `${targetYear}-${String(targetMonthIdx + 1).padStart(2, '0')}`
    const periodLabel         = scope === 'hoje' ? 'hoje' : scope === 'semana' ? 'nessa semana' : `em ${monthLabel}`

    // Lead pediu especificamente "hoje" ou "essa semana" — restringe o limite
    // superior em vez do mês inteiro. Nunca amplia o intervalo, só reduz (min
    // entre o fim do mês e o fim do escopo pedido).
    if (scope === 'semana') {
      const dayOfWeek = rangeStartDate.getDay() // 0 = domingo
      const daysUntilSunday = (7 - dayOfWeek) % 7
      const endOfWeekExclusive = new Date(rangeStartDate)
      endOfWeekExclusive.setDate(endOfWeekExclusive.getDate() + daysUntilSunday + 1)
      if (endOfWeekExclusive < monthEndExclusive) {
        monthEndExclusive = endOfWeekExclusive
      }
    } else if (scope === 'hoje') {
      const endOfTodayExclusive = new Date(rangeStartDate)
      endOfTodayExclusive.setDate(endOfTodayExclusive.getDate() + 1)
      if (endOfTodayExclusive < monthEndExclusive) {
        monthEndExclusive = endOfTodayExclusive
      }
    }

    // Arrays estáticos em português — sem biblioteca de datas externa
    const PT_DAYS_LONG  = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
    const PT_DAYS_LABEL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const PT_MONTHS     = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

    /** Formata Date em "YYYY-MM-DD" usando componentes locais (sem UTC shift). */
    function toDateStr(d: Date): string {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    /** Constrói Date local a partir de "YYYY-MM-DD" sem risco de UTC shift. */
    function parseDateLocal(s: string): Date {
      const [y, m, d] = s.split('-').map(Number)
      return new Date(y, m - 1, d)
    }

    /** Monta label legível: "Quarta, 02 de julho". */
    function buildLabel(d: Date): string {
      return `${PT_DAYS_LABEL[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} de ${PT_MONTHS[d.getMonth()]}`
    }

    try {
      // Busca max_appointments_per_day do nutricionista
      const nutri = await queryOne<any>(
        `SELECT max_appointments_per_day FROM nutritionists WHERE id = $1`,
        [nutritionist_id]
      )
      if (!nutri) {
        return reply.code(404).send({ error: 'Nutricionista não encontrada' })
      }
      const maxPerDay: number = nutri.max_appointments_per_day ?? 8

      // ── Presencial ───────────────────────────────────────────────────
      if (modality === 'presencial') {
        // Query otimizada: traz todos os dados necessários em uma única round-trip.
        // Subqueries verificam: (1) availability ativa para o dia da semana,
        // (2) se a data está bloqueada, (3) quantidade de agendamentos confirmados no dia.
        const rows = await query<any>(
          `SELECT
             dlo.date::text                      AS date,
             l.name                              AS location_name,
             l.address                           AS location_address,
             EXTRACT(DOW FROM dlo.date)::int     AS dow,
             (
               SELECT COUNT(*)::int
               FROM appointments a
               WHERE a.nutritionist_id = $1
                 AND DATE(a.scheduled_at AT TIME ZONE 'America/Sao_Paulo') = dlo.date
                 AND a.status IN ('scheduled', 'confirmed')
             )                                   AS appt_count,
             EXISTS (
               SELECT 1 FROM availability av
               WHERE av.nutritionist_id = $1
                 AND av.day_of_week = EXTRACT(DOW FROM dlo.date)::int
                 AND av.is_active = true
             )                                   AS has_availability,
             EXISTS (
               SELECT 1 FROM blocked_dates bd
               WHERE bd.nutritionist_id = $1
                 AND bd.blocked_date = dlo.date
             )                                   AS is_blocked
           FROM date_location_overrides dlo
           JOIN locations l ON l.id = dlo.location_id
           WHERE dlo.nutritionist_id = $1
             AND dlo.date >= $3
             AND dlo.date < $4
             AND l.city ILIKE $2
           ORDER BY dlo.date ASC`,
          [nutritionist_id, `%${city}%`, toDateStr(rangeStartDate), toDateStr(monthEndExclusive)]
        )

        const dates = rows
          .filter((r: any) => r.has_availability && !r.is_blocked && r.appt_count < maxPerDay)
          .map((r: any) => {
            const d = parseDateLocal(r.date as string)
            return {
              date:        r.date as string,
              label:       buildLabel(d),
              day_of_week: PT_DAYS_LONG[r.dow as number],
              location: {
                name:    r.location_name    as string,
                address: (r.location_address as string | null) ?? null,
              },
            }
          })

        if (!dates.length) {
          return reply.send({
            available: false,
            reason: `Não há datas disponíveis para ${city} ${periodLabel}. Posso tentar outro mês.`,
            month: monthLabel,
          })
        }

        return reply.send({ modality, city, month: monthLabel, dates })
      }

      // ── Online ───────────────────────────────────────────────────────
      // 1. Dias da semana em que o nutri atende online (agenda propria, NAO
      //    a availability do presencial — ver colunas online_* em nutritionists)
      const onlineCfg = await queryOne<any>(
        `SELECT online_enabled, online_weekdays FROM nutritionists WHERE id = $1`,
        [nutritionist_id]
      )
      if (!onlineCfg?.online_enabled || !(onlineCfg.online_weekdays?.length)) {
        return reply.send({
          available: false,
          reason: 'Atendimento online não está disponível no momento.',
        })
      }
      const activeDays = new Set<number>((onlineCfg.online_weekdays as number[]))

      // 2. Gera candidatos dentro do mês alvo, nos dias ativos.
      //    Sempre a partir de amanhã (nunca hoje), mesmo se o mês alvo for o atual.
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      const onlineRangeStart = rangeStartDate > tomorrow ? rangeStartDate : tomorrow

      const candidateDateStrs: string[] = []
      const cursor = new Date(onlineRangeStart)
      while (cursor < monthEndExclusive) {
        if (activeDays.has(cursor.getDay())) {
          candidateDateStrs.push(toDateStr(cursor))
        }
        cursor.setDate(cursor.getDate() + 1)
      }

      if (!candidateDateStrs.length) {
        return reply.send({
          available: false,
          reason: `Sem disponibilidade para atendimento online em ${monthLabel}. Posso tentar outro mês.`,
          month: monthLabel,
        })
      }

      // 3. Batch: busca datas bloqueadas no intervalo (uma única query)
      const rangeStart = candidateDateStrs[0]
      const rangeEnd   = candidateDateStrs[candidateDateStrs.length - 1]

      const blockedRows = await query<any>(
        `SELECT blocked_date::text AS blocked_date
         FROM blocked_dates
         WHERE nutritionist_id = $1
           AND blocked_date BETWEEN $2 AND $3`,
        [nutritionist_id, rangeStart, rangeEnd]
      )
      const blockedSet = new Set<string>(blockedRows.map((r: any) => r.blocked_date as string))

      // 4. Batch: contagem de agendamentos por data no intervalo (uma única query)
      const apptCountRows = await query<any>(
        `SELECT
           DATE(scheduled_at AT TIME ZONE 'America/Sao_Paulo')::text AS date,
           COUNT(*)::int AS count
         FROM appointments
         WHERE nutritionist_id = $1
           AND DATE(scheduled_at AT TIME ZONE 'America/Sao_Paulo') BETWEEN $2 AND $3
           AND status IN ('scheduled', 'confirmed')
         GROUP BY 1`,
        [nutritionist_id, rangeStart, rangeEnd]
      )
      const apptCountMap = new Map<string, number>(
        apptCountRows.map((r: any) => [r.date as string, r.count as number])
      )

      // 5. Filtra e monta resposta.
      //    min_advance_hours não se aplica aqui: candidatos começam sempre de amanhã.
      const dates = candidateDateStrs
        .filter(ds => !blockedSet.has(ds) && (apptCountMap.get(ds) ?? 0) < maxPerDay)
        .map(ds => {
          const d = parseDateLocal(ds)
          return {
            date:        ds,
            label:       buildLabel(d),
            day_of_week: PT_DAYS_LONG[d.getDay()],
          }
        })

      if (!dates.length) {
        return reply.send({
          available: false,
          reason: `Não há datas disponíveis para atendimento online ${periodLabel}. Posso tentar outro mês.`,
          month: monthLabel,
        })
      }

      return reply.send({ modality, month: monthLabel, dates })

    } catch (err) {
      app.log.error({ err }, '[n8n/available-dates] Erro ao buscar datas disponíveis')
      return reply.code(500).send({ error: 'Erro interno ao buscar datas disponíveis' })
    }
  })

  // ── POST /api/internal/n8n/appointments ───────────────────────────
  // Cria um agendamento. Retornar appointment_id é OBRIGATÓRIO — a IA
  // nunca pode confirmar ao paciente sem ele.
  app.post('/n8n/appointments', auth, async (request, reply) => {
    // .nullish() (não .optional()): o n8n envia os campos ausentes como `null`
    // explícito no JSON (ex: client_name quando o lead não deu o nome), e
    // z.string().optional() rejeita null — quebrava a criação do agendamento
    // no fechamento da venda. nullish aceita string | null | undefined.
    const schema = z.object({
      nutritionist_id: z.string().uuid(),
      client_phone:    z.string().min(8),
      client_name:     z.string().nullish(),
      scheduled_at:    z.string().min(1),
      modality:        z.enum(['presencial', 'online']),
      city:            z.string().nullish(),
      notes:           z.string().nullish(),
      service_id:      z.string().uuid().nullish(),
    })

    let body: z.infer<typeof schema>
    try {
      body = schema.parse(request.body)
    } catch (err) {
      return reply.code(400).send({ error: 'Dados inválidos', details: (err as Error).message })
    }

    const { nutritionist_id, client_phone, client_name, scheduled_at, modality, city, notes } = body

    try {
      // 1. Busca ou cria cliente
      let client = await queryOne<any>(
        `SELECT id, name FROM clients WHERE nutritionist_id = $1 AND phone = $2`,
        [nutritionist_id, client_phone]
      )
      if (!client) {
        const rows = await query<any>(
          `INSERT INTO clients (nutritionist_id, phone, name, stage)
           VALUES ($1, $2, $3, 'novo_contato')
           RETURNING id, name`,
          [nutritionist_id, client_phone, client_name || 'Cliente']
        )
        client = rows[0]
      } else if (client_name && client.name !== client_name) {
        await query(`UPDATE clients SET name = $1 WHERE id = $2`, [client_name, client.id])
        client.name = client_name
      }

      // 2. Verifica conflito de slot (mesmo horário + mesmo nutricionista)
      const scheduledDatetime = new Date(scheduled_at)
      const conflict = await queryOne<any>(
        `SELECT id FROM appointments
         WHERE nutritionist_id = $1
           AND scheduled_at = $2
           AND status IN ('scheduled', 'confirmed')`,
        [nutritionist_id, scheduledDatetime.toISOString()]
      )
      if (conflict) {
        return reply.code(409).send({ error: 'Horário não disponível', code: 'SLOT_TAKEN' })
      }

      // 3. Resolve location_id
      const dateStr = scheduledDatetime.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
      let location_id: string | null = null
      let locationData: { id: string; name: string; address: string | null } | null = null

      if (modality === 'presencial' && city) {
        // Tenta date_location_overrides primeiro (atualizado na agenda do nutri)
        const override = await queryOne<any>(
          `SELECT dlo.location_id, l.name, l.address
           FROM date_location_overrides dlo
           JOIN locations l ON l.id = dlo.location_id
           WHERE dlo.nutritionist_id = $1 AND dlo.date = $2
             AND l.city ILIKE $3`,
          [nutritionist_id, dateStr, `%${city}%`]
        )
        if (override) {
          location_id = override.location_id
          locationData = { id: override.location_id, name: override.name, address: override.address }
        } else {
          // Fallback: qualquer local ativo nessa cidade
          const loc = await queryOne<any>(
            `SELECT id, name, address FROM locations
             WHERE nutritionist_id = $1 AND city ILIKE $2 AND is_active = true
             ORDER BY sort_order LIMIT 1`,
            [nutritionist_id, `%${city}%`]
          )
          if (loc) {
            location_id = loc.id
            locationData = { id: loc.id, name: loc.name, address: loc.address }
          }
        }
      } else if (modality === 'online') {
        const loc = await queryOne<any>(
          `SELECT id, name, address FROM locations
           WHERE nutritionist_id = $1 AND modality IN ('online', 'ambos') AND is_active = true
           ORDER BY sort_order LIMIT 1`,
          [nutritionist_id]
        )
        if (loc) {
          location_id = loc.id
          locationData = { id: loc.id, name: loc.name, address: loc.address }
        }
      }

      // 4. Busca slot_duration do dia. Presencial: horario e por data especifica
      // (date_location_overrides); online: agenda propria (online_slot_duration).
      let duration = 50
      if (modality === 'presencial') {
        const override = await queryOne<any>(
          `SELECT slot_duration FROM date_location_overrides WHERE nutritionist_id = $1 AND date = $2`,
          [nutritionist_id, dateStr]
        )
        duration = override?.slot_duration ?? 30
      } else {
        const nutri = await queryOne<any>(
          `SELECT online_slot_duration FROM nutritionists WHERE id = $1`,
          [nutritionist_id]
        )
        duration = nutri?.online_slot_duration ?? 30
      }

      // 5. Cria o agendamento
      // payment_status='pending' só pro presencial: a IA agenda a Avaliação
      // Inicial (R$600) sem cobrar - etiqueta pro David decidir se cobra na
      // hora ou só depois da consulta. Online não passa por aqui (a IA não
      // agenda nada online, só encaminha pro time fechar o plano).
      const paymentStatus = modality === 'presencial' ? 'pending' : null
      const apptRows = await query<any>(
        `INSERT INTO appointments
           (nutritionist_id, client_id, client_phone, scheduled_at, modality, city,
            location_id, notes, created_by, status, duration, payment_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'assistant', 'scheduled', $9, $10)
         RETURNING id, scheduled_at`,
        [
          nutritionist_id, client.id, client_phone,
          scheduledDatetime.toISOString(),
          modality, city || null,
          location_id, notes || null,
          duration, paymentStatus,
        ]
      )
      const appt = apptRows[0]

      // 6. Avança o funil do cliente
      await query(
        `UPDATE clients SET stage = 'consulta_marcada', stage_updated_at = NOW() WHERE id = $1`,
        [client.id]
      )

      return reply.send({
        ok: true,
        appointment_id: appt.id,
        scheduled_at: appt.scheduled_at,
        location: locationData,
      })
    } catch (err) {
      app.log.error({ err, body }, '[n8n/appointments] Erro ao criar agendamento')
      return reply.code(500).send({ error: 'Erro interno ao criar agendamento' })
    }
  })

  // ── POST /api/internal/n8n/messages ───────────────────────────────
  // Persiste uma mensagem na conversa (usada pelo n8n para salvar
  // as respostas da IA e mensagens do cliente).
  app.post('/n8n/messages', auth, async (request, reply) => {
    const schema = z.object({
      nutritionist_id: z.string().uuid(),
      client_phone:    z.string().min(8),
      text:            z.string().min(1),
      sender:          z.enum(['assistant', 'user']),
      metadata:        z.record(z.unknown()).optional(),
    })

    let body: z.infer<typeof schema>
    try {
      body = schema.parse(request.body)
    } catch (err) {
      return reply.code(400).send({ error: 'Dados inválidos', details: (err as Error).message })
    }

    const { nutritionist_id, client_phone, text, sender } = body
    const role = sender === 'assistant' ? 'assistant' : 'user'

    try {
      // Busca conversa ativa
      let conversation = await queryOne<any>(
        `SELECT id FROM conversations
         WHERE nutritionist_id = $1 AND client_phone = $2 AND status = 'active'
         ORDER BY created_at DESC LIMIT 1`,
        [nutritionist_id, client_phone]
      )

      if (!conversation) {
        // Cria conversa caso ainda não exista
        const client = await queryOne<any>(
          `SELECT id FROM clients WHERE nutritionist_id = $1 AND phone = $2`,
          [nutritionist_id, client_phone]
        )
        const rows = await query<any>(
          `INSERT INTO conversations (nutritionist_id, client_phone, client_id, status, last_message_at)
           VALUES ($1, $2, $3, 'active', NOW())
           RETURNING id`,
          [nutritionist_id, client_phone, client?.id ?? null]
        )
        conversation = rows[0]
      }

      const msgRows = await query<any>(
        `INSERT INTO messages (conversation_id, role, content)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [conversation.id, role, text]
      )

      await query(
        `UPDATE conversations SET last_message_at = NOW() WHERE id = $1`,
        [conversation.id]
      )

      return reply.send({ ok: true, message_id: msgRows[0].id })
    } catch (err) {
      app.log.error({ err }, '[n8n/messages] Erro ao salvar mensagem')
      return reply.code(500).send({ error: 'Erro interno ao salvar mensagem' })
    }
  })

  // ── PATCH /api/internal/n8n/clients/:phone/stage ──────────────────
  // Atualiza o estágio do funil de um cliente pelo telefone.
  // Mais fácil para o n8n usar do que pelo client_id.
  app.patch('/n8n/clients/:phone/stage', auth, async (request, reply) => {
    const { phone } = request.params as { phone: string }
    const { nutritionist_id } = request.query as Record<string, string>

    const schema = z.object({
      stage: z.enum([
        'novo_contato', 'em_atendimento', 'qualificado',
        'avaliando', 'agendamento_pendente', 'consulta_marcada', 'perdido',
      ]),
    })

    let body: z.infer<typeof schema>
    try {
      body = schema.parse(request.body)
    } catch (err) {
      return reply.code(400).send({ error: 'Stage inválido', details: (err as Error).message })
    }

    if (!nutritionist_id) {
      return reply.code(400).send({ error: 'nutritionist_id é obrigatório (query param)' })
    }

    try {
      const updated = await queryOne<any>(
        `UPDATE clients SET stage = $1, stage_updated_at = NOW()
         WHERE nutritionist_id = $2 AND phone = $3
         RETURNING id, stage`,
        [body.stage, nutritionist_id, phone]
      )
      if (!updated) {
        return reply.code(404).send({ error: 'Cliente não encontrado' })
      }
      return reply.send({ ok: true, stage: updated.stage })
    } catch (err) {
      app.log.error({ err }, '[n8n/clients/stage] Erro ao atualizar stage')
      return reply.code(500).send({ error: 'Erro interno ao atualizar stage' })
    }
  })

  // ── PATCH /api/internal/n8n/clients/:phone/summary ────────────────
  // Atualiza o resumo de IA (memória longa) de um cliente pelo telefone.
  // Chamado pelo n8n após cada interação para acumular contexto do lead:
  // objetivo, preferências, histórico de perguntas, etc.
  // A fusão/síntese do texto é feita pelo n8n (LLM separado) — a API só persiste.
  app.patch('/n8n/clients/:phone/summary', auth, async (request, reply) => {
    const { phone } = request.params as { phone: string }
    const { nutritionist_id } = request.query as Record<string, string>

    const schema = z.object({
      summary: z.string().min(1).max(4000),
    })

    let body: z.infer<typeof schema>
    try {
      body = schema.parse(request.body)
    } catch (err) {
      return reply.code(400).send({ error: 'Dados inválidos', details: (err as Error).message })
    }

    if (!nutritionist_id) {
      return reply.code(400).send({ error: 'nutritionist_id é obrigatório (query param)' })
    }

    try {
      const updated = await queryOne<any>(
        `UPDATE clients SET ai_summary = $1, ai_summary_updated_at = NOW()
         WHERE nutritionist_id = $2 AND phone = $3
         RETURNING id`,
        [body.summary, nutritionist_id, phone]
      )
      if (!updated) {
        return reply.code(404).send({ error: 'Cliente não encontrado' })
      }
      return reply.send({ ok: true })
    } catch (err) {
      app.log.error({ err }, '[n8n/clients/summary] Erro ao atualizar ai_summary')
      return reply.code(500).send({ error: 'Erro interno ao atualizar resumo do cliente' })
    }
  })

  // ── PATCH /api/internal/n8n/conversations/:phone/takeover ─────────
  // Marca a conversa ativa mais recente do telefone como 'human_takeover'.
  // Usado pelo Orquestrador ao escalar para humano, pra evitar reclassificar
  // e reenviar a mensagem de escalação a cada nova mensagem do lead —
  // webhook.routes.ts já bloqueia o encaminhamento pro n8n quando a conversa
  // está nesse status.
  app.patch('/n8n/conversations/:phone/takeover', auth, async (request, reply) => {
    const { phone } = request.params as { phone: string }
    const { nutritionist_id } = request.query as Record<string, string>

    if (!nutritionist_id) {
      return reply.code(400).send({ error: 'nutritionist_id é obrigatório (query param)' })
    }

    try {
      const updated = await queryOne<any>(
        `UPDATE conversations SET status = 'human_takeover'
         WHERE id = (
           SELECT id FROM conversations
           WHERE nutritionist_id = $1 AND client_phone = $2
           ORDER BY created_at DESC LIMIT 1
         )
         RETURNING id, status`,
        [nutritionist_id, phone]
      )
      if (!updated) {
        return reply.code(404).send({ error: 'Conversa não encontrada' })
      }
      return reply.send({ ok: true, conversation: updated })
    } catch (err) {
      app.log.error({ err }, '[n8n/conversations/takeover] Erro ao marcar takeover')
      return reply.code(500).send({ error: 'Erro interno ao marcar takeover' })
    }
  })

  // ── POST /api/internal/n8n/automation-logs ────────────────────────
  // Registra execuções do n8n para auditoria e debugging.
  app.post('/n8n/automation-logs', auth, async (request, reply) => {
    // nutritionist_id: aceita string livre (o fluxo de erro do n8n às vezes manda
    // literais como 'unknown' quando não sabe o valor real) - só usamos o valor
    // se for de fato um UUID válido, senão gravamos null. Isso é só uma tabela de
    // log/auditoria, não faz sentido rejeitar a escrita inteira por causa disso -
    // rejeitar aqui apagava o log de erro do próprio workflow que estava falhando.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const schema = z.object({
      nutritionist_id: z.string().optional(),
      client_phone:    z.string().optional(),
      event_type:      z.string().min(1),
      agent_used:      z.string().optional(),
      input_summary:   z.string().optional(),
      output_summary:  z.string().optional(),
      success:         z.boolean().default(true),
      error:           z.string().nullable().optional(),
    })

    let body: z.infer<typeof schema>
    try {
      body = schema.parse(request.body)
    } catch (err) {
      return reply.code(400).send({ error: 'Dados inválidos', details: (err as Error).message })
    }

    try {
      const rows = await query<any>(
        `INSERT INTO automation_logs
           (nutritionist_id, client_phone, event_type, agent_used,
            input_summary, output_summary, success, error)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          body.nutritionist_id && UUID_RE.test(body.nutritionist_id) ? body.nutritionist_id : null,
          body.client_phone ?? null,
          body.event_type,
          body.agent_used ?? null,
          body.input_summary ?? null,
          body.output_summary ?? null,
          body.success ?? true,
          body.error ?? null,
        ]
      )
      return reply.send({ ok: true, log_id: rows[0].id })
    } catch (err) {
      app.log.error({ err }, '[n8n/automation-logs] Erro ao registrar log')
      return reply.code(500).send({ error: 'Erro interno ao registrar log de automação' })
    }
  })

  // ── POST /api/internal/n8n/payments/create-charge ─────────────────
  // Cria uma cobrança PIX no Asaas para o paciente, vinculada a um agendamento.
  // Requer que o nutricionista tenha asaas_api_key configurada.
  app.post('/n8n/payments/create-charge', auth, async (request, reply) => {
    const schema = z.object({
      nutritionist_id: z.string().uuid(),
      appointment_id:  z.string().uuid().optional(),
      amount:          z.number().positive(),
      type:            z.enum(['sinal', 'integral']),
      due_date:        z.string().optional(),
      client_name:     z.string().min(1),
      client_cpf:      z.string().optional(),
      client_phone:    z.string().min(8),
    })

    let body: z.infer<typeof schema>
    try {
      body = schema.parse(request.body)
    } catch (err) {
      return reply.code(400).send({ error: 'Dados inválidos', details: (err as Error).message })
    }

    try {
      // 1. Busca a chave Asaas do nutricionista
      const nutri = await queryOne<{ asaas_api_key: string | null }>(
        'SELECT asaas_api_key FROM nutritionists WHERE id = $1',
        [body.nutritionist_id]
      )
      if (!nutri?.asaas_api_key) {
        return reply.code(422).send({ error: 'Nutricionista sem asaas_api_key configurada' })
      }

      const asaasKey    = nutri.asaas_api_key
      const asaasBase   = 'https://api.asaas.com/v3'
      const asaasHeaders = {
        'Content-Type': 'application/json',
        'access_token': asaasKey,
      }

      // 2. Busca ou cria cliente no Asaas
      // Tenta encontrar pelo CPF (mais confiável) ou pelo nome+telefone
      let asaasCustomerId: string | null = null

      if (body.client_cpf) {
        const cpfClean = body.client_cpf.replace(/\D/g, '')
        const searchRes = await fetch(
          `${asaasBase}/customers?cpfCnpj=${cpfClean}`,
          { headers: asaasHeaders }
        )
        if (searchRes.ok) {
          const searchData = await searchRes.json() as { data?: { id: string }[] }
          asaasCustomerId = searchData.data?.[0]?.id ?? null
        }
      }

      if (!asaasCustomerId) {
        const createCustomer = await fetch(`${asaasBase}/customers`, {
          method: 'POST',
          headers: asaasHeaders,
          body: JSON.stringify({
            name:     body.client_name,
            cpfCnpj: body.client_cpf?.replace(/\D/g, '') ?? undefined,
            mobilePhone: body.client_phone.replace(/\D/g, ''),
          }),
        })
        if (!createCustomer.ok) {
          const errText = await createCustomer.text()
          app.log.error({ status: createCustomer.status, body: errText }, '[n8n/payments] Erro ao criar cliente no Asaas')
          return reply.code(502).send({ error: 'Erro ao criar cliente no Asaas', detail: errText })
        }
        const customerData = await createCustomer.json() as { id: string }
        asaasCustomerId = customerData.id
      }

      // 3. Cria a cobrança PIX no Asaas
      const dueDate = body.due_date ?? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0] // padrão: 3 dias a partir de hoje

      const chargePayload: Record<string, unknown> = {
        customer:        asaasCustomerId,
        billingType:     'PIX',
        value:           body.amount,
        dueDate,
        description:     `${body.type === 'sinal' ? 'Sinal' : 'Pagamento integral'} — consulta nutricional`,
        externalReference: body.appointment_id ?? null,
      }

      const chargeRes = await fetch(`${asaasBase}/payments`, {
        method: 'POST',
        headers: asaasHeaders,
        body: JSON.stringify(chargePayload),
      })
      if (!chargeRes.ok) {
        const errText = await chargeRes.text()
        app.log.error({ status: chargeRes.status, body: errText }, '[n8n/payments] Erro ao criar cobrança no Asaas')
        return reply.code(502).send({ error: 'Erro ao criar cobrança no Asaas', detail: errText })
      }
      const chargeData = await chargeRes.json() as {
        id: string; status: string; value: number; dueDate: string
      }
      const asaasPaymentId = chargeData.id

      // 4. Busca QR Code PIX
      let pixQrCode: string | null = null
      let pixCopyPaste: string | null = null
      const pixRes = await fetch(
        `${asaasBase}/payments/${asaasPaymentId}/pixQrCode`,
        { headers: asaasHeaders }
      )
      if (pixRes.ok) {
        const pixData = await pixRes.json() as { encodedImage?: string; payload?: string }
        pixQrCode   = pixData.encodedImage ?? null
        pixCopyPaste = pixData.payload ?? null
      } else {
        app.log.warn({ asaasPaymentId }, '[n8n/payments] Não foi possível obter o QR Code PIX (não crítico)')
      }

      // 5. Persiste o pagamento no banco
      const payRows = await query<{ id: string }>(
        `INSERT INTO payments
           (nutritionist_id, appointment_id, asaas_payment_id, external_reference,
            amount, type, method, status, pix_qr_code, pix_copy_paste, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, 'PIX', 'pending', $7, $8, $9)
         RETURNING id`,
        [
          body.nutritionist_id,
          body.appointment_id ?? null,
          asaasPaymentId,
          body.appointment_id ?? null,
          body.amount,
          body.type,
          pixQrCode,
          pixCopyPaste,
          dueDate,
        ]
      )

      return reply.send({
        ok:               true,
        payment_id:       payRows[0].id,
        asaas_payment_id: asaasPaymentId,
        pix_qr_code:      pixQrCode,
        pix_copy_paste:   pixCopyPaste,
        status:           'pending',
      })
    } catch (err) {
      app.log.error({ err, body }, '[n8n/payments/create-charge] Erro ao criar cobrança')
      return reply.code(500).send({ error: 'Erro interno ao criar cobrança' })
    }
  })
}
