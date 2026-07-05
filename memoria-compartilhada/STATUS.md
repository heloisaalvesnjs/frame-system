# Status atual - Frame System

> O que est� em andamento AGORA. Cada agente (Claude Code ou Codex) deve:
> 1. Ler este arquivo antes de come�ar qualquer tarefa.
> 2. Atualizar a se��o do seu pr�prio agente quando come�ar/terminar algo.
> 3. Mover itens conclu�dos para o [LOG.md](LOG.md) com a data.

---

## Claude Code
(2026-07-05) Auditoria E2E + correcoes aplicadas (n8n publicado, backend commitado/pushado) + migracao Supabase EXECUTADA e ativa em producao (DATABASE_URL trocada no EasyPanel; health/context verificados: Daniela, 6 planos, 7 locais, agenda por cidade viva, next_appointment presente). ai_24h ativado. Login configurado no registro do David (email heloisaalvesnjs@gmail.com, senha temporaria enviada no chat — trocar depois).

DASHBOARD NOVO (`apps/painel`, Next 16 + shadcn + bloco @efferd/dashboard-3) — telas conectadas de verdade na Frame API e VALIDADAS com login real contra producao (nao mockado):
- Login (JWT) + guard de auth + logout, tudo via `lib/api.ts`
- Disponibilidade: cidade-por-data (`date_location_overrides`), dias bloqueados (`blocked_dates`), horario semanal (`availability`) — testado com a agenda real do David (Vila Velha/Linhares/Nova Venecia/Sao Mateus/etc, exatamente como ele passou no formulario)
- Assistente (IA): identidade, frases, toggles ai_24h/ai_paused, chat de teste (`/api/assistants/test`) — carregou Daniela com todos os dados reais
- Pacientes: lista + busca (`/api/clients`)
- Integracoes: status real do WhatsApp (`/api/whatsapp/status`)
- Configuracoes: perfil real (`/api/nutritionists/profile`)
- Atendimento/Agenda/Visao geral: ainda placeholder (proxima fase — inbox ao vivo, calendario, metricas reais)
- Logo real aplicada (recuperada do git history — estava em `exports/frame-system-logo-modelo-5-waves-transparent.png`, deletada da working tree mas presente no HEAD)
- Modo claro reforcado (accent verde mais saturado — estava fraco demais, quase sem identidade)
- Nav nova: Integracoes adicionada

**Backend**: CORS agora aceita multi-origin (dashboard antigo + painel novo + qualquer localhost em dev) — antes so aceitava 1 origin fixo, bloqueava o painel. Commitado e JA EM PRODUCAO (EasyPanel parece redeployar automatico no push — confirmado observando login real funcionar poucos minutos apos o push, sem acao manual da Heloisa).

**Pendencia de schema conhecida**: `availability` (horario semanal) so tem 1 horario por dia da semana, nao por local — o David tem "horario diferente por local" que hoje nao e representado (so a cidade-por-data resolve isso). Registrar como melhoria futura se vier a ser bloqueante.

## Codex
[Status aguardando atualiza��o]
