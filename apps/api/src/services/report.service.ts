import { query } from '../db'
import { sendMessage } from './whatsapp.service'

// ── Relatório semanal para cada nutricionista ─────────────────────────────────
// Enviado toda segunda-feira cedo (agendado via setInterval no server.ts).
export async function runWeeklyReport(): Promise<void> {
  console.log('[report] Gerando relatórios semanais...')

  // Busca nutricionistas ativas com WhatsApp conectado e telefone cadastrado
  const nutritionists = await query<any>(`
    SELECT n.id, n.name, n.phone, w.instance_name
    FROM nutritionists n
    JOIN whatsapp_connections w
      ON w.nutritionist_id = n.id AND w.status = 'connected'
    WHERE n.is_active = true
      AND n.phone IS NOT NULL
      AND n.phone != ''
  `)

  console.log(`[report] ${nutritionists.length} nutricionista(s) para notificar`)

  for (const nutri of nutritionists) {
    try {
      const [m] = await query<any>(`
        SELECT
          COUNT(DISTINCT c.id) FILTER (
            WHERE c.created_at >= NOW() - INTERVAL '7 days'
          )::INT                                                           AS new_leads,
          COUNT(DISTINCT a.id) FILTER (
            WHERE a.status NOT IN ('cancelled')
              AND a.created_at >= NOW() - INTERVAL '7 days'
          )::INT                                                           AS new_appointments,
          COUNT(DISTINCT a.id) FILTER (
            WHERE a.status = 'completed'
              AND a.scheduled_at >= NOW() - INTERVAL '7 days'
          )::INT                                                           AS completed_week,
          COUNT(DISTINCT c.id) FILTER (
            WHERE c.status = 'active'
          )::INT                                                           AS active_conversations
        FROM nutritionists n2
        LEFT JOIN conversations c  ON c.nutritionist_id = n2.id
        LEFT JOIN appointments  a  ON a.nutritionist_id = n2.id
        WHERE n2.id = $1
      `, [nutri.id])

      const firstName = nutri.name.split(' ')[0]

      const msg =
        `📊 *Relatório semanal — Frame System*\n\n` +
        `Olá, ${firstName}! Aqui está o resumo dos últimos 7 dias:\n\n` +
        `💬 Novos leads: *${m.new_leads}*\n` +
        `📅 Consultas agendadas: *${m.new_appointments}*\n` +
        `✅ Consultas realizadas: *${m.completed_week}*\n` +
        `🔥 Conversas ativas agora: *${m.active_conversations}*\n\n` +
        `Acesse o dashboard para ver todos os detalhes e o CRM de leads 👉`

      await sendMessage(nutri.phone, msg, nutri.instance_name)
      console.log(`[report] ✓ Relatório enviado para ${nutri.name}`)
    } catch (err) {
      console.error(`[report] ✗ Erro ao enviar para ${nutri.name}:`, err)
    }
  }
}
