/**
 * followup.service.ts
 *
 * Crns automáticos do Frame System:
 * 1. Follow-up por etapas — N mensagens configuradas pelo nutri, cada uma com delay próprio
 * 2. Lembrete de consulta — 24h antes (delega ao n8n)
 * 3. Pós-consulta — horas depois da consulta (delega ao n8n)
 * 4. Retorno — X dias após última consulta, para quem não remarcou (delega ao n8n)
 *
 * Lógica: se N8N_WEBHOOK_URL está configurado → n8n envia.
 *         Caso contrário → fallback direto via sendMessage.
 */

import { query, queryOne } from '../db'
import { sendMessage } from './whatsapp.service'
import {
  fireWebhookEvent,
  buildFollowupPayload,
  buildPosConsultaPayload,
  buildRetornoPayload,
} from './webhook-events.service'

const HAS_N8N = () => !!process.env.N8N_WEBHOOK_URL

// ── 1. Follow-up por etapas ───────────────────────────────────────────────────

export async function runFollowupSequences(): Promise<void> {
  console.log('[followup] Verificando sequências de follow-up...')

  // Para cada conversa ativa com última mensagem sendo do cliente (não da IA)
  // verifica se o delay da próxima etapa já passou
  const candidates = await query<any>(`
    WITH last_msg AS (
      SELECT DISTINCT ON (conversation_id)
        conversation_id, role, sent_at
      FROM messages
      ORDER BY conversation_id, sent_at DESC
    ),
    nutri_data AS (
      SELECT
        c.id              AS conversation_id,
        c.client_phone,
        c.nutritionist_id,
        c.followup_step,
        c.last_message_at,
        lm.sent_at        AS last_client_msg_at,
        cl.name           AS client_name,
        w.instance_token,
        ass.vacation_mode,
        ass.followup_enabled
      FROM conversations c
      JOIN last_msg lm          ON lm.conversation_id = c.id AND lm.role = 'user'
      JOIN assistants ass        ON ass.nutritionist_id = c.nutritionist_id AND ass.is_active = true
      JOIN whatsapp_connections w ON w.nutritionist_id = c.nutritionist_id AND w.status = 'connected'
      LEFT JOIN clients cl       ON cl.phone = c.client_phone AND cl.nutritionist_id = c.nutritionist_id
      WHERE c.status = 'active'
        AND ass.vacation_mode = false
        AND ass.followup_enabled = true
        AND c.last_message_at > NOW() - INTERVAL '7 days'
        -- Não tem consulta agendada/futura
        AND NOT EXISTS (
          SELECT 1 FROM appointments ap
          LEFT JOIN clients cl2 ON cl2.id = ap.client_id
          WHERE ap.nutritionist_id = c.nutritionist_id
            AND (cl2.phone = c.client_phone OR ap.client_phone = c.client_phone)
            AND ap.scheduled_at > NOW()
            AND ap.status NOT IN ('cancelled')
        )
    )
    SELECT nd.*, fs.step_order, fs.delay_hours, fs.message
    FROM nutri_data nd
    JOIN followup_sequences fs
      ON fs.nutritionist_id = nd.nutritionist_id
      AND fs.step_order = nd.followup_step + 1
      AND fs.is_active = true
    WHERE nd.last_client_msg_at < NOW() - (fs.delay_hours || ' hours')::INTERVAL
  `)

  console.log(`[followup] ${candidates.length} follow-up(s) para disparar`)

  for (const lead of candidates) {
    const firstName = lead.client_name?.split(' ')[0] ?? ''
    const message = lead.message
      .replace(/\{nome\}/gi, firstName)
      .replace(/\{cliente\}/gi, firstName)
      .trim()

    try {
      if (HAS_N8N()) {
        // n8n envia
        const payload = await buildFollowupPayload(
          lead.nutritionist_id, lead.client_phone, lead.conversation_id, lead.step_order
        )
        if (payload) {
          await fireWebhookEvent('followup_due', payload)
        }
      } else {
        // Fallback: envia direto
        await sendMessage(lead.client_phone, message, lead.instance_token)
        await query(
          'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
          [lead.conversation_id, 'assistant', message]
        )
      }

      // Avança a etapa e registra o horário
      await query(
        `UPDATE conversations
         SET followup_step = $2, last_followup_at = NOW(), last_message_at = NOW()
         WHERE id = $1`,
        [lead.conversation_id, lead.step_order]
      )

      console.log(`[followup] ✓ Etapa ${lead.step_order} → ${lead.client_phone}`)
    } catch (err) {
      console.error(`[followup] ✗ Erro etapa ${lead.step_order} → ${lead.client_phone}:`, err)
    }
  }
}

