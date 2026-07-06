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

(2026-07-05 noite) Rodada de correcoes pos-teste real de WhatsApp da Heloisa (fluxo de venda completo funcionou ate o fechamento):
- **BUG CRITICO corrigido+deployado**: POST /api/internal/n8n/appointments rejeitava `client_name:null`/`service_id:null` (n8n envia null explicito; z.string().optional() rejeita null) -> 400 "Dados invalidos" no MOMENTO do fechamento da venda (execucao n8n 411). Trocado pra .nullish(). Era o "fluxo deu erro na hora de criar o agendamento".
- **Agenda ONLINE propria (nova)**: colunas online_enabled/online_weekdays/online_start/online_end/online_slot_duration/online_break_* em `nutritionists` (aplicadas no Supabase, David default seg-sex 08-18). Endpoints GET+PUT /api/nutritionists/online-availability. available-dates e available-slots (online) usam essa agenda; presencial (date_location_overrides) intocado. Resolve "online nao tem config de data/horario".
- **Disponibilidade redesenhada**: era lista plana (virava bagunca). Agora calendario mensal presencial (clique no dia -> dialog cidade/bloquear/limpar, cores por cidade) + aba Online (chips de dias + horario). Validado com dados reais do David.
- Login: warning setState-in-render corrigido.

**AINDA PENDENTE (pedido da Heloisa, proxima fase — features grandes)**:
1. ~~Consolidar tudo de IA dentro da aba Assistente~~ FEITO (ver abaixo).
2. Aba Pacientes: dieta + troca de alimentos JA TEM UMA V1 BOA (ver abaixo). Falta ainda: controle de ultima consulta/data de retorno mais visivel (hoje so tem campo de texto livre, sem automacao de lembrete).
3. Telas Atendimento (inbox ao vivo)/Agenda (calendario)/Visao geral (metricas reais) ainda placeholder.

(2026-07-06) Redesign completo do painel a pedido da Heloisa (ela reagiu ao teste real de WhatsApp + prints de outro app de troca de alimentos que gostou). Fluxo usado: acionei `/designer` (spec de cores/componentes) -> `/dev-frontend` (implementacao) -> revisei/corrigi eu mesma (build quebrado por useSearchParams sem Suspense, CategoryIcon sem fundo colorido, consolidacao de nav incompleta) antes de commitar. Validado com login real + dados reais do David (TACO, agenda, calendario).

- **Troca de alimentos (FoodSwapSheet)**: substituiu o FoodPicker simples. Sheet lateral com busca na tabela TACO real, categorias coloridas (carboidratos/proteinas/gorduras/frutas/vegetais/laticinios — paleta derivada do verde/lima Frame, sem roxo/lilas), conversao proporcional de gramas em tempo real (`(qty/100) * (kcal_base/kcal_troca) * 100`), ordenacao padrao/a-z/menor g/maior g. Categorizacao e por heuristica de palavra-chave (`apps/painel/src/lib/food-category.ts`) — decorativo, nao precisa ser perfeito.
- **SectionGroup + PageHeader** (`apps/painel/src/components/section-group.tsx`): padrao de secao (icone+titulo fora do card) aplicado em Assistente/Disponibilidade/Integracoes/Pacientes-detalhe/Configuracoes — tira a cara de "formulario".
- **LocationBadge + paleta curada de 10 cores** (`location-badge.tsx`/`location-palette.ts`): calendario mostra pill com opacidade baixa + ponto solido em vez de texto colorido cru. A cor salva no banco (livre, dado antigo) ainda e usada como está — a paleta curada e so uma sugestao pro formulario de criar local (formulario de locations ainda nao existe no painel novo).
- **Consolidacao de navegacao**: sidebar principal ficou so Visao geral/Atendimento/Agenda/Pacientes/Assistente/Configuracoes. Disponibilidade e Integracoes viram sub-abas de Assistente (`/assistente?tab=disponibilidade` etc), junto com Identidade e 2 placeholders novos (Conhecimento, Servicos e Precos — ainda nao implementados, so "em breve").
- **Disponibilidade sem grade semanal fixa**: o dialog do dia no calendario agora define local E horario (inicio/fim/duracao) juntos. Backend: `date_location_overrides` ganhou `start_time`/`end_time`/`slot_duration` (nullable, fallback 08:00-18:00/30min). `available-slots` e criacao de agendamento (presencial) leem o horario do dia especifico, nao mais a tabela `availability` semanal (que continua existindo no banco, so nao e mais usada pelo frontend novo).

## Codex
[Status aguardando atualiza��o]
