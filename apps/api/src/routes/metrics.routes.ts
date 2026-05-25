import { FastifyInstance } from 'fastify'
import { query, queryOne } from '../db'

export async function metricsRoutes(app: FastifyInstance) {
  const auth = { onRequest: [(app as any).authenticate] }

  // GET /api/metrics/overview — métricas gerais de conversão
  app.get('/overview', auth, async (request, reply) => {
    const { id } = (request as any).user

    const metrics = await queryOne<any>(`
      WITH
        conv AS (
          SELECT
            COUNT(*)                                                              AS total_leads,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')      AS new_leads_week,
            COUNT(*) FILTER (WHERE status = 'active')                            AS active_conversations
          FROM conversations
          WHERE nutritionist_id = $1
        ),
        appts AS (
          SELECT
            COUNT(*) FILTER (WHERE status != 'cancelled')                         AS total_appointments,
            COUNT(*) FILTER (WHERE status NOT IN ('cancelled')
              AND created_at >= NOW() - INTERVAL '7 days')                       AS appointments_week,
            COUNT(*) FILTER (WHERE status = 'completed')                         AS completed_appointments,
            COUNT(*) FILTER (WHERE status = 'completed'
              AND scheduled_at >= date_trunc('month', NOW()))                    AS completed_this_month
          FROM appointments
          WHERE nutritionist_id = $1
        ),
        cli AS (
          SELECT COUNT(*) AS total_clients
          FROM clients
          WHERE nutritionist_id = $1
        ),
        ass AS (
          SELECT consultation_price
          FROM assistants
          WHERE nutritionist_id = $1
        )
      SELECT
        conv.*,
        appts.*,
        cli.total_clients,
        ass.consultation_price,
        ROUND(
          (
            SELECT COUNT(DISTINCT c2.id)::NUMERIC
            FROM conversations c2
            WHERE c2.nutritionist_id = $1
              AND EXISTS (
                SELECT 1 FROM appointments ap2
                JOIN clients cl2 ON cl2.id = ap2.client_id
                WHERE ap2.nutritionist_id = c2.nutritionist_id
                  AND cl2.phone = c2.client_phone
                  AND ap2.status != 'cancelled'
              )
          ) / NULLIF(conv.total_leads::NUMERIC, 0) * 100, 1
        ) AS conversion_rate
      FROM conv, appts, cli, ass
    `, [id])

    return reply.send({ metrics: metrics ?? null })
  })

  // GET /api/metrics/pipeline — dados para o kanban CRM de leads
  app.get('/pipeline', auth, async (request, reply) => {
    const { id } = (request as any).user

    const leads = await query<any>(`
      SELECT
        c.id,
        c.client_phone,
        c.status        AS conv_status,
        c.created_at,
        c.last_message_at,
        cl.name         AS client_name,
        cl.id           AS client_id,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id)::INT AS message_count,
        (
          SELECT a.scheduled_at FROM appointments a
          JOIN clients cl2 ON cl2.id = a.client_id
          WHERE a.nutritionist_id = c.nutritionist_id
            AND cl2.phone = c.client_phone
            AND a.status IN ('scheduled', 'confirmed')
          ORDER BY a.scheduled_at ASC LIMIT 1
        ) AS next_appointment,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM appointments a
            JOIN clients cl3 ON cl3.id = a.client_id
            WHERE a.nutritionist_id = c.nutritionist_id
              AND cl3.phone = c.client_phone
              AND a.status = 'completed'
          ) THEN 'converted'
          WHEN EXISTS (
            SELECT 1 FROM appointments a
            JOIN clients cl3 ON cl3.id = a.client_id
            WHERE a.nutritionist_id = c.nutritionist_id
              AND cl3.phone = c.client_phone
              AND a.status IN ('scheduled', 'confirmed')
          ) THEN 'scheduled'
          WHEN c.last_message_at >= NOW() - INTERVAL '24 hours' THEN 'new'
          ELSE 'engaged'
        END AS stage
      FROM conversations c
      LEFT JOIN clients cl
        ON cl.phone = c.client_phone AND cl.nutritionist_id = c.nutritionist_id
      WHERE c.nutritionist_id = $1
        AND c.status != 'resolved'
      ORDER BY c.last_message_at DESC NULLS LAST
      LIMIT 200
    `, [id])

    return reply.send({ leads })
  })

  // GET /api/metrics/recent-activity — últimas ações (novos leads + consultas)
  app.get('/recent-activity', auth, async (request, reply) => {
    const { id } = (request as any).user

    const newLeads = await query<any>(`
      SELECT
        'new_lead'       AS type,
        c.created_at     AS occurred_at,
        cl.name          AS client_name,
        c.client_phone
      FROM conversations c
      LEFT JOIN clients cl
        ON cl.phone = c.client_phone AND cl.nutritionist_id = c.nutritionist_id
      WHERE c.nutritionist_id = $1
        AND c.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY c.created_at DESC
      LIMIT 5
    `, [id])

    const appts = await query<any>(`
      SELECT
        'appointment'    AS type,
        a.created_at     AS occurred_at,
        cl.name          AS client_name,
        cl.phone         AS client_phone,
        a.scheduled_at,
        a.status
      FROM appointments a
      JOIN clients cl ON cl.id = a.client_id
      WHERE a.nutritionist_id = $1
        AND a.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY a.created_at DESC
      LIMIT 5
    `, [id])

    const activity = [...newLeads, ...appts]
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
      .slice(0, 10)

    return reply.send({ activity })
  })
}
