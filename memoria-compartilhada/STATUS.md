# Status atual - Frame System

> O que est� em andamento AGORA. Cada agente (Claude Code ou Codex) deve:
> 1. Ler este arquivo antes de come�ar qualquer tarefa.
> 2. Atualizar a se��o do seu pr�prio agente quando come�ar/terminar algo.
> 3. Mover itens conclu�dos para o [LOG.md](LOG.md) com a data.

---

## Claude Code
(2026-07-05) Auditoria E2E + correcoes aplicadas (n8n publicado, backend commitado/pushado) + migracao Supabase EXECUTADA e ativa em producao (DATABASE_URL trocada no EasyPanel; health/context verificados: Daniela, 6 planos, 7 locais, agenda por cidade viva, next_appointment presente). ai_24h ativado. Login configurado no registro do David (email heloisaalvesnjs@gmail.com).

DASHBOARD NOVO em andamento: app `apps/painel` (Next 16 + shadcn + bloco @efferd/dashboard-3). Fundacao pronta: paleta Frame (claro+escuro), Inter, navegacao pt-BR (Visao geral/Atendimento/Agenda/Disponibilidade/Pacientes/Assistente/Configuracoes), route group (app) com shell, modo claro/escuro. Telas ainda sao placeholders — proximo: ligar cada uma na Frame API. Arquitetura dashboard->n8n JA existe (n8n le config ao vivo do Supabase via /api/internal/n8n/context; dashboard so precisa escrever nos endpoints auth existentes). Override @types/react 19 no package.json raiz (dashboard antigo valida ok).

## Codex
[Status aguardando atualiza��o]
