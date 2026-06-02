import { query } from '../db'
import { sendMessage } from './whatsapp.service'

// ── 4.1 — Lead frio ───────────────────────────────────────────────
// Envia follow-up para clientes que pararam de responder há X horas
// sem ter agendado consulta. Dois toques distintos: 1° reativa, 2° urgência.
export async function runColdLeadFollowup(): Promise<void> {
  console.log('[followup] Verificando leads frios...')

  const coldLeads = await query<any>(`
    WITH last_msg AS (
      SELECT DISTINCT ON (conversation_id)
        conversation_id, role
      FROM messages
      ORDER BY conversation_id, sent_at DESC
    )
    SELECT
      c.id              AS conversation_id,
      c.client_phone,
      c.nutritionist_id,
      c.last_followup_at,
      cl.name           AS client_name,
      ass.name          AS assistant_name,
      COALESCE(ass.nutri_display_name, n.name) AS nutri_name,
      ass.followup_delay_hours,
      ass.followup_message_1,
      ass.followup_message_2,
      w.instance_name   AS instance_name
    FROM conversations c
    JOIN last_msg lm
      ON lm.conversation_id = c.id AND lm.role = 'user'
    JOIN nutritionists n
      ON n.id = c.nutritionist_id AND n.is_active = true
    LEFT JOIN clients cl
      ON cl.phone = c.client_phone AND cl.nutritionist_id = c.nutritionist_id
    JOIN assistants ass
      ON ass.nutritionist_id = c.nutritionist_id
      AND ass.is_active         = true
      AND ass.followup_enabled  = true
      AND ass.vacation_mode     = false
    JOIN whatsapp_connections w
      ON w.nutritionist_id = c.nutritionist_id AND w.status = 'connected'
    WHERE c.status = 'active'
      AND c.last_message_at < NOW() - (COALESCE(ass.followup_delay_hours, 4) || ' hours')::INTERVAL
      AND c.last_message_at > NOW() - INTERVAL '72 hours'
      AND (c.last_followup_at IS NULL
           OR c.last_followup_at < NOW() - INTERVAL '20 hours')
      AND NOT EXISTS (
        SELECT 1 FROM appointments ap
        JOIN clients cl2 ON cl2.id = ap.client_id
        WHERE ap.nutritionist_id = c.nutritionist_id
          AND cl2.phone = c.client_phone
          AND ap.status NOT IN ('cancelled')
      )
  `)

  console.log(`[followup] ${coldLeads.length} lead(s) frio(s) encontrado(s)`)

  for (const lead of coldLeads) {
    const firstName = lead.client_name
      ? lead.client_name.split(' ')[0]
      : ''
    const aiName    = lead.assistant_name || 'Assistente'
    const nutriName = lead.nutri_name     || 'a nutricionista'

    const isSecondTouch = lead.last_followup_at !== null

    // Substitui variáveis nas mensagens customizadas
    const applyVars = (template: string) =>
      template
        .replace(/\{nome\}/gi,       firstName || '')
        .replace(/\{assistente\}/gi, aiName)
        .replace(/\{nutri\}/gi,      nutriName)
        .trim()

    const DEFAULT_MSG_1 = `Oi${firstName ? `, ${firstName}` : ''}! Aqui é ${aiName}, da equipe de ${nutriName}. Ainda consigo garantir um horário pra você — prefere manhã ou tarde?`
    const DEFAULT_MSG_2 = `Oi${firstName ? `, ${firstName}` : ''}! ${aiName} aqui 😊 Ainda tenho horários disponíveis com ${nutriName} essa semana. É só me dizer manhã ou tarde que reservo pra você!`

    const msg = isSecondTouch
      ? (lead.followup_message_2 ? applyVars(lead.followup_message_2) : DEFAULT_MSG_2)
      : (lead.followup_message_1 ? applyVars(lead.followup_message_1) : DEFAULT_MSG_1)

    try {
      await sendMessage(lead.client_phone, msg, lead.instance_name)

      await query(
        'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
        [lead.conversation_id, 'assistant', msg]
      )

      await query(
        `UPDATE conversations
         SET last_followup_at = NOW(), last_message_at = NOW()
         WHERE id = $1`,
        [lead.conversation_id]
      )

      console.log(`[followup] ✓ ${isSecondTouch ? '2º toque' : '1º toque'} → ${lead.client_phone}`)
    } catch (err) {
      console.error(`[followup] ✗ Erro ao enviar para ${lead.client_phone}:`, err)
    }
  }
}

// ── 4.2 — Lembrete 24h antes da consulta ─────────────────────────
// Envia uma mensagem ao cliente lembrando da consulta do dia seguinte.
export async function runAppointmentReminders(): Promise<void> {
  console.log('[reminder] Verificando lembretes de consulta...')

  const upcoming = await query<any>(`
    SELECT
      a.id,
      a.scheduled_at,
      a.modality,
      c.name  AS client_name,
      c.phone AS client_phone,
      n.name  AS nutritionist_name,
      w.instance_name AS instance_name
    FROM appointments a
    JOIN clients c        ON c.id = a.client_id
    JOIN nutritionists n  ON n.id = a.nutritionist_id AND n.is_active = true
    JOIN whatsapp_connections w
      ON w.nutritionist_id = a.nutritionist_id AND w.status = 'connected'
    WHERE a.status IN ('scheduled', 'confirmed')
      AND a.reminder_sent = false
      -- Janela: consulta entre 23h e 25h a partir de agora
      AND a.scheduled_at BETWEEN NOW() + INTERVAL '23 hours'
                              AND NOW() + INTERVAL '25 hours'
  `)

  console.log(`[reminder] ${upcoming.length} lembrete(s) para enviar`)

  for (const appt of upcoming) {
    const scheduledDate = new Date(appt.scheduled_at)

    const timeStr = scheduledDate.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    })
    const dateStr = scheduledDate.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
    })

    const modalityTxt = appt.modality === 'presencial' ? 'presencial' : 'online'
    const firstName = appt.client_name && appt.client_name !== 'Cliente'
      ? `, ${appt.client_name.split(' ')[0]}`
      : ''

    const msg =
      `Olá${firstName}! 📅 Lembrando que sua consulta com a ${appt.nutritionist_name} ` +
      `é amanhã (${dateStr}) às ${timeStr} — modalidade ${modalityTxt}.\n\n` +
      `Confirme sua presença respondendo *sim*, ou avise se precisar reagendar 🙏`

    try {
      await sendMessage(appt.client_phone, msg, appt.instance_name)

      await query(
        'UPDATE appointments SET reminder_sent = true WHERE id = $1',
        [appt.id]
      )

      console.log(`[reminder] ✓ Lembrete enviado para ${appt.client_phone}`)
    } catch (err) {
      console.error(`[reminder] ✗ Erro ao enviar para ${appt.client_phone}:`, err)
    }
  }
}
