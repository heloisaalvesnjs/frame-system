/**
 * Serviço de eventos para integrações externas (n8n, Make, Zapier, etc.)
 *
 * Quando o sistema detecta um momento importante na conversa, dispara um
 * POST para a URL configurada pelo nutricionista com o payload completo.
 * O n8n recebe e executa as ações (enviar mídia, sequência, etc.)
 */

import crypto from 'crypto'
import { query, queryOne } from '../db'

export type WebhookEventType =
  | 'plans_stage_reached'    // IA detectou que é hora de apresentar planos
  | 'appointment_booked'     // Consulta agendada
  | 'first_contact'          // Primeiro contato de um novo lead
  | 'no_reply_24h'           // Cliente não respondeu em 24h
  | 'conversation_closed'    // Nutricionista encerrou a conversa
  | 'appointment_reminder_due' // 24h antes da consulta (disparado pelo cron)

export interface WebhookEventPayload {
  event:           WebhookEventType
  nutritionist_id: string
  client_phone:    string
  conversation_id: string
  timestamp:       string
  data:            Record<string, any>
}

/**
 * Dispara o evento para todos os webhooks ativos do nutricionista
 * que estejam subscritos neste tipo de evento.
 * Fire-and-forget — erros são logados mas não propagados.
 */
export async function fireWebhookEvent(
  nutritionist_id: string,
  event: WebhookEventType,
  payload: Omit<WebhookEventPayload, 'event' | 'nutritionist_id' | 'timestamp'>
): Promise<void> {
  try {
    const integrations = await query<any>(
      `SELECT id, webhook_url, secret FROM webhook_integrations
       WHERE nutritionist_id = $1 AND is_active = true AND $2 = ANY(events)`,
      [nutritionist_id, event]
    )

    if (!integrations.length) return

    const body: WebhookEventPayload = {
      event,
      nutritionist_id,
      timestamp: new Date().toISOString(),
      ...payload,
    }
    const bodyStr = JSON.stringify(body)

    await Promise.allSettled(
      integrations.map(async (integration: any) => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Frame-Event': event,
        }

        // Assina o payload com HMAC-SHA256 se secret configurado
        if (integration.secret) {
          const sig = crypto
            .createHmac('sha256', integration.secret)
            .update(bodyStr)
            .digest('hex')
          headers['X-Frame-Signature'] = `sha256=${sig}`
        }

        const res = await fetch(integration.webhook_url, {
          method: 'POST',
          headers,
          body: bodyStr,
          signal: AbortSignal.timeout(10_000),
        })

        if (!res.ok) {
          console.warn(`[webhook-events] ${event} → ${integration.webhook_url} retornou ${res.status}`)
        }
      })
    )
  } catch (err) {
    console.error('[webhook-events] Erro ao disparar evento:', err)
  }
}

/**
 * Dados básicos de conexão WhatsApp do nutricionista para incluir nos payloads.
 * O n8n precisa desses dados para chamar a Evolution API diretamente.
 */
export async function getConnectionData(nutritionist_id: string, client_phone?: string) {
  const conn = await queryOne<any>(
    `SELECT wc.instance_name,
            COALESCE(c.name, '') as client_name
     FROM whatsapp_connections wc
     LEFT JOIN clients c ON c.phone = $2 AND c.nutritionist_id = wc.nutritionist_id
     WHERE wc.nutritionist_id = $1 LIMIT 1`,
    [nutritionist_id, client_phone ?? '']
  ).catch(() => null)

  return {
    instance_name:     conn?.instance_name ?? null,
    client_name:       conn?.client_name   ?? null,
    // URL e chave da Evolution API vêm do ambiente (configurado no Railway)
    evolution_api_url: process.env.EVOLUTION_API_URL ?? null,
    evolution_api_key: process.env.EVOLUTION_API_KEY ?? null,
  }
}

/**
 * Monta o payload completo de "plans_stage_reached" buscando
 * a config de serviços/planos do nutricionista.
 */
export async function buildPlansPayload(nutritionist_id: string, client_phone: string, conversation_id: string) {
  const services = await query<any>(
    `SELECT name, description, price, media_url, media_type, media_name, custom_message
     FROM services WHERE nutritionist_id = $1 AND is_active = true ORDER BY sort_order`,
    [nutritionist_id]
  ).catch(() => [])

  const connData = await getConnectionData(nutritionist_id, client_phone)

  // Primeira mídia encontrada
  const mediaService = services.find((s: any) => s.media_url)

  return {
    client_phone,
    conversation_id,
    data: {
      ...connData,
      services,
      plan_media_url:    mediaService?.media_url    ?? null,
      plan_media_type:   mediaService?.media_type   ?? null,
      plan_media_name:   mediaService?.media_name   ?? null,
      plan_message_text: mediaService?.custom_message ?? null,
    },
  }
}

/**
 * Monta o payload de "appointment_booked" com dados da consulta e local.
 */
export async function buildAppointmentPayload(
  nutritionist_id: string,
  client_phone: string,
  conversation_id: string,
  appointment_id: string
) {
  const apt = await queryOne<any>(
    `SELECT a.*, l.name as location_name, l.address, l.city, l.price,
            l.payment_info, l.deposit_required, l.deposit_amount, l.confirmation_message,
            c.name as client_name
     FROM appointments a
     LEFT JOIN locations l ON l.id = a.location_id
     LEFT JOIN clients c ON c.phone = a.client_phone AND c.nutritionist_id = a.nutritionist_id
     WHERE a.id = $1`,
    [appointment_id]
  ).catch(() => null)

  const connData = await getConnectionData(nutritionist_id, client_phone)

  return {
    client_phone,
    conversation_id,
    data: {
      ...connData,
      client_name:          apt?.client_name          ?? connData.client_name ?? null,
      appointment_id,
      scheduled_at:         apt?.scheduled_at         ?? null,
      location_name:        apt?.location_name        ?? null,
      address:              apt?.address              ?? null,
      city:                 apt?.city                 ?? null,
      modality:             apt?.modality             ?? null,
      price:                apt?.price                ?? null,
      payment_info:         apt?.payment_info         ?? null,
      deposit_required:     apt?.deposit_required     ?? false,
      deposit_amount:       apt?.deposit_amount       ?? null,
      confirmation_message: apt?.confirmation_message ?? null,
    },
  }
}
