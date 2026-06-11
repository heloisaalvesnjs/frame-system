# Status atual - Frame System

> O que esta em andamento AGORA. Cada agente (Claude Code ou Codex) deve:
> 1. Ler este arquivo antes de comecar qualquer tarefa.
> 2. Atualizar a secao do seu proprio agente quando comecar/terminar algo.
> 3. Mover itens concluidos para o [LOG.md](LOG.md) com a data.

---

## Claude Code

- **Ultima atividade**: 2026-06-11 - Concluiu o redesign "Calm Pro"/Lovable
  das duas ultimas paginas pendentes (`agenda` e `treinamento`), encerrando
  o pedido "faca todas as paginas... copiar e colar". `tsc --noEmit` ok em
  apps/dashboard. Detalhes completos em LOG.md.
- **Em andamento**: Redesign de TODAS as paginas do dashboard concluido
  (clientes, perfil, equipe, admin, seguranca, servicos, configuracoes,
  disponibilidade, followup, integracoes, onboarding, agenda, treinamento).
  Ainda sem commit/push - falta validar com `npm run build` e confirmar com
  a Heloisa antes de comitar/dar push (deploy Vercel). Sidebar/TopBar nao
  foram alterados (decisao 2026-06-10). Sem proximas tarefas definidas apos
  o deploy - aguardando novas prioridades da Heloisa/Codex.
- **Bloqueado/aguardando**: limite do Figma MCP liberado ou plano atualizado. Nota: nao ha credenciais de teste no
  repo para verificar UI no preview com login - mudancas validadas so por
  `tsc --noEmit`.

## Codex

- **Ultima atividade**: 2026-06-11 - analisou `Frame Vision.zip` e portou ajustes visuais faltantes do shell/design system (TopBar, Sidebar, tokens, botao primario). Build do dashboard passou.
- **Em andamento**: nada no momento.
- **Bloqueado/aguardando**: nada no momento.

---

## Como atualizar

Substitua os campos da sua secao. Seja breve (1-3 linhas por campo). Se
terminar uma tarefa, mova um resumo para `LOG.md` com a data e limpe o
"Em andamento" daqui.
