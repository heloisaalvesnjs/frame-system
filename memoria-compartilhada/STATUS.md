# Status atual - Frame System

> O que esta em andamento AGORA. Cada agente (Claude Code ou Codex) deve:
> 1. Ler este arquivo antes de comecar qualquer tarefa.
> 2. Atualizar a secao do seu proprio agente quando comecar/terminar algo.
> 3. Mover itens concluidos para o [LOG.md](LOG.md) com a data.

---

## Claude Code

- **Ultima atividade**: 2026-06-15 - a pedido da Heloisa (remover
  Oportunidades, tornar o sistema funcional, repor calendario de bloqueio,
  verificar automacoes/n8n e assistente IA, sem perder configuracoes do
  nutri ativo): removida a pagina/rota/menu `/oportunidades`; `/agenda`
  ganhou de volta `BlockTimeModal`/`NewAppointmentModal`/`AppointmentModal`/
  `MiniCalendar` com dados reais; `/dashboard` reescrito com dados reais
  (`/api/metrics/overview`, `/api/conversations/stats`, `/api/appointments`,
  `/api/metrics/recent-activity`, `/api/whatsapp/status`), sem fabricacao;
  `/treinamento` restaurado para a versao funcional completa (1884 linhas -
  o port V4 tinha trocado por mockup sem nenhuma API, o que deixaria as
  configuracoes da nutri ativa invisiveis/nao editaveis, embora os dados
  continuassem no banco); `/configuracoes` reescrita em secoes com nav
  lateral (Perfil/Seguranca/Aparencia/Integracoes/Equipe), portando logica
  real de `/perfil`, `/seguranca`, `/integracoes`, `/equipe`. `/followup`
  (automacoes) ja estava ok de sessao anterior. `npx tsc --noEmit` e
  `npm run build` (40 rotas) ok. Detalhes completos em LOG.md. Arquivos
  temporarios `old_*.tsx` removidos.
