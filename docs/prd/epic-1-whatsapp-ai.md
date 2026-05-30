# Epic 1: Integração WhatsApp + IA

**Status:** In Progress  
**Prioridade:** Alta  

## Objetivo

Conectar o número de WhatsApp do consultório à plataforma e ativar a assistente virtual com IA (Claude AI) para responder automaticamente às mensagens dos pacientes.

## Contexto Técnico

- **Evolution API v2** (`nutriapp-evolution2`) — gerencia instância WhatsApp via Baileys
- **n8n** — orquestra o fluxo: recebe webhook → chama Claude AI → envia resposta
- **API Fastify** (`nutriapp_api`) — intermediário entre dashboard e Evolution API
- **Dashboard Next.js** — interface para nutricionista configurar e monitorar

## Stories

### Story 1.1 — Conexão WhatsApp via Pairing Code *(Em progresso)*

**Como** nutricionista,  
**Quero** conectar meu WhatsApp ao sistema usando um código de pareamento (sem QR Code),  
**Para** ativar a assistente virtual no meu número.

**Critérios de Aceitação:**
- [ ] Nutricionista digita seu número no formato `5511999999999`
- [ ] Clica em "Conectar" e aguarda ~10s enquanto a instância é criada
- [ ] Um código de 8 caracteres aparece na tela
- [ ] Nutricionista insere o código no WhatsApp (Configurações → Dispositivos → Vincular com número de telefone)
- [ ] Status muda para "Conectado" automaticamente após pareamento
- [ ] Número conectado aparece na tela de configurações

**Notas técnicas:**
- `POST /api/whatsapp/connect` → cria instância na Evolution API
- `POST /api/whatsapp/pairing-code` → body: `{ number: "55..." }` (campo correto v2)
- Polling de status a cada 3s após exibir código
- Delay de 10s entre criação da instância e solicitação do código

---

### Story 1.2 — Fluxo Completo de Mensagens com IA

**Como** nutricionista,  
**Quero** que minha assistente virtual responda automaticamente às mensagens dos pacientes no WhatsApp,  
**Para** atender fora do horário e reduzir carga de trabalho.

**Critérios de Aceitação:**
- [ ] Paciente envia mensagem para o WhatsApp do consultório
- [ ] Evolution API recebe e envia webhook para `POST /webhook/whatsapp`
- [ ] n8n processa a mensagem e chama Claude AI com contexto da assistente
- [ ] Claude AI responde baseado na mensagem de boas-vindas e PDF configurado
- [ ] Resposta é enviada automaticamente de volta ao paciente via WhatsApp
- [ ] Conversa aparece no histórico do dashboard (se implementado)

**Notas técnicas:**
- Webhook: `http://nutriapp_api:3001/webhook/whatsapp`
- `WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=false` na Evolution API
- n8n workflow "WhatsApp Message Handler" ativo
- `INTERNAL_API_KEY` validado no header `x-internal-key`

---

### Story 1.3 — Configuração da Assistente Virtual

**Como** nutricionista,  
**Quero** configurar o nome, mensagem de boas-vindas e PDF de conhecimento da minha assistente,  
**Para** personalizar como ela interage com meus pacientes.

**Critérios de Aceitação:**
- [ ] Campo para nome da assistente (ex: "Lara", "Sofia")
- [ ] Campo para mensagem de boas-vindas (enviada no primeiro contato)
- [ ] Upload de PDF com protocolo/FAQ do consultório (até 10MB)
- [ ] PDF é usado como base de conhecimento pela IA nas respostas
- [ ] Salvar configurações persiste no banco de dados
- [ ] Preview da mensagem de boas-vindas exibido na tela

**Notas técnicas:**
- `POST /api/assistants` — salvar configurações
- `POST /api/assistants/upload-pdf` — upload do PDF
- PDF armazenado em disco/storage, caminho salvo no banco
- n8n lê PDF via API antes de chamar Claude

---

### Story 1.4 — Desconexão e Reconexão do WhatsApp

**Como** nutricionista,  
**Quero** poder desconectar e reconectar meu WhatsApp quando necessário,  
**Para** trocar de número ou resolver problemas de conexão.

**Critérios de Aceitação:**
- [ ] Botão "Desconectar WhatsApp" visível quando conectado
- [ ] Confirmação antes de desconectar
- [ ] Após desconexão, status volta para "Desconectado"
- [ ] É possível reconectar imediatamente após desconectar
- [ ] Status de conexão atualiza em tempo real (polling 5s)

---

## Dependências

- Evolution API v2 rodando e acessível
- n8n com workflows ativados
- Variável `ANTHROPIC_API_KEY` configurada na API
- Variável `INTERNAL_API_KEY` configurada e consistente entre API e n8n