// ── 2. Lembrete de consulta 24h antes ────────────────────────────────────────

export async function runAppointmentReminders(): Promise<void> {
  console.log('[reminder] Verificando lembretes de consulta...')

  const upcoming = await query<any>(`
    SELECT
      a.id,
      a.scheduled_at,
      a.modality,
      a.nutritionist_id,
      COALESCE(a.client_phone, c.phone) AS client_phone,
      c.name  AS client_name,
      n.name  AS nutritionist_name,
      l.name  AS location_name,
      l.address,
      l.city,
      l.confirmation_message,
      w.instance_token
    FROM appointments a
    JOIN clients c             ON c.id = a.client_id
    JOIN nutritionists n       ON n.id = a.nutritionist_id AND n.is_active = true
    JOIN whatsapp_connections w ON w.nutritionist_id = a.nutritionist_id AND w.status = 'connected'
    LEFT JOIN locations l      ON l.id = a.location_id
    WHERE a.status IN ('scheduled', 'confirmed')
      AND a.reminder_sent = false
      AND a.scheduled_at BETWEEN NOW() + INTERVAL '23 hours'
                              AND NOW() + INTERVAL '25 hours'
  `)

  console.log(`[reminder] ${upcoming.length} lembrete(s) para enviar`)

  for (const appt of upcoming) {
    const scheduledAt = new Date(appt.scheduled_at)
    const firstName = appt.client_name?.split(' ')[0] ?? ''

    const dateStr = scheduledAt.toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })
    const timeStr = scheduledAt.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
    })

    let message = `Olá${firstName ? `, ${firstName}` : ''}! 📅 Lembrando da sua consulta:\n\n`
    message += `*${dateStr}* às *${timeStr}*`
    if (appt.location_name) {
      message += `\n📍 ${appt.location_name}`
      if (appt.address) message += ` — ${appt.address}`
    }
    if (appt.modality === 'online') message += `\n💻 Consulta online`
    if (appt.confirmation_message) message += `\n\n${appt.confirmation_message}`
    else message += `\n\nQualquer dúvida é só falar! 🙏`

    try {
      if (HAS_N8N()) {
        await fireWebhookEvent('appointment_booked', {
          event_subtype:    'reminder_due',
          nutritionist_id:  appt.nutritionist_id,
          client_phone:     appt.client_phone,
          appointment_id:   appt.id,
          instance_token:   appt.instance_token,
          uazapi_base_url:  process.env.UAZAPI_BASE_URL ?? null,
          client_name:      appt.client_name,
          scheduled_at:     appt.scheduled_at,
          scheduled_date_br: dateStr,
          scheduled_time_br: timeStr,
          modality:         appt.modality,
          location_name:    appt.location_name,
          address:          appt.address,
          city:             appt.city,
          message,
        })
      } else {
        await sendMessage(appt.client_phone, message, appt.instance_token)
      }

      await query('UPDATE appointments SET reminder_sent = true WHERE id = $1', [appt.id])
      console.log(`[reminder] ✓ Lembrete → ${appt.client_phone}`)
    } catch (err) {
      console.error(`[reminder] ✗ ${appt.client_phone}:`, err)
    }
  }
}

// ── 3. Pós-consulta ───────────────────────────────────────────────────────────

export async function runPosConsulta(): Promise<void> {
  console.log('[pos-consulta] Verificando consultas concluídas...')

  // Consultas que terminaram há aprox. auto_feedback_delay_hours (±20min) e ainda não enviaram pós-consulta
  const done = await query<any>(`
    SELECT
      a.id,
      a.nutritionist_id,
      COALESCE(a.client_phone, c.phone) AS client_phone,
      c.name AS client_name,
      w.instance_token,
      ass.auto_feedback_message AS pos_consulta_message
    FROM appointments a
    JOIN clients c             ON c.id = a.client_id
    JOIN assistants ass         ON ass.nutritionist_id = a.nutritionist_id AND ass.is_active = true
    JOIN whatsapp_connections w ON w.nutritionist_id = a.nutritionist_id AND w.status = 'connected'
    WHERE a.status IN ('scheduled', 'confirmed', 'completed')
      AND a.pos_consulta_sent = false
      AND ass.auto_feedback_enabled = true AND ass.auto_feedback_message IS NOT NULL
      -- Consulta já aconteceu há aproximadamente auto_feedback_delay_hours (janela ±20min)
      AND a.scheduled_at BETWEEN
            NOW() - (COALESCE(ass.auto_feedback_delay_hours, 2) || ' hours')::INTERVAL - INTERVAL '20 minutes'
        AND NOW() - (COALESCE(ass.auto_feedback_delay_hours, 2) || ' hours')::INTERVAL + INTERVAL '20 minutes'
  `)

  console.log(`[pos-consulta] ${done.length} pós-consulta(s) para enviar`)

  for (const appt of done) {
    const firstName = appt.client_name?.split(' ')[0] ?? ''
    const message = (appt.pos_consulta_message ?? '')
      .replace(/\{nome\}/gi, firstName)
      .replace(/\{cliente\}/gi, firstName)
      .trim()

    if (!message) continue

    try {
      if (HAS_N8N()) {
        const payload = await buildPosConsultaPayload(
          appt.nutritionist_id, appt.client_phone, appt.id
        )
        await fireWebhookEvent('pos_consulta_due', payload)
      } else {
        await sendMessage(appt.client_phone, message, appt.instance_token)
      }

      await query('UPDATE appointments SET pos_consulta_sent = true WHERE id = $1', [appt.id])
      console.log(`[pos-consulta] ✓ → ${appt.client_phone}`)
    } catch (err) {
      console.error(`[pos-consulta] ✗ ${appt.client_phone}:`, err)
    }
  }
}

