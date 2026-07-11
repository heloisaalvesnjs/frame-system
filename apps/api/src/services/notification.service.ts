// Notificações administrativas para o nutricionista (não confundir com as
// mensagens automáticas enviadas ao paciente — lembrete/pós-consulta/retorno/
// reengajamento, essas ficam em followup.service.ts).
//
// Canal padrão: WhatsApp (mesma instância uazapi já conectada, mandando pro
// número pessoal do nutri em vez de pro paciente). Exceção: "WhatsApp
// desconectado" não pode avisar pelo próprio WhatsApp que caiu — usa e-mail
// (Resend) como canal alternativo.

import { query, queryOne } from '../db'
import { sendMessageForNutri } from './whatsapp.service'
import { sendWhatsappDisconnectedEmail } from './email.service'

type NotifyPrefs = {
  name: string
  email: string
  phone: string | null
  notify_ai_daily_report: boolean
  notify_new_lead: boolean
  notify_appointment_reminder: boolean
  notify_whatsapp_disconnected: boolean
}

async function getPrefs(nutritionistId: string): Promise<NotifyPrefs | null> {
  return queryOne<NotifyPrefs>(
    `SELECT name, email, phone, notify_ai_daily_report, notify_new_lead,
            notify_appointment_reminder, notify_whatsapp_disconnected
     FROM nutritionists WHERE id = $1`,
    [nutritionistId]
  )
}

/** Dispara ao criar um cliente novo (primeiro contato via WhatsApp). */
export async function notifyNewLead(nutritionistId: string, leadPhone: string): Promise<void> {
  try {
    const prefs = await getPrefs(nutritionistId)
    if (!prefs?.notify_new_lead || !prefs.phone) return
    const digits = leadPhone.replace(/\D/g, '')
    const formatted = digits.length >= 12
      ? `(${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`
      : leadPhone
    await sendMessageForNutri(
      nutritionistId,
      prefs.phone,
      `🆕 Novo lead chegou no WhatsApp!\n\n📱 ${formatted}\n\nA assistente já está atendendo — dá uma olhada na aba Atendimento se quiser acompanhar.`
    )
  } catch (err) {
    console.error('[notification] Erro ao notificar novo lead:', err)
  }
}

/** Dispara perto do horário de uma consulta (mesma janela do lembrete ao paciente). */
export async function notifyAppointmentReminder(
  nutritionistId: string,
  clientName: string | null,
  scheduledAt: string,
  locationName: string | null
): Promise<void> {
  try {
    const prefs = await getPrefs(nutritionistId)
    if (!prefs?.notify_appointment_reminder || !prefs.phone) return
    const dt = new Date(scheduledAt)
    const dateStr = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
    const timeStr = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
    const local = locationName ? ` em ${locationName}` : ''
    await sendMessageForNutri(
      nutritionistId,
      prefs.phone,
      `⏰ Lembrete: você tem consulta com ${clientName ?? 'paciente'} dia ${dateStr} às ${timeStr}${local}.`
    )
  } catch (err) {
    console.error('[notification] Erro ao notificar lembrete de consulta:', err)
  }
}

/** Cron diário — resumo das últimas 24h (leads novos, mensagens, consultas). */
export async function notifyDailySummary(nutritionistId: string): Promise<void> {
  try {
    const prefs = await getPrefs(nutritionistId)
    if (!prefs?.notify_ai_daily_report || !prefs.phone) return

    const [newLeads] = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM clients
       WHERE nutritionist_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'`,
      [nutritionistId]
    )
    const [activeConvs] = await query<{ count: string }>(
      `SELECT COUNT(DISTINCT id)::text AS count FROM conversations
       WHERE nutritionist_id = $1 AND last_message_at >= NOW() - INTERVAL '24 hours'`,
      [nutritionistId]
    )
    const [apptsToday] = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM appointments
       WHERE nutritionist_id = $1 AND DATE(scheduled_at) = CURRENT_DATE AND status != 'cancelled'`,
      [nutritionistId]
    )

    await sendMessageForNutri(
      nutritionistId,
      prefs.phone,
      `☀️ Bom dia! Resumo das últimas 24h:\n\n🆕 ${newLeads?.count ?? 0} lead(s) novo(s)\n💬 ${activeConvs?.count ?? 0} conversa(s) ativa(s)\n📅 ${apptsToday?.count ?? 0} consulta(s) hoje`
    )
  } catch (err) {
    console.error('[notification] Erro ao enviar resumo diário:', err)
  }
}

/** Dispara quando a instância WhatsApp cai (por e-mail, já que o WhatsApp está fora do ar). */
export async function notifyWhatsappDisconnected(nutritionistId: string): Promise<void> {
  try {
    const prefs = await getPrefs(nutritionistId)
    if (!prefs?.notify_whatsapp_disconnected || !prefs.email) return
    await sendWhatsappDisconnectedEmail(prefs.email, prefs.name)
  } catch (err) {
    console.error('[notification] Erro ao notificar WhatsApp desconectado:', err)
  }
}
