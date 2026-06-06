/**
 * webhook-events.service.ts
 *
 * Serviço interno de eventos para o n8n do Frame System.
 *
 * O n8n é uma peça de INFRAESTRUTURA — invisible para os nutricionistas.
 * A URL do n8n é configurada uma única vez em N8N_WEBHOOK_URL no .env do servidor.
 * O payload inclui TUDO que o n8n precisa: mensagem montada + credenciais Evolution API.
 * O n8n só precisa chamar sendText/sendMedia na Evolution API.
 */

import { query, queryOne } from '../db'

export type WebhookEventType =
  | 'plans_stage_reached'      // IA detectou hora de apresentar planos
  | 'appointment_booked'       // Consulta agendada (dispara lembrete + pós-consulta no n8n)
  | 'followup_due'             // Etapa de follow-up atingida (sem resposta X horas)
  | 'pos_consulta_due'         // Horário de enviar pós-consulta
  | 'retorno_due'              // Paciente sem retorno agendado após X dias
  | 'first_contact'            // Primeiro contato de um novo lead

// ── Helpers internos ──────────────────────────────────────────────────────────

/** Dados de conexão WhatsApp + Evolution API para um nutricionista. */
export async function getConnectionData(nutritionist_id: string, client_phone?: string) {
  const row = await queryOne<any>(
    `SELECT wc.instance_name,
            COALESCE(c.name, '') as client_name
     FROM whatsapp_connections wc
     LEFT JOIN clients c ON c.phone = $2 AND c.nutritionist_id = wc.nutritionist_id
     WHERE wc.nutritionist_id = $1 LIMIT 1`,
    [nutritionist_id, client_phone ?? '']
  ).catch(() => null)

  return {
    instance_name:     row?.instance_name ?? null,
    client_name:       row?.client_name   ?? null,
    evolution_api_url: process.env.EVOLUTION_API_URL ?? null,
    evolution_api_key: process.env.EVOLUTION_API_KEY ?? null,
  }
}

// ── Dispatcher central ────────────────────────────────────────────────────────

/**
 * Dispara um evento para o n8n do Frame System.
 * Fire-and-forget — erros são logados mas não propagados.
 *
 * @param event  Tipo do evento
 * @param data   Payload completo incluindo message, client_phone, instance_name, etc.
 */
export async function fireWebhookEvent(
  event: WebhookEventType,
  data: Record<string, any>
): Promise<void> {
  const n8nUrl = process.env.N8N_WEBHOOK_URL
  if (!n8nUrl) {
    // n8n não configurado — fallback via followup.service já cuida do envio direto
    return
  }

  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    ...data,
  })

  try {
    const res = await fetch(n8nUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Frame-Event': event,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      console.warn(`[n8n] ${event} → HTTP ${res.status}`)
    } else {
      console.log(`[n8n] ✓ ${event} enviado`)
    }
  } catch (err: any) {
    console.error(`[n8n] ✗ Erro ao disparar ${event}:`, err.message)
  }
}

// ── Builders de payload ───────────────────────────────────────────────────────

/**
 * Payload de "plans_stage_reached".
 * Inclui a mensagem configurada pelo nutri e a mídia dos planos.
 */
export async function buildPlansPayload(
  nutritionist_id: string,
  client_phone: string,
  conversation_id: string
) {
  const connData = await getConnectionData(nutritionist_id, client_phone)

  // Busca a mídia/mensagem de planos configurada no assistente
  const assistant = await queryOne<any>(
    `SELECT plans_media, services_message, services_message_online, services_message_presencial,
            plans_media_enabled, services_message_enabled,
            services_message_online_enabled, services_message_presencial_enabled
     FROM assistants WHERE nutritionist_id = $1 AND is_active = true LIMIT 1`,
    [nutritionist_id]
  ).catch(() => null)

  const plansMedia = assistant?.plans_media ?? {}

  return {
    nutritionist_id,
    client_phone,
    conversation_id,
    ...connData,
    // Mensagem de apresentação
    plan_message_text: assistant?.services_message ?? null,
    plan_message_online: assistant?.services_message_online ?? null,
    plan_message_presencial: assistant?.services_message_presencial ?? null,
    // Mídia (PDF, imagem, vídeo)
    plan_media_url:  plansMedia?.url  ?? null,
    plan_media_type: plansMedia?.type ?? null,
    plan_media_name: plansMedia?.name ?? null,
  }
}

/**
 * Payload de "appointment_booked".
 * Inclui todos os dados da consulta + local + mensagem de confirmação.
 */
