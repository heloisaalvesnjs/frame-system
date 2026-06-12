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
- **Em andamento**: 2026-06-12 - redesign pagina a pagina do dashboard
  comparando com prints do Lovable (a pedido da Heloisa). Primeira etapa
  (`/dashboard`): `Hero` reescrito com copy dinamica baseada em metricas
  reais (`new_leads_week`, `active_conversations`, `appointments_week`) +
  botoes "Ver insights"/"Executar follow-up"; nova secao "Insights
  inteligentes" (`InsightsList`, ancora `#insights`) com cards de
  conversas abertas/novos leads/taxa de conversao e badge "Acao sugerida",
  usando apenas dados reais (sem fabricar MRR/Churn). `npx tsc --noEmit`
  ok. Ainda sem verificacao visual no preview (requer login) nem
  commit/push.
- **Em andamento**: 2026-06-12 - segunda etapa do redesign pagina a pagina
  (`/conversas`), a pedido da Heloisa (prints do Lovable "Inbox"). Maior
  parte do visual do Lovable (badges de canal, contador de "nao lidas",
  status "Online", e o painel direito com Estagio/Plano/LTV/Historico)
  depende de campos que nao existem no schema (CRM/funil/billing - ja
  mapeado no gap analysis de 2026-06-11 em MEMORY.md), entao - a pedido da
  Heloisa - apliquei so o que e viavel com dados reais: (1) reativada a
  linha de stats (Em aberto/Aguardando voce/Agendamentos/Sem retorno) usando
  `/api/conversations/stats`; (2) cabecalho do chat ganhou botoes "Ligar"
  (`tel:`) e "Abrir no WhatsApp" (`wa.me`) com `client_phone` real; (3)
  composer passou a ficar sempre visivel (antes so aparecia em "Aguardando
  voce"), desabilitado com texto explicativo quando a IA esta ativa ou a
  conversa esta resolvida. `npx tsc --noEmit` ok. Sem verificacao visual no
  preview (requer login) nem commit/push.
- **Em andamento**: 2026-06-12 - terceira etapa do redesign pagina a pagina
  (`/agenda`), a pedido da Heloisa (2 prints do Lovable "como tem que ficar"
  + 1 print do estado atual). Mudancas: (1) cards de consulta na grade
  semanal ganharam icone Video/MapPin (online vs presencial) junto do
  horario, no lugar do emoji fixo; (2) header e toolbar (navegacao de
  semana, "Hoje", "Bloquear", "Nova consulta") foram unificados numa unica
  linha, com subtitulo "Semana de D a D de MMMM · N consulta(s) hoje"; (3)
  layout passou a permitir scroll de pagina - grid semanal (sidebar +
  WeekView) ganhou altura fixa (600px) com scroll interno proprio, e abaixo
  dela duas novas secoes usando `Card`/`SectionTitle`/`Avatar`/`Badge`:
  "Proximas 24 horas" (consultas nao canceladas nas proximas 24h, com
  avatar/nome/modalidade/status/horario) e "Bloqueios" (bloqueios da semana
  ordenados por data, com "Dia todo" para bloqueios >= 12h). KPI row
  (Consultas na semana/Confirmadas/Realizadas/Canceladas) mantida com dados
  reais - nao fabricado "Taxa de ocupacao"/"No-shows"/"Receita prevista" do
  Lovable (sem schema para isso). Sidebar com mini-calendario e legenda de
  status mantida. `npx tsc --noEmit` ok. Nota: Codex tambem cita `agenda`
  no seu "Em andamento" de correcao de fidelidade - se houver conflito de
  diff, avisar. Sem verificacao visual no preview (requer login) nem
  commit/push.
- **Em andamento**: 2026-06-12 - quarta etapa do redesign pagina a pagina
  (`/automacoes`, arquivo `followup/page.tsx`), a pedido da Heloisa (2
  prints do estado atual + 1 print do Lovable "como quero que fique"). O
  card "Todos os fluxos" foi reestruturado no layout de tabela do Lovable:
  cabecalho de colunas (Fluxo/Execucoes/Conversao/Status), pill de status
  por fluxo via `Badge` (`success` "Ativo" / `default` "Pausado"), e novos
  filtros "Todos/Ativos/Pausados" (funcionais, filtram pela flag real de
  cada fluxo). Pergunta feita a Heloisa sobre as metricas fabricadas do
  Lovable (2.790 execucoes/48.2% conversao/etc, dependentes de tracking de
  execucao do n8n que nao existe) - ela escolheu **manter dados reais
  (0/sem dados)**: KPI row (Fluxos ativos/Execucoes (7d)/Conversao
  media/Tempo economizado) ficou inalterada, e as colunas
  Execucoes/Conversao por fluxo na tabela mostram "—" (sem fabricar
  numeros). `npx tsc --noEmit` ok. Sem verificacao visual no preview
  (requer login) nem commit/push.
- **Em andamento**: 2026-06-12 - quinta etapa do redesign pagina a pagina
  (`/treinamento` + `/disponibilidade`), a pedido da Heloisa. Em
  `treinamento`: KPI "Atendimento humano" trocado por "Mensagens enviadas
  pela IA" (novo campo `ai_messages` em `/api/conversations/stats`); secoes
  "Base de conhecimento" (com abas, icone `BookOpen`) e "Configuracoes da
  assistente" passaram a ficar lado a lado em grid de 2 colunas
  (`grid grid-cols-1 gap-6 lg:grid-cols-2`); "Horario de funcionamento da
  IA" mantido abaixo. Removida a secao "Locais de Atendimento" (era
  duplicada/morta ali) - migrada por completo para `/disponibilidade` como
  nova secao "Locais de atendimento" (Field, Location interface,
  LOCATION_MODALITIES, LOCATION_COLORS, LocationCard, TabLocais), reusando
  `/api/locations` (CRUD de consultorios/cidades, valor, sinal, mensagem de
  confirmacao, cor na agenda). `npx tsc --noEmit` e `npm run build` ok (39
  rotas). Sem verificacao visual no preview (requer login) nem
  commit/push.