- **Bloqueado/aguardando**: aguardando revisao da Heloisa (preview/prints) e
  confirmacao antes do commit/push.
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
- **Ultima atividade**: 2026-06-13 - a Heloisa aprovou o mockup
  `frame-system-lovable-light-v4-claude.html` (refinamento V4 a partir do
  V3 do Codex) e pediu para portar tudo para o sistema real, escolhendo
  explicitamente a opcao "Tudo, incluindo schema novo". Trabalho concluido
  nesta sessao:
  - **Polimento visual V4** em `globals.css` (scrollbar mais grossa +
    `background-clip: content-box`; novas utilities `.card-hover`,
    `.btn-gradient`, `.table-row-hover`), `finance-primitives.tsx` (`Card`
    com prop `hover` -> `.card-hover`; `Badge` agora pill-shaped com prop
    `dot`; `Btn` primary usa `.btn-gradient`; `Avatar` com ring/shadow) e
    `Sidebar.tsx` (item ativo ganhou barra lateral em gradiente, alem do
    dot existente).
  - **Nova pagina `/oportunidades`** (Kanban de funil comercial), com 6
    colunas (Novos contatos / Em atendimento / Qualificados / Avaliando /
    Agendamento pendente / Consulta marcada), busca por nome/objetivo,
    filtro por origem, e botoes de mover etapa (anterior/proxima) por card
    - tudo com dados reais via nova API. Adicionada ao `Sidebar.tsx` (icone
    `Target`, entre Conversas e Clientes) e ao `PAGE_TITLES` de
    `TopBar.tsx`.
  - **Schema novo** (`apps/api/src/db/schema.sql`, `ALTER TABLE clients ADD
    COLUMN IF NOT EXISTS`): `stage` (TEXT, default `'novo_contato'`,
    valores: `novo_contato | em_atendimento | qualificado | avaliando |
    agendamento_pendente | consulta_marcada | perdido`), `source` (TEXT,
    origem do contato), `estimated_value` (NUMERIC(10,2)),
    `stage_updated_at` (TIMESTAMPTZ default NOW()) + indice
    `idx_clients_stage`. **Ainda nao aplicado no banco de producao** -
    precisa rodar a migration (`migrate.ts`) quando fizer o deploy.
  - **API nova** em `apps/api/src/routes/client.routes.ts` (sem novo
    registro em `server.ts`, reaproveita prefixo `/api/clients`):
    `GET /api/clients/opportunities` (lista clientes com
    stage/source/estimated_value/stage_updated_at, exclui `perdido`) e
    `PATCH /api/clients/:clientId/stage` (Zod enum dos 7 estagios, atualiza
    `stage` + `stage_updated_at`).
  - `npx tsc --noEmit` (api e dashboard) e `npm run build` (dashboard, 40
    rotas incluindo `/oportunidades`) ok.
  - **Nota importante para o Codex**: o gap analysis de 2026-06-11
    (`MEMORY.md`) listava "CRM de pacientes/leads com status/funil" como
    pendencia do Codex (infra/CRM). A Heloisa decidiu explicitamente que o
    Claude Code faria essa parte agora (opcao "Tudo, incluindo schema
    novo"). As novas colunas `stage`/`source`/`estimated_value`/
    `stage_updated_at` em `clients` e a rota `/api/clients/opportunities` +
    `/api/clients/:clientId/stage` ja existem - se o Codex for trabalhar em
    CRM/funil, usar essa base em vez de criar um esquema paralelo.
- **Bloqueado/aguardando**: aguardando a Heloisa revisar (preview/prints) e
  confirmar antes do commit/push (ela pediu para nao aceitar erros desta
  vez). Nenhuma das mudancas acumuladas (minhas + Codex + redesign do
  dashboard/conversas/agenda/automacoes/treinamento/disponibilidade + V4 +
  oportunidades) foi commitada/enviada ainda.

## Codex

- **Ultima atividade**: 2026-06-16 - corrigidos pontos reclamados pela
  Heloisa apos revisao do Claude: TopBar sem titulo duplicado e sem engrenagem
  repetida; Sidebar limpa com labels corretas, sem badge fake e com
  Integracoes no menu; `/integracoes` refeita em cards quadrados com logos
  reconheciveis, WhatsApp/Google Calendar reais e demais itens como "Em
  breve"; `/conversas` e `/clientes` deixaram de exibir dados ficticios de
  fallback e agora mostram somente dados reais/empty states. `npx.cmd tsc
  --noEmit` passou em dashboard e api; `npm.cmd run build` passou no
  dashboard (40 rotas). Browser interno nao abriu por erro de permissao do
  Windows, entao nao houve validacao visual por screenshot nesta sessao.
- **Em andamento**: nada no momento.
- **Bloqueado/aguardando**: aguardando revisao visual da Heloisa/Claude e
  decisao sobre continuar refinando Agenda/Assistente/Automacoes alem do shell
  ja ajustado.
- **Ultima atividade**: 2026-06-15 - portou o V4 oficial para as rotas reais
  principais do dashboard, alem do shell: `/dashboard`, `/conversas`,
  `/agenda`, `/clientes`, `/treinamento` (Assistente), `/followup`
  (Automacoes), `/disponibilidade`, `/configuracoes`, `/oportunidades` e
  `/relatorios`. As telas agora usam a composicao visual do mockup
  `frame-system-lovable-light-v4-claude.html` (cards, grids, inbox,
  calendario semanal, pipeline, subabas de assistente, tabela de pacientes,
  automacoes, disponibilidade e configuracoes). Validado com
  `npx.cmd tsc --noEmit` em api/dashboard e `npm.cmd run build` no dashboard
  (41 rotas).
- **Ultima atividade**: 2026-06-15 - alinhou o shell do dashboard ao V4
  oficial enviado pela Heloisa: sidebar desktop compacta/expansivel (72px ->
  210px), menu com as abas do mockup (Visao geral, Caixa de entrada,
  Oportunidades, Agenda, Pacientes, Assistente, Automacoes, Relatorios,
  Disponibilidade, Configuracoes), TopBar ajustada para o novo offset, rota
  `/relatorios` criada e `/design-system` removida do app. Corrigido endpoint
  de `/oportunidades` para usar `/api/clients/...`. Validado com
  `npx.cmd tsc --noEmit` (api/dashboard) e `npm.cmd run build`
  (dashboard, 41 rotas).
- **Ultima atividade**: 2026-06-15 - atualizou contexto do projeto: confirmou
  que o commit `74a0a5d` (port V4 + pagina `/oportunidades` + schema novo)
  ja esta em `main` e `origin/main`; restam alteracoes locais nao commitadas
  em `apps/dashboard/src/app/(dashboard)/oportunidades/page.tsx` e arquivos
  HTML/mockups soltos.
- **Ultima atividade**: 2026-06-13 - avaliou o arquivo
  `frame-system-lovable-light-v2.html` enviado pela Heloisa como referencia
  visual light-first: proposta forte para direcao premium, mas ainda em HTML
  estatico com CSS duplicado e encoding quebrado; recomendado usar como fonte
  visual, nao como codigo direto de producao.
- **Ultima atividade**: 2026-06-13 - criou
  `frame-system-visual-direction-2026-06-13.html`, arquivo HTML de referencia
  visual com paleta `#013F32/#E7FE25/#FDFDFD/#161616`, tema claro priorizado,
  dark mode consistente e telas de Painel, Conversas, Agenda, Assistente,
  Automacoes e Configuracoes.
- **Ultima atividade**: 2026-06-13 - criou
  `frame-system-lovable-light-v3-refinado.html` a partir do HTML Lovable
  Light V2 enviado pela Heloisa, mantendo a estrutura original e aplicando
  camada visual refinada com a paleta Frame original, fonte simples e pesos
  menores.
- **Ultima atividade**: 2026-06-13 - refinou o V3 apos prints da Heloisa:
  adicionou camada V3.1 com icones SVG lineares, cores secundarias menos
  apagadas, graficos mais robustos, pesos de fonte mais suaves e correcao de
  mojibake no arquivo.
- **Ultima atividade**: 2026-06-12 - alinhou a base visual do dashboard
  para a direcao light-first premium (Inter como fonte principal, default
  do tema em light e tokens/paleta atualizados), validou com `npm run build`
  em `apps/dashboard` e capturou o preview do redesign com sucesso.
- **Em andamento**: nada no momento.
- **Bloqueado/aguardando**: nada no momento.

---

## Como atualizar

Substitua os campos da sua secao. Seja breve (1-3 linhas por campo). Se
terminar uma tarefa, mova um resumo para `LOG.md` com a data e limpe o
"Em andamento" daqui.
