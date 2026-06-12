# Status atual - Frame System

> O que esta em andamento AGORA. Cada agente (Claude Code ou Codex) deve:
> 1. Ler este arquivo antes de comecar qualquer tarefa.
> 2. Atualizar a secao do seu proprio agente quando comecar/terminar algo.
> 3. Mover itens concluidos para o [LOG.md](LOG.md) com a data.

---

## Claude Code

- **Ultima atividade**: 2026-06-12 - Port Lovable de `treinamento` e
  `followup` concluido, validado (`npx tsc --noEmit` + `npm run build`, 40
  rotas ok) e enviado para `origin/main` (commit + push feitos a pedido da
  Heloisa, deploy disparado no Vercel). Em seguida, revisado o trabalho
  nao commitado do Codex (correcao de fidelidade Lovable/Frame Vision em
  globals.css, Sidebar, conversas, integracoes, configuracoes, followup,
  treinamento) - `npx tsc --noEmit` e `npm run build` ok com essas
  mudancas. Verificado `agenda`/`clientes`/`equipe` (citados no "Em
  andamento" do Codex mas sem diff): ja usam tokens semanticos
  (var(--border)/var(--surface)/var(--raised)/text-t1/t2/t3) que herdam
  automaticamente os novos valores de globals.css, sem necessidade de
  edicao. Unico ajuste feito: banner de erro em `clientes/page.tsx` tinha
  cores hardcoded so-light (#FEF2F2/#FECACA) - trocado para
  `var(--danger)` com color-mix, ficando theme-aware. `npx tsc --noEmit`
  ok.
- **Ultima atividade**: 2026-06-12 - Auditoria completa do modo claro
  (todas as paginas do dashboard via preview), a pedido da Heloisa apos
  print mostrando modo claro "horrivel". Achados e correcoes: (1) mojibake
  real em `treinamento/page.tsx` ("Modelo Frame Â· v3.2" / "Em produÃ§Ã£o" ->
  "Modelo Frame · v3.2" / "Em produção"); (2) mojibake real em
  `followup/page.tsx` ("ExecuÃ§Ãµes (7d)" / "ConversÃ£o mÃ©dia" -> "Execuções
  (7d)" / "Conversão média"); (3) `conversas/page.tsx` - filtros
  (Todas/IA ativa/Aguardando você/Resolvidas) estavam truncando
  "Resolvidas" -> "Resolvic" com scrollbar horizontal no painel esquerdo;
  trocado `overflow-x-auto` por `flex flex-wrap` (sem `shrink-0`), agora os
  4 filtros aparecem completos em 2 linhas. `npx tsc --noEmit` e
  `npm run build` ok (39 rotas). Tambem revertidos os 3 edits temporarios
  de debug/mock-auth usados para navegar no preview sem login
  (AuthContext.tsx, layout.tsx, lib/api.ts) - voltaram ao estado original.
- **Em andamento**: nada no momento.
- **Bloqueado/aguardando**: aguardando a Heloisa revisar os screenshots e
  confirmar antes do commit/push (ela pediu para nao aceitar erros desta
  vez). Nenhuma das mudancas (minhas + Codex) foi commitada/enviada ainda.

## Codex

- **Ultima atividade**: 2026-06-11 - assumiu o port Lovable/PDF apos
  autorizacao da Heloisa e aplicou ajustes finais em configuracoes,
  integracoes, clientes, equipe, agenda e conversas; build passou (39 rotas).
- **Em andamento**: 2026-06-12 - correcao final de fidelidade Lovable/Frame
  Vision nas telas do dashboard, com foco em modo claro, conversas, agenda,
  clientes, automacoes, assistente, equipe, integracoes e configuracoes.
- **Bloqueado/aguardando**: nada no momento.

---

## Como atualizar

Substitua os campos da sua secao. Seja breve (1-3 linhas por campo). Se
terminar uma tarefa, mova um resumo para `LOG.md` com a data e limpe o
"Em andamento" daqui.