- **Em andamento**: 2026-06-12 - restyle de `/disponibilidade` para o
  layout compacto do Lovable, a pedido da Heloisa (3 prints: mockup Lovable
  + estado atual). Pedido explicito: manter 100% da funcionalidade real
  (edicao por dia, pausa almoco, duracao do slot, dias sem atendimento,
  locais de atendimento), so reduzir a densidade visual. Implementado:
  secao "Dias uteis"/"Fim de semana" (lista de `DayRow` sempre expandidos)
  substituida por grid 2 colunas - "Horario semanal padrao" (esquerda,
  `lg:col-span-2`) com `CompactDayRow` por dia (linha colapsavel: nome do
  dia + chips de horario com icone `Clock` + pill "Ativo"/"Pausado"; expande
  para o `DayRow` completo de edicao) e sidebar direita com `RulesCard`
  ("Regras": "Duracao padrao" calculado a partir do `slot_duration` real mais
  comum entre dias ativos; "Buffer entre consultas"/"Antecedencia minima"/
  "Limite por dia" mostrados como "—" - sem fabricar dados, esses campos nao
  existem no schema de `availability`) e `ExceptionsCard` ("Exceções -
  Proximos 60 dias", lista real de `/api/availability/blocked` com badge
  "Bloqueio total"; sem conceito de "Parcial" no schema). Secoes "Dias sem
  atendimento" (`BlockedCalendar`) e "Locais de atendimento" (`TabLocais`,
  ja portado na etapa anterior) mantidas inalteradas abaixo do novo grid.
  `npx tsc --noEmit` e `npm run build` ok (39 rotas). Sem verificacao visual
  no preview (requer login) nem commit/push.
- **Bloqueado/aguardando**: aguardando a Heloisa revisar os screenshots e
  confirmar antes do commit/push (ela pediu para nao aceitar erros desta
  vez). Nenhuma das mudancas (minhas + Codex + redesign do dashboard/
  conversas/agenda/automacoes/treinamento/disponibilidade) foi
  commitada/enviada ainda.

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