// ── 4. Retorno — paciente sem agendamento após X dias ─────────────────────────

export async function runRetorno(): Promise<void> {
  console.log('[retorno] Verificando pacientes sem retorno agendado...')

  // Busca pacientes que:
  // - Tiveram pelo menos 1 consulta realizada
  // - Não têm consulta futura agendada
  // - Última consulta foi há retorno_days dias (± 1 dia para a janela do cron)
  // - Ainda não recebeu mensagem de retorno dessa consulta
  const candidates = await query<any>(`
    SELECT
      a.id                AS appointment_id,
      a.nutritionist_id,
      COALESCE(a.client_phone, c.phone) AS client_phone,
      c.name              AS client_name,
      a.scheduled_at,
      w.instance_token,
      ass.auto_return_message AS retorno_message,
      ass.auto_return_days AS retorno_days
    FROM appointments a
    JOIN clients c             ON c.id = a.client_id
    JOIN assistants ass         ON ass.nutritionist_id = a.nutritionist_id
                                AND ass.is_active = true
                                AND ass.auto_return_enabled = true AND ass.auto_return_message IS NOT NULL
    JOIN whatsapp_connections w ON w.nutritionist_id = a.nutritionist_id
                                AND w.status = 'connected'
    WHERE a.status IN ('scheduled', 'confirmed', 'completed')
      AND a.return_message_sent = false
      -- Consulta foi há exatamente auto_return_days dias (janela de ±12h para o cron)
      AND a.scheduled_at BETWEEN
            NOW() - (COALESCE(ass.auto_return_days, 30) || ' days')::INTERVAL - INTERVAL '12 hours'
        AND NOW() - (COALESCE(ass.auto_return_days, 30) || ' days')::INTERVAL + INTERVAL '12 hours'
      -- Não tem consulta futura marcada
      AND NOT EXISTS (
        SELECT 1 FROM appointments a2
        LEFT JOIN clients c2 ON c2.id = a2.client_id
        WHERE a2.nutritionist_id = a.nutritionist_id
          AND (c2.phone = c.phone OR a2.client_phone = c.phone)
          AND a2.scheduled_at > NOW()
          AND a2.status NOT IN ('cancelled')
          AND a2.id != a.id
      )
  `)

  console.log(`[retorno] ${candidates.length} mensagem(ns) de retorno para enviar`)

  for (const appt of candidates) {
    const firstName = appt.client_name?.split(' ')[0] ?? ''
    const message = (appt.retorno_message ?? '')
      .replace(/\{nome\}/gi, firstName)
      .replace(/\{cliente\}/gi, firstName)
      .replace(/\{dias\}/gi, String(appt.retorno_days ?? 30))
      .trim()

    if (!message) continue

    try {
      if (HAS_N8N()) {
        const payload = await buildRetornoPayload(
          appt.nutritionist_id, appt.client_phone, appt.appointment_id
        )
        await fireWebhookEvent('retorno_due', payload)
      } else {
        await sendMessage(appt.client_phone, message, appt.instance_token)
      }

      await query(
        'UPDATE appointments SET return_message_sent = true WHERE id = $1',
        [appt.appointment_id]
      )
      console.log(`[retorno] ✓ → ${appt.client_phone}`)
    } catch (err) {
      console.error(`[retorno] ✗ ${appt.client_phone}:`, err)
    }
  }
}
