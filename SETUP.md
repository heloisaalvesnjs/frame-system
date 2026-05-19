# Frame System — Setup de Desenvolvimento

## Pré-requisitos
- Node.js 20+
- Docker e Docker Compose
- Git

---

## 1. Subir os serviços de infraestrutura

```bash
cd infra
docker compose up -d
```

Isso sobe:
- **PostgreSQL** → porta 5432
- **Redis** → porta 6379
- **Evolution API (WhatsApp)** → porta 8080
- **n8n** → porta 5678 (admin/frame2026)

---

## 2. Configurar variáveis de ambiente

```bash
cp .env.example apps/api/.env
```

Edite `apps/api/.env` e preencha:
- `ANTHROPIC_API_KEY` → sua chave da Anthropic
- `EVOLUTION_API_KEY` → `frame-system-evo-key` (definido no docker-compose)

---

## 3. Instalar dependências

```bash
npm install
```

---

## 4. Rodar as migrations do banco

```bash
npm run db:migrate
```

---

## 5. Iniciar a API

```bash
npm run dev -w apps/api
```

API disponível em: `http://localhost:3001`
Health check: `http://localhost:3001/health`

---

## Fluxo de uso (MVP)

1. Nutricionista se cadastra → `POST /api/auth/register`
2. Cria a assistente → `POST /api/assistants`
3. Faz upload do PDF com instruções → `POST /api/assistants/upload-pdf`
4. Configura horários disponíveis → `POST /api/nutritionists/availability`
5. Conecta WhatsApp → `POST /api/whatsapp/connect` → escaneia QR Code
6. A partir daqui, mensagens chegam automaticamente pelo webhook

---

## Serviços e portas

| Serviço       | Porta | Acesso                        |
|---------------|-------|-------------------------------|
| API           | 3001  | http://localhost:3001         |
| Dashboard     | 3000  | http://localhost:3000         |
| PostgreSQL    | 5432  | framesystem/framesystem       |
| Evolution API | 8080  | apikey: frame-system-evo-key  |
| n8n           | 5678  | admin/frame2026               |
| Redis         | 6379  | sem auth (dev)                |
