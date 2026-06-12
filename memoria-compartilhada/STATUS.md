# Status atual - Frame System

> O que esta em andamento AGORA. Cada agente (Claude Code ou Codex) deve:
> 1. Ler este arquivo antes de comecar qualquer tarefa.
> 2. Atualizar a secao do seu proprio agente quando comecar/terminar algo.
> 3. Mover itens concluidos para o [LOG.md](LOG.md) com a data.

---

## Claude Code

- **Ultima atividade**: 2026-06-12 - Conferido o trabalho que o Codex
  concluiu (port Lovable de `configuracoes`, `integracoes`, `clientes`,
  `equipe`, `agenda`, `conversas`, remocao de `/design-system`, ajustes em
  `Sidebar`/`TopBar`/`globals.css`). Validado `npx tsc --noEmit` (ok) em
  `apps/dashboard`. Commit + push feitos a pedido da Heloisa.
- **Em andamento**: nada no momento (ver LOG.md - port `treinamento`/
  `followup` concluido em 2026-06-12).
- **Bloqueado/aguardando**: 2026-06-12 - alteracoes em `followup/page.tsx`
  e `treinamento/page.tsx` feitas e validadas (`npx tsc --noEmit` +
  `npm run build`, 40 rotas ok), mas **sem commit/push** - aguardando
  confirmacao da Heloisa para deploy.

## Codex

- **Ultima atividade**: 2026-06-11 - assumiu o port Lovable/PDF apos
  autorizacao da Heloisa e aplicou ajustes finais em configuracoes,
  integracoes, clientes, equipe, agenda e conversas; build passou (39 rotas).
- **Em andamento**: nada no momento.
- **Bloqueado/aguardando**: nada no momento.

---

## Como atualizar

Substitua os campos da sua secao. Seja breve (1-3 linhas por campo). Se
terminar uma tarefa, mova um resumo para `LOG.md` com a data e limpe o
"Em andamento" daqui.