export async function buildAppointmentPayload(
  nutritionist_id: string,
  client_phone: string,
  conversation_id: string,
  appointment_id: string
) {
  const connData = await getConnectionData(nutritionist_id, client_phone)

  const apt = await queryOne<any>(
    `SELECT a.scheduled_at, a.modality, a.duration,
            l.name as location_name, l.address, l.city, l.price,
            l.payment_info, l.deposit_required, l.deposit_amount, l.confirmation_message,
            c.name as client_name
     FROM appointments a
     LEFT JOIN locations l ON l.id = a.location_id
     LEFT JOIN clients c   ON c.phone = $2 AND c.nutritionist_id = a.nutritionist_id
     WHERE a.id = $1`,
    [appointment_id, client_phone]
  ).catch(() => null)

  // Formata data/hora para exibição no Brasil
  const scheduledAt = apt?.scheduled_at ? new Date(apt.scheduled_at) : null
  const dateStr = scheduledAt?.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }) ?? null
  const timeStr = scheduledAt?.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  }) ?? null

  return {
    nutritionist_id,
    client_phone,
    conversation_id,
    appointment_id,
    ...connData,
    client_name:          apt?.client_name          ?? connData.client_name ?? null,
    scheduled_at:         apt?.scheduled_at         ?? null,
    scheduled_date_br:    dateStr,
    scheduled_time_br:    timeStr,
    modality:             apt?.modality             ?? null,
    location_name:        apt?.location_name        ?? null,
    address:              apt?.address              ?? null,
    city:                 apt?.city                 ?? null,
    price:                apt?.price                ?? null,
    payment_info:         apt?.payment_info         ?? null,
    deposit_required:     apt?.deposit_required     ?? false,
    deposit_amount:       apt?.deposit_amount       ?? null,
    confirmation_message: apt?.confirmation_message ?? null,
  }
}

/**
 * Payload de "followup_due".
 * Inclui a mensagem da etapa configurada pelo nutri.
 */
export async function buildFollowupPayload(
  nutritionist_id: string,
  client_phone: string,
  conversation_id: string,
  step_order: number
) {
  const connData = await getConnectionData(nutritionist_id, client_phone)

  const seq = await queryOne<any>(
    `SELECT message, delay_hours FROM followup_sequences
     WHERE nutritionist_id = $1 AND step_order = $2 AND is_active = true`,
    [nutritionist_id, step_order]
  ).catch(() => null)

  if (!seq) return null

  const firstName = connData.client_name?.split(' ')[0] ?? null
  const message = seq.message
    .replace(/\{nome\}/gi, firstName ?? '')
    .replace(/\{cliente\}/gi, firstName ?? '')
    .trim()

  return {
    nutritionist_id,
    client_phone,
    conversation_id,
    ...connData,
    step_order,
    message,
    delay_hours: seq.delay_hours,
  }
}

/**
 * Payload de "pos_consulta_due".
 * Inclui a mensagem de pós-consulta configurada pelo nutri.
 */
export async function buildPosConsultaPayload(
  nutritionist_id: string,
  client_phone: string,
  appointment_id: string
) {
  const connData = await getConnectionData(nutritionist_id, client_phone)

  const ass = await queryOne<any>(
    `SELECT pos_consulta_message FROM assistants
     WHERE nutritionist_id = $1 AND is_active = true LIMIT 1`,
    [nutritionist_id]
  ).catch(() => null)

  const firstName = connData.client_name?.split(' ')[0] ?? null

  const defaultMsg = `Olá${firstName ? `, ${firstName}` : ''}! 🌿\n\nEspero que sua consulta tenha sido ótima! Qualquer dúvida sobre o que conversamos, pode me chamar. 😊`

  const raw = ass?.pos_consulta_message ?? defaultMsg
  const message = raw
    .replace(/\{nome\}/gi, firstName ?? '')
    .replace(/\{cliente\}/gi, firstName ?? '')
    .trim()

  return {
    nutritionist_id,
    client_phone,
    appointment_id,
    ...connData,
    message,
  }
}

/**
 * Payload de "retorno_due".
 * Inclui a mensagem de retorno configurada pelo nutri.
 * Só dispara para pacientes que fizeram consulta e não remarcaram.
 */
export async function buildRetornoPayload(
  nutritionist_id: string,
  client_phone: string,
  appointment_id: string
) {
  const connData = await getConnectionData(nutritionist_id, client_phone)

  const ass = await queryOne<any>(
    `SELECT retorno_message, retorno_days FROM assistants
     WHERE nutritionist_id = $1 AND is_active = true LIMIT 1`,
    [nutritionist_id]
  ).catch(() => null)

  const firstName = connData.client_name?.split(' ')[0] ?? null
  const days = ass?.retorno_days ?? 30

  const defaultMsg = `Olá${firstName ? `, ${firstName}` : ''}! 😊\n\nFaz um tempo desde nossa última consulta. Que tal agendarmos seu retorno? Já tenho horários disponíveis! 🌱`

  const raw = ass?.retorno_message ?? defaultMsg
  const message = raw
    .replace(/\{nome\}/gi, firstName ?? '')
    .replace(/\{cliente\}/gi, firstName ?? '')
    .replace(/\{dias\}/gi, String(days))
    .trim()

  return {
    nutritionist_id,
    client_phone,
    appointment_id,
    ...connData,
    message,
    retorno_days: days,
  }
}
