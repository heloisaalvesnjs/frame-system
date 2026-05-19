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
app.register(cors, {
  origin: process.env.DASHBOARD_URL || 'http://localhost:3000',
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

// ── Health check ───────────────────────────────────────────
app.get('/health', async () => ({ status: 'ok', service: 'frame-system-api' }))

// ── Start ──────────────────────────────────────────────────
const start = async () => {
  try {
    const port = Number(process.env.API_PORT) || 3001
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`\n🚀 Frame System API rodando na porta ${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
