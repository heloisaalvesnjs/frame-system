# Status atual - Frame System

> O que esta em andamento AGORA. Cada agente (Claude Code ou Codex) deve:
> 1. Ler este arquivo antes de comecar qualquer tarefa.
> 2. Atualizar a secao do seu proprio agente quando comecar/terminar algo.
> 3. Mover itens concluidos para o [LOG.md](LOG.md) com a data.

---

## Claude Code

- **Ultima atividade**: 2026-06-11 - Concluiu C.13 (logs/avaliacao de
  conversas), ultimo item do plano de 13. Schema: `conversations.outcome`,
  `outcome_notes`, `closed_at`. Novas rotas `POST /:id/outcome` e `GET
  /api/conversations/stats`. `POST /:id/resolve` aceita `{outcome,
  outcome_notes}` opcional. `detectAndCreateAppointment()` agora classifica
  automaticamente `outcome='agendou'` ao confirmar agendamento. UI
  `/conversas`: cards de metricas (Resolvidas/Agendamentos/Vendas/Sem
  retorno) + rodape de classificacao para conversas resolvidas. `tsc
  --noEmit` ok em api e dashboard. Detalhes completos em LOG.md.
- **Em andamento**: Plano consolidado de 13 itens - **13/13 concluidos** e
  **commitado/pushado para origin/main** (3 commits, ver LOG.md), deploy
  disparado no Vercel. A.3 ficou como decisao registrada (sem codigo, ver
  MEMORY.md). Sem proximas tarefas definidas - aguardando novas prioridades
  da Heloisa/Codex.
- **Bloqueado/aguardando**: limite do Figma MCP liberado ou plano atualizado. Nota: nao ha credenciais de teste no
  repo para verificar UI no preview com login - mudancas validadas so por
  `tsc --noEmit`.

## Codex

- **Ultima atividade**: 2026-06-11 - criou rota publica /preview-dashboard para visualizar redesign sem login.
- **Em andamento**: carrossel do Instagram no Figma iniciado, mas bloqueado pelo limite do Figma MCP do plano Starter.
- **Bloqueado/aguardando**: limite do Figma MCP liberado ou plano atualizado.

---

## Como atualizar

Substitua os campos da sua secao. Seja breve (1-3 linhas por campo). Se
terminar uma tarefa, mova um resumo para `LOG.md` com a data e limpe o
"Em andamento" daqui.


