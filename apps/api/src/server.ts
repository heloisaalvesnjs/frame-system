import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import staticFiles from '@fastify/static'
import path from 'path'

import { authRoutes } from './routes/auth.routes'
import { nutritionistRoutes } from './routes/nutritionist.routes'
import { assistantRoutes } from './routes/assistant.routes'
import { appointmentRoutes } from './routes/appointment.routes'
import { conversationRoutes } from './routes/conversation.routes'
import { whatsappRoutes } from './routes/whatsapp.routes'
import { webhookRoutes } from './routes/webhook.routes'
import { internalRoutes } from './routes/internal.routes'
import { metricsRoutes } from './routes/metrics.routes'
import { clientRoutes } from './routes/client.routes'
import { patientRoutes } from './routes/patient.routes'
import { adminRoutes }   from './routes/admin.routes'
import { featuresRoutes } from './routes/features.routes'
import { servicesRoutes } from './routes/services.routes'
import { googleCalendarRoutes } from './routes/google-calendar.routes'
import { foodsRoutes } from './routes/foods.routes'
import { locationsRoutes } from './routes/locations.routes'
import { availabilityRoutes } from './routes/availability.routes'
import { teamRoutes } from './routes/team.routes'
import { integrationsRoutes } from './routes/integrations.routes'
import { followupSequencesRoutes } from './routes/followup-sequences.routes'
import { onboardingFormRoutes } from './routes/onboarding-form.routes'
import { runFollowupSequences, runAppointmentReminders, runPosConsulta, runRetorno } from './services/followup.service'
import { runWeeklyReport } from './services/report.service'
import { readFileSync } from 'fs'
import { db } from './db'

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: {
      target: 'pino-pretty',
      options: { colorize: true }
    }
  }
})

// ── Plugins ────────────────────────────────────────────────
// Dois frontends consomem a API (dashboard legado + painel novo), cada um
// com sua própria origem — origin fixo único bloquearia um dos dois.
const allowedOrigins = [
  process.env.DASHBOARD_URL || 'http://localhost:3000',
  process.env.PAINEL_URL || 'http://localhost:3100',
].filter(Boolean)

app.register(cors, {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
      cb(null, true)
    } else {
      cb(new Error('Not allowed by CORS'), false)
    }
  },
  credentials: true
})

app.register(jwt, {
  secret: process.env.JWT_SECRET || 'frame-system-secret-dev'
})

app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
})

app.register(staticFiles, {
  root: path.join(process.cwd(), 'uploads'),
  prefix: '/uploads/'
})

// ── Decoradores de autenticação ────────────────────────────
app.decorate('authenticate', async (request: any, reply: any) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.code(401).send({ error: 'Token inválido ou expirado' })
  }
})

app.decorate('authenticateInternal', async (request: any, reply: any) => {
  const key = request.headers['x-internal-key']
  const expected = process.env.INTERNAL_API_KEY
  if (!expected) {
    return reply.code(500).send({ error: 'INTERNAL_API_KEY não configurada no servidor' })
  }
  if (!key || key !== expected) {
    return reply.code(401).send({ error: 'Chave interna inválida' })
  }
})

// ── Rotas ──────────────────────────────────────────────────
app.register(authRoutes, { prefix: '/api/auth' })
app.register(nutritionistRoutes, { prefix: '/api/nutritionists' })
app.register(assistantRoutes, { prefix: '/api/assistants' })
app.register(appointmentRoutes, { prefix: '/api/appointments' })
app.register(conversationRoutes, { prefix: '/api/conversations' })
app.register(whatsappRoutes, { prefix: '/api/whatsapp' })
app.register(webhookRoutes, { prefix: '/webhook' })
app.register(internalRoutes, { prefix: '/api/internal' })
app.register(metricsRoutes,  { prefix: '/api/metrics' })
app.register(clientRoutes,   { prefix: '/api/clients' })
app.register(teamRoutes,     { prefix: '/api/team' })
app.register(patientRoutes,  { prefix: '/api/patient' })
app.register(adminRoutes,    { prefix: '/api/admin' })
app.register(featuresRoutes, { prefix: '/api/features' })
app.register(servicesRoutes,        { prefix: '/api/services' })
app.register(googleCalendarRoutes,  { prefix: '/api/google-calendar' })
app.register(foodsRoutes,           { prefix: '/api/foods' })
app.register(locationsRoutes,       { prefix: '/api/locations' })
app.register(availabilityRoutes,    { prefix: '/api/availability' })
app.register(integrationsRoutes,         { prefix: '/api/integrations' })
app.register(followupSequencesRoutes,    { prefix: '/api/followup-sequences' })
app.register(onboardingFormRoutes,       { prefix: '/api/onboarding-form' })

// ── Health check ───────────────────────────────────────────
app.get('/health', async (_req, reply) => {
  try {
    await db.query('SELECT 1')
    return reply.send({ status: 'ok', service: 'frame-system-api', db: 'connected' })
  } catch (err: any) {
    return reply.code(503).send({ status: 'degraded', service: 'frame-system-api', db: 'error', detail: err?.message })
  }
})

// ── Start ──────────────────────────────────────────────────
const start = async () => {
  try {
    // Auto-migrate schema on startup
    try {
      const schema = readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf-8')
      await db.query(schema)
      console.log('🗄️  Schema sincronizado')
    } catch (err) {
      console.error('⚠️  Erro ao sincronizar schema (continuando):', err)
    }

    const port = Number(process.env.API_PORT) || 3001
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`\n🚀 Frame System API rodando na porta ${port}`)

    // ── Schedulers automáticos ─────────────────────────────────
    // Aquecimento: primeira execução 1 min após o startup
    setTimeout(() => {
      runFollowupSequences().catch(console.error)
      runAppointmentReminders().catch(console.error)
      runPosConsulta().catch(console.error)
      runRetorno().catch(console.error)
    }, 60_000)

    // Follow-up por etapas: a cada 30 minutos (precisão dos delays configurados)
    setInterval(() => {
      runFollowupSequences().catch(console.error)
    }, 30 * 60 * 1000)

    // Lembrete de consulta 24h antes: a cada 1 hora
    setInterval(() => {
      runAppointmentReminders().catch(console.error)
    }, 60 * 60 * 1000)

    // Pós-consulta: a cada 30 minutos
    setInterval(() => {
      runPosConsulta().catch(console.error)
    }, 30 * 60 * 1000)

    // Mensagem de retorno: a cada 6 horas (precisão ±12h já na query)
    setInterval(() => {
      runRetorno().catch(console.error)
    }, 6 * 60 * 60 * 1000)

    // Relatório semanal: toda segunda-feira às 08h BRT
    setInterval(() => {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
      if (now.getDay() === 1 && now.getHours() === 8 && now.getMinutes() < 60) {
        runWeeklyReport().catch(console.error)
      }
    }, 60 * 60 * 1000)

    console.log('⏰ Schedulers registrados: follow-up, lembrete, pós-consulta, retorno, relatório')
    // ──────────────────────────────────────────────────────────

  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
