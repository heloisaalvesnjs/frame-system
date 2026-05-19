# Frame System — Contexto do Projeto

## O que é

SaaS de automação de atendimento para nutricionistas autônomos. Cada nutricionista tem uma **recepcionista virtual personalizada** que atende clientes no WhatsApp, entende a dor deles, qualifica o lead e agenda a primeira consulta automaticamente — sem parecer um robô.

---

## Modelo de negócio

- **Público-alvo:** nutricionistas autônomos (pessoa física)
- **Precificação:**
  - Opção A: Setup R$2.500–3.000 + R$997/mês
  - Opção B: Sem setup + R$1.297/mês (mínimo 3 meses)
  - Plano anual: R$8.970/ano (equivale a 9 meses)
- **Canal inicial:** WhatsApp (único por ora)
- **Diferencial:** cada nutricionista faz upload de um PDF com sua personalidade e protocolo de atendimento — a IA age como recepcionista treinada por ela

---

## Decisões técnicas

| Item | Decisão |
|------|---------|
| WhatsApp | Evolution API (número próprio de cada nutri) |
| IA | Claude API (claude-sonnet-4-6) |
| Orquestração | n8n |
| Backend | Node.js + Fastify + TypeScript |
| Banco | PostgreSQL |
| Cache/Filas | Redis |
| Dashboard | Next.js (ainda não criado) |
| Deploy | Railway ou Vercel |
| Modelo | Multi-tenant (1 instância por nutricionista) |

---

## O que já foi construído

### Backend (`apps/api/src/`)

**Banco de dados** (`db/schema.sql`)
- `nutritionists` — tenants do sistema
- `assistants` — recepcionista IA de cada nutri (1:1)
- `whatsapp_connections` — instâncias da Evolution API
- `availability` — horários disponíveis por dia da semana
- `clients` — pacientes/leads
- `appointments` — consultas agendadas
- `conversations` + `messages` — histórico de atendimentos

**Rotas da API**
- `POST /api/auth/register` — cadastro da nutricionista
- `POST /api/auth/login` — login com JWT
- `GET  /api/auth/me` — perfil autenticado
- `GET/PUT /api/nutritionists/profile` — perfil da nutri
- `GET/POST/DELETE /api/nutritionists/availability` — horários
- `GET/POST /api/assistants` — criar/editar assistente
- `POST /api/assistants/upload-pdf` — upload do PDF com instruções
- `DELETE /api/assistants/pdf` — remove o PDF
- `GET /api/appointments` — lista consultas
- `GET /api/appointments/slots?date=` — horários livres
- `POST /api/appointments` — agendar (usado pela IA)
- `PATCH /api/appointments/:id/status` — confirmar/cancelar
- `GET /api/conversations` — lista conversas
- `GET /api/conversations/:id/messages` — histórico
- `POST /api/conversations/:id/takeover` — nutri assume a conversa
- `POST /api/conversations/:id/resolve` — marca como resolvida
- `POST /api/whatsapp/connect` — conecta WhatsApp via QR Code
- `GET  /api/whatsapp/status` — status da conexão
- `POST /api/whatsapp/disconnect` — desconecta
- `POST /webhook/whatsapp` — recebe mensagens da Evolution API

**Serviços**
- `ai.service.ts` — lê PDF + monta system prompt + chama Claude + detecta agendamento automático
- `whatsapp.service.ts` — cria instância, busca QR, envia mensagem (Evolution API)
- `appointment.service.ts` — calcula slots disponíveis com base na agenda

**Infraestrutura** (`infra/docker-compose.yml`)
- PostgreSQL, Redis, Evolution API, n8n — todos em Docker

---

## O que falta construir

### Fase 1 (MVP — prioridade agora)

1. **Dashboard Next.js** (`apps/dashboard/`) — interface da nutricionista com:
   - Tela de login/cadastro
   - Onboarding: criar assistente + upload PDF + configurar horários + conectar WhatsApp
   - Página de conversas em tempo real (lista + chat)
   - Calendário de agendamentos
   - Página de configurações (perfil + assistente)

2. **Testes e ajustes da API** — rodar o ambiente e validar os fluxos

### Fase 2 (após primeiro cliente)
- Cobrança automática (Stripe ou Asaas)
- Notificações push para a nutricionista
- Relatórios e métricas

### Fase 3 (escala)
- Onboarding self-service completo
- Multi-canal (Instagram, site)

---

## Como rodar o projeto

```bash
# 1. Subir infraestrutura
cd infra && docker compose up -d

# 2. Configurar ambiente
cp .env.example apps/api/.env
# Preencher ANTHROPIC_API_KEY e EVOLUTION_API_KEY no .env

# 3. Instalar dependências
npm install

# 4. Rodar migrations
npm run db:migrate

# 5. Iniciar API
npm run dev -w apps/api
# API disponível em http://localhost:3001
```

---

## Fluxo completo de atendimento

```
Cliente manda mensagem no WhatsApp
        ↓
Evolution API dispara webhook para POST /webhook/whatsapp
        ↓
API identifica a nutricionista pela instância
        ↓
Verifica se conversa está em modo humano (takeover)
        ↓ (não está)
ai.service.ts busca perfil da nutri + PDF + horários disponíveis
        ↓
Monta system prompt personalizado da assistente
        ↓
Chama Claude API com histórico da conversa
        ↓
Claude responde como a recepcionista da nutricionista
        ↓
Detecta confirmação de agendamento na resposta
        ↓ (se houver)
Cria appointment no banco automaticamente
        ↓
Envia resposta ao cliente via Evolution API
```

---

## Próximo passo imediato

Construir o dashboard Next.js em `apps/dashboard/`. Páginas prioritárias:
1. `/login` e `/cadastro`
2. `/onboarding` — configuração inicial guiada (4 passos)
3. `/conversas` — lista + visualização de chat em tempo real
4. `/agenda` — calendário com consultas agendadas
5. `/configuracoes` — perfil, assistente, WhatsApp
