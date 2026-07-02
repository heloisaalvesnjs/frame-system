# Status atual - Frame System

> O que esta em andamento AGORA. Cada agente (Claude Code ou Codex) deve:
> 1. Ler este arquivo antes de comecar qualquer tarefa.
> 2. Atualizar a secao do seu proprio agente quando comecar/terminar algo.
> 3. Mover itens concluidos para o [LOG.md](LOG.md) com a data.

---

## Claude Code

- **2026-07-02 — Bug corrigido: Orquestrador re-enviava a mensagem de escalação
  ("vou chamar o David") repetidamente na mesma conversa.** Heloísa reportou o
  sintoma direto (visto nos executions do n8n): cliente já sendo atendido por
  humano manda outra mensagem continuando a conversa → IA não reconhece o
  contexto → manda de novo a msg automática de transferência → cliente responde
  algo genérico ("ok, tá bom") → IA manda a mesma msg de novo. Causa raiz: o
  sistema já tem a proteção certa para isso — `conversations.status =
  'human_takeover'`, checado em `webhook.routes.ts` ANTES de encaminhar
  qualquer mensagem pro n8n (só salva, não processa) — mas o workflow
  `FRAME - Orquestrador` (`I6DwIWxE6qYNasZj`), ao classificar rota `HUMANO`,
  nunca marcava a conversa nesse status; só mandava o WhatsApp de escalação e
  logava. Por isso toda mensagem seguinte do lead ainda batia como `active`,
  voltava a ser encaminhada e reclassificada do zero.
  **Fix implementado**: (1) novo endpoint interno
  `PATCH /api/internal/n8n/conversations/:phone/takeover?nutritionist_id=`
  (`internal.routes.ts`) que marca a conversa mais recente do telefone como
  `human_takeover`; (2) novo node `Marcar conversa como humano` no workflow do
  Orquestrador, conectado a partir de `Preparar mensagem de escalacao`,
  chamando esse endpoint — editado via MCP e **publicado**
  (`publish_workflow`, `activeVersionId` confirmado); (3) como não existia
  nenhum jeito de voltar de `human_takeover` pra automático (só existia
  `POST /:id/takeover` pra assumir, nunca o inverso), criado
  `POST /api/conversations/:id/resume` (`conversation.routes.ts`) + botão
  "Devolver para IA" em `/conversas` (substitui o botão "Assumir" quando
  `status === 'human_takeover'`). `npx tsc --noEmit` ok em api e dashboard.
  **Efeito colateral esperado, correto por design**: qualquer classificação
  que caia no fallback do switch `Rotear para agente` (`fallbackOutput:
  "extra"`, inclui a instabilidade já documentada de saída vazia `{}` do
  classificador) agora também vai silenciar a IA pra aquele lead até alguém
  clicar "Devolver para IA" no dashboard — antes só repetia a msg de
  escalação sem sinalizar nada pro David. Considerado uma melhoria (David
  passa a ver o badge "Precisa de você"), mas vale observar se a instabilidade
  do classificador aumentar a frequência de silenciamentos indevidos.
  **Sem commit/push ainda** (mudanças de backend/frontend só no working tree
  local; o workflow n8n já está publicado em produção via MCP, que é
  independente do deploy do Frame API/dashboard).

- **2026-07-02 — Novo subagente `social-creator` criado**, a pedido da Heloísa: transforma
  links de conteúdo (posts/reels/artigos de outros criadores) em carrossel pronto (HTML,
  já na identidade Frame System) ou ideia de reels (conceito + como gravar). Ela mandou
  12 links de referência de estilo, analisados via browser (Chrome já logado no Instagram
  — `WebFetch` não renderiza posts do Instagram, precisa de sessão). Achados principais:
  (1) `marketing/instagram-carousel-01.html` já existia e já é, literalmente, o template
  de carrossel no estilo "editorial premium" (fundo escuro Carbon, glow verde Frame Green,
  Bricolage/DM Mono/Lora) que ela apontou como referência (clickmax.io/euhvdesigner/
  lukauomi) — virou o "Modo A" (padrão) do agente novo, reaproveitando os componentes
  (`.pill/.card/.chip/.metric/.msg`) em vez de recriar do zero; (2) segunda referência
  (felipetambara.ia — fundo creme, selo numerado, mascote) virou "Modo B" (didático/
  listicle), mas **adaptado pra paleta Frame** (não importa cores do original — só a
  estrutura); (3) referências de reels (victor.peixoto/gabrielmolinari/babruna/
  felipetambara.ia/clickmax.io) convergem pro mesmo padrão: talking head + legenda fixa
  no terço inferior + inserção opcional de tela gravada — documentado como spec de reels
  do agente (concept + shot list, sem produção completa). Agente registrado em
  `.claude/agents/social-creator.md`, tabela de agentes do `CLAUDE.md` atualizada
  (11 → 12). Convenção de saída: carrossel novo vira `marketing/instagram-carousel-0N.html`
  (reaproveitando o `<style>` do 01), reels novo vira entrada em `marketing/reels-ideias.md`
  (arquivo ainda não existe, agente cria quando a primeira ideia for gerada).

- **2026-07-02 — Análise (via orchestrator) da proposta de reestruturação total do sistema
  pedida pela Heloísa: dashboard fora, config 100% no prompt do n8n, Google Calendar pra
  disponibilidade, cobrança PIX com confirmação por emoji do David, Chatwoot pras
  conversas, migração pra Supabase, front reconstruído no Lovable/Vercel.**
  Recomendação entregue: **não reestruturar, adicionar** — a maior parte da proposta já é
  realidade pro David (ele já roda 100% no n8n, dashboard antigo é quase decorativo pra
  ele). Pontos de risco identificados: Google Calendar como fonte de disponibilidade
  quebra a Regra Inegociável #1 (IA nunca inventa horário — o node de Calendar entrega
  free/busy bruto, a IA teria que calcular os slots livres, risco documentado de erro);
  confirmação de pagamento por reação de emoji é frágil e provavelmente nem chega no
  webhook (uazapi só processa `EventType === "messages"`, e o código descarta `fromMe`,
  que é como a própria reação do David chegaria) — melhor resolvida por webhook de
  gateway de pagamento (ver abaixo); Supabase agora reabre a Regra Inegociável #5 (não
  migrar antes do 1º cliente pagante — **Pipeline comercial está zerado, MRR R$0**,
  precisa confirmar com a Heloísa se o David já conta como pagante); existe pelo menos
  outra conta real (assistente "Michele") ainda no fluxo antigo do dashboard — abandonar
  o dashboard sem migrar essas contas primeiro quebraria o atendimento delas.
  Plano de sequenciamento proposto (aditivo, sem tocar no que já funciona): Fase 0
  (confirmar se David paga, quantas contas dependem do dashboard antigo, escolher
  gateway) → Fase 1 (lembrete de véspera novo, fluxo de cobrança PIX em workflow
  separado, sync de saída pro Google Calendar só como "vitrine" pro David, não como
  fonte) → Fase 2 (Chatwoot, limpeza — não reescrita — do dashboard). Supabase e
  reescrita do front ficam pra depois, isolados.
  **Gateway escolhido pela Heloísa: Asaas** (perguntou especificamente sobre ele).
  Desenho de integração já detalhado: criar cliente (`POST /v3/customers`) → criar
  cobrança PIX (`POST /v3/payments`, `externalReference` = `appointment_id`, pra
  reconciliar depois) → IA manda `invoiceUrl` (ou PIX copia-e-cola via
  `GET /v3/payments/{id}/pixQrCode`) por WhatsApp → webhook do Asaas
  (`PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`) dispara workflow novo no n8n que confirma o
  agendamento automaticamente — sem depender do David reagir a nada. Nota de segurança:
  o valor do sinal (10%) deve ser calculado em node de código determinístico, não pela
  IA (mesmo princípio da Regra #1, aplicado a dinheiro).
  **Pendente/bloqueado**: Heloísa está aguardando confirmação do David sobre o gateway
  (Asaas) antes de seguir com a implementação. Próximo passo, quando ele confirmar: pedir
  API key do Asaas (ambiente sandbox primeiro) e construir o workflow de cobrança
  isolado, testável sem mexer no atendimento/agendamento já em produção.

- **2026-07-02 — Texto dos planos presencial/online do David atualizado no workflow n8n
  `FRAME - Agente Atendimento` (`nrzMUgIFzjQ3Zf8F`), publicado em produção.** A Heloísa
  descobriu, ao tentar editar em `/servicos` (dashboard antigo, `ai.service.ts`), que o
  David na verdade roda na arquitetura nova (n8n, persona "Daniela") — mexer no dashboard
  não tinha efeito nenhum na conversa real dele. O texto certo dos planos (presencial:
  Mensal/Trimestral/Semestral; online: Trimestral/Semestral/Anual, com narrativa completa
  em vez dos bullets curtos que estavam antes) foi cravado no `systemMessage` do node
  "AI Agent Atendimento", com instrução explícita para a IA enviar o bloco EXATAMENTE
  como escrito (verbatim, sem parafrasear) ao apresentar os planos — a pedido explícito
  da Heloísa. Documentação espelho em
  `obsidian/03 - Técnico/n8n/prompts/prompt-atendimento.md` também atualizada.
  **Nota técnica importante para futuras edições via MCP n8n**: `update_workflow` com
  operação `setNodeParameter` e `path: "/parameters/options/systemMessage"` **não
  substitui** o valor existente — cria uma chave aninhada nova
  (`node.parameters.parameters.options.systemMessage`), deixando o texto novo órfão sem
  efeito e o node continua rodando o texto antigo. O que funcionou: `updateNodeParameters`
  com `replace: true` e o objeto `parameters` completo do node (agent/promptType/text/
  options.systemMessage). **Também**: editar via MCP salva como rascunho — é preciso
  chamar `publish_workflow` depois pra `activeVersionId` bater com a versão editada e a
  mudança valer de fato em produção (sem publicar, o node continua servindo a versão
  antiga mesmo com o rascunho "salvo").
  **Pendente**: mensagem de pós-compra (David quer mandar algo depois que o cliente
  fecha/paga) fica pra depois — Heloísa ainda está decidindo o gateway de pagamento, e
  hoje o follow-up automático está desativado (decisão registrada no onboarding do David,
  `obsidian/04 - Comercial/David - Setup Frame System.md`, seção 9: "não ativar agora
  focar no atendimento"). Quando ela decidir o gateway, retomar esse desenho (gatilho +
  conteúdo da mensagem, ainda não definidos).

- **2026-07-02 (final da sessão anterior) — Rede n8n↔API e memória de conversa nos 3 workflows,
  confirmado com teste real de agendamento completo.**
  (1) **Fix de rede**: 502 intermitentes em TODAS as chamadas n8n→API eram causados por
      hairpin no proxy do EasyPanel (n8n chamando a API pelo domínio público, mesmo host).
      Adicionado `API_INTERNAL_URL` (`http://nutriapp_api:3001`, hostname interno do Docker,
      já configurado pela Heloísa no EasyPanel) usado só no payload `internal_api_url`
      mandado ao n8n (fix em webhook.routes.ts). Resolveu 100% — confirmado: erros
      passaram de "Service is not reachable" (gateway) pra erros reais da nossa API.
  (2) **Memória real nos 3 workflows**: Orquestrador, Atendimento e Agendamento agora
      injetam `recent_messages` (histórico real vindo do banco, via `/api/internal/n8n/context`)
      direto no prompt de cada IA — antes, cada sub-agente só via a própria memória técnica
      interna do LangChain (que no caso do Agendamento salvava JSON técnico, não texto
      natural, então "esquecia" o que já tinha mostrado ao lead). Isso corrige o bug
      reportado pela Heloísa: IA perguntando "presencial ou online?" de novo depois de já
      ter respondido, e reenviando a mesma lista de datas em vez de agendar.
  (3) **Regra nova**: quando só existe 1 data/horário disponível e o lead responde de forma
      afirmativa genérica ("pode marcar", "sim", etc.), a IA agora entende como escolha
      automática e avança pro próximo passo, em vez de travar.
  (4) **Fix do classificador do Orquestrador**: adicionado system message explícito
      instruindo a IA a classificar direto (chamar a tool) em vez de raciocinar em texto
      livre — a falta de instrução deixava o modelo ocasionalmente responder `{}` (saída
      vazia), caindo no fallback "escalar pra humano" por engano.
  (5) **Bug do ano corrigido**: a IA de Agendamento não sabia o ano atual (a lista de datas
      mostra só "03 de julho", sem ano) e às vezes montava `data: "2025-07-03"` em vez de
      2026, fazendo a busca de horários falhar silenciosamente. Prompt agora inclui a data
      de hoje explicitamente (`$now.format('yyyy-MM-dd')`).
  **Validado com teste real de 2 mensagens**: "Quando tem vaga para a Serra?" → mostrou 1
  data de julho → "Pode marcar por favor" → reconheceu a data, buscou horários reais
  (18 disponíveis) com o ano certo, sem repetir nenhuma pergunta já respondida.
  Lições técnicas de sintaxe n8n (relevante pra futuras edições de prompt via MCP):
  quando um `options.systemMessage`/`text` precisa ser uma expressão real (prefixo `=`)
  em vez de texto estático, (a) chaves duplas literais `{{`/`}}` no meio do texto colidem
  com o parser de expressões do próprio n8n — construir via `String.fromCharCode(123,123)`
  em vez de escrever `{{` direto; (b) quebras de linha dentro de uma string JS de aspas
  simples precisam ser o escape `\n` (2 caracteres), não uma quebra de linha real — ao
  editar via ferramenta que usa JSON, isso significa usar `\\n` na chamada, não `\n`.

- **Última atividade (anterior)**: 2026-07-01 — Migração Evolution API → uazapi commitada, enviada e vinculada
  de ponta a ponta:
  (1) commit `17041db` push para `origin/main`, deploy disparado. EasyPanel já configurado pela
      Heloísa (env vars uazapi ok, deploy ok).
  (2) Registro do David vinculado no banco (`instance_token=3041108b-c9a6-42fa-b9cc-6b390fd0e587`,
      `instance_id=r71f138f3a679b9`) — confirmado contra a API da uazapi (status "connected",
      profileName "Agendamento David Effgen", owner 5527997197602).
  (3) Webhook da instância já estava configurado corretamente na uazapi
      (`url: https://api.framesystem.com.br/webhook/whatsapp`, `events: ["messages"]`) — confirmado
      via `GET /webhook` na uazapi.
  (4) **Fix crítico nos workflows n8n**: os 3 workflows ativos (`FRAME - Orquestrador`
      `I6DwIWxE6qYNasZj`, `FRAME - Agente Atendimento` `nrzMUgIFzjQ3Zf8F`, `FRAME - Agente
      Agendamento` `4jTfG8Ez6mXsRMNl`) ainda enviavam `instance_name` (campo antigo da Evolution)
      no body de `POST /api/internal/whatsapp/send`, que não é mais aceito pelo endpoint (só aceita
      `instance_token` ou `nutritionist_id`) — toda mensagem de resposta da IA estava falhando
      silenciosamente (400) desde o deploy da migração. Corrigido via MCP n8n em 6 nós: trocado
      `instance_name` por `nutritionist_id` em `Preparar mensagem de escalacao` (Orquestrador),
      `Enviar resposta WhatsApp` (Atendimento), e `Enviar WhatsApp datas/slots/confirmacao/texto`
      (Agendamento, 4 nós). `nutritionist_id` já circulava correto em toda a cadeia desde o webhook
      original — não precisou tocar em mais nada.
- **2026-07-02 — WhatsApp do David 100% funcional de ponta a ponta, confirmado com mensagem real.**
  Sessão de debug ao vivo (ver LOG.md para o passo a passo completo). Achados principais:
  (1) **Formato real do payload da uazapi é diferente da documentação oficial** — a doc descrevia
      `{event, instance, data:{...}}`, mas o payload real é `{EventType, instanceName, token,
      message:{...}}`. O `instance_token` vem *direto* no campo `token` do payload — não existe
      `instance_id` nesse formato. `parseUazapiPayload` (webhook.routes.ts) e o roteamento
      multi-tenant foram corrigidos pra usar `instance_token` (commit `edf8b63`). Descoberto
      adicionando um log de debug temporário (removido depois, ver commits
      `d5c1429`→`edf8b63`→limpeza), coordenado com outra sessão Claude Code que já tinha
      identificado o mesmo sintoma e adicionado um log parcial (`70a3fa0`).
  (2) `whatsapp_connections.status` só se autocorrige (`disconnected`→`connected`) quando
      `GET /api/whatsapp/status` roda — ou seja, quando alguém abre a página de Integrações
      logado. Sem isso, `POST /api/internal/whatsapp/send` recusa com 400 mesmo com tudo
      conectado de verdade na uazapi.
  (3) `assistants.ai_paused` bloqueia silenciosamente TUDO (nem log gera) — vale checar esse
      toggle primeiro sempre que a IA "não responder nada".
  (4) Outra sessão paralela adicionou `assistants.ai_24h` (commit `668d13a`) — desacopla o
      horário de resposta da IA do horário de `Disponibilidade`/agenda. Preferir esse toggle a
      mexer em `availability` pra testes futuros de "IA fora do horário".
  (5) Deploy automático do EasyPanel por push nem sempre pega on-the-fly de forma confiável —
      em um dos pushes desta sessão o deploy precisou ser disparado manualmente no painel antes
      do código novo entrar no ar (`/health` respondia 200 mas ainda rodava o binário antigo).
      Vale sempre confirmar a versão pelo comportamento real, não só pelo `/health`.
- **2026-07-02 — Fluxo de Agendamento (n8n) corrigido: 3 bugs reais, não relacionados à
  migração uazapi (pré-existentes desde a construção do workflow).** Descobertos ao testar um
  agendamento real ("Quando tem vaga para a Serra?"), que travava no node `AI Agent Agendamento`
  do workflow `FRAME - Agente Agendamento` (`4jTfG8Ez6mXsRMNl`):
  (1) **Crash de prompt**: o `systemMessage` tinha exemplos de JSON com chaves simples
      (`{"acao": "fetch_dates", ...}`) — o LangChain usa `{chave}` como sintaxe de variável de
      template, então tentava resolver o exemplo inteiro como nome de variável e quebrava com
      `INVALID_PROMPT_INPUT`. Corrigido escapando pra chaves duplas (`{{"acao": ...}}`).
  (2) **Modo de agente incompatível com saída estruturada**: o node estava com
      `agent: "conversationalAgent"` (formato ReAct, envelope `{action, action_input}`) mas
      também tinha `hasOutputParser: true` com schema estruturado direto — os dois formatos
      conflitam. A doc oficial do node (`get_node_types`) confirma: `options.systemMessage` só é
      suportado quando `agent: "toolsAgent"` (o valor padrão/recomendado). Corrigido trocando
      pra `toolsAgent`.
  (3) **Corpo de requisição corrompido**: os 4 nós `Enviar WhatsApp datas/slots/confirmacao/texto`
      usavam `specifyBody: "string"` com um `body` contendo `JSON.stringify(...)` — isso faz o
      n8n mandar o JSON inteiro como se fosse uma *chave* de um objeto vazio
      (`{"<json completo>": ""}`), corrompendo a chamada pro backend. O node equivalente que
      funciona no Atendimento usa `specifyBody: "json"` + campo `jsonBody` — alinhado os 4 nós
      do Agendamento com esse padrão.
  Confirmado com teste real: IA classificou corretamente (`fetch_dates`/`fetch_slots`/etc.),
  buscou datas reais de `/api/internal/n8n/available-dates` e montou a mensagem certa.
  **Nota separada, não corrigida (baixa prioridade)**: em uma execução, a IA classificadora do
  `AI Agent Orquestrador` retornou saída vazia (`{}`) em vez de rotear — parece instabilidade
  ocasional do modelo (respondeu em texto livre em vez de chamar a tool de formatação), não um
  bug de configuração. Escalou pra "chamar o David" em vez de rotear certo. Se acontecer com
  frequência, investigar `max_tokens` (está em 256, pode estar cortando o raciocínio antes da
  tool call) ou adicionar `temperature: 0`.
- **2026-07-02 — Datas de agendamento limitadas a um mês por vez (era um bug de produto, não
  técnico).** A Heloísa reportou que a IA despejava datas de 3-4 meses de uma vez só (30 datas
  corridas pra frente) — ruim de ler e nada natural. Solução implementada (não só um filtro raso):
  - `GET /api/internal/n8n/available-dates` (`internal.routes.ts`) ganhou parâmetro opcional
    `month` (formato `YYYY-MM`). Sem ele, retorna só o mês atual (nunca datas passadas, mesmo
    se `month` for o mês corrente). Presencial: janela SQL trocada de "hoje +60 dias" pra
    "início do mês alvo (ou hoje, o que for maior) até o fim desse mês". Online: mesma lógica,
    trocando o loop de "30 próximas datas úteis" por "dias ativos dentro do mês alvo".
  - Workflow `FRAME - Agente Agendamento`: `Output Parser Agendamento` ganhou campo opcional
    `mes` (YYYY-MM); `AI Agent Agendamento` foi instruído a preencher esse campo quando o lead
    pedir um mês específico (ex.: "tem em agosto?"); `Buscar datas disponiveis` passa esse valor
    como query param `month`; `Formatar datas` agora convida o lead a pedir outro mês
    ("Se quiser ver outro mês, é só me falar! 😊") em vez de despejar tudo.
  Testado em conversa real de 2 mensagens: 1ª mensagem trouxe só julho (25 datas); 2ª mensagem
  ("Não tenho nada em julho, tem para agosto?") a IA entendeu o pedido e trouxe exatamente
  agosto (26 datas) — confirmado via `message/find` na uazapi.
- **Pendente**:
  (1) Reverter manualmente o horário de quarta-feira (`day_of_week=3`) em `availability` do
      David — foi ampliado para `00:00–23:59` durante os testes desta sessão (antes de
      descobrirmos o `ai_24h`) e o valor original não foi salvo. A Heloísa tem acesso ao
      dashboard agora — ajustar em `/disponibilidade` para o horário real de atendimento dele.
  (2) Cosmético, não bloqueia: `whatsapp_connections.phone_number` nunca é preenchido em nenhum
      fluxo (`/connect` nem `/status`) — afeta só a exibição em Integrações (fallback "Instância
      conectada"). Corrigir se quiser exibir o número real ali.
  (3) Cosmético: tela de Integrações ainda tem resíduo visual/conceitual da Evolution API
      (apontado pela Heloísa) — revisar quando fizer sentido, não é urgente.
  (4) Investigar a instabilidade ocasional do `AI Agent Orquestrador` descrita acima, se voltar
      a acontecer.

- **Última atividade (anterior)**: 2026-06-26 — Consolidação do projeto:
  (1) Vault Obsidian migrado para `obsidian/` dentro deste projeto.
  (2) 7 novos agentes adicionados a `.claude/agents/`. Total agora: 14 agentes.
  (3) CLAUDE.md atualizado. Sistema funcional (Fastify + Next.js em produção no Vercel).

- **Ultima atividade**: 2026-06-18 - sistema funcional completo. Backend atualizado:
  regras de agendamento (buffer_between_minutes/min_advance_hours/max_appointments_per_day) em
  nutritionists + PUT /api/nutritionists/scheduling-rules; card Regras em /disponibilidade agora
  editavel; botao Sincronizar Google funcional (chama auth-url do Google Calendar); botoes
  Servicos em /treinamento navegam para /servicos via useRouter; POST /conversations/:id/messages
  (envia WhatsApp); NovoPacienteModal em /clientes; location_id por dia da semana (schema + rotas
  + UI). tsc + npm run build (40 rotas) ok. Commitado e pushed para origin/main (deploy Vercel).
- **Pendente**: rodar migrations no banco de producao (schema.sql com ALTER TABLEs acumulados desde 2026-06-13).

## Claude Code (anterior) - 2026-06-18 - port Lovable pixel-perfect concluido para todas as paginas principais:
  `conversas`, `clientes`, `followup`, `integracoes`, `agenda`, `treinamento`, `disponibilidade`.
  Todas usam agora finance-primitives (Card/Badge/Btn/KPI/SectionTitle/Avatar) sem V4Primitives.
  `finance-primitives.tsx` ganhou variant `danger` em Btn e prop `dot` em Badge.
  `npx tsc --noEmit` e `npm run build` (40 rotas) ok. Aguardando confirmacao da Heloisa para commit/push.
- **Bloqueado/aguardando**: aguardando confirmacao antes do push/deploy.

## Claude Code (anterior - 2026-06-16): implementacao das fases 0-4 do plano premium
  (IMPLEMENTATION_PLAN_PREMIUM.md criado). Fase 3: Configuracoes reconstruida com
  13 secoes reais (Minha conta, Perfil profissional, Consultorio e marca, Servicos
  e precos, WhatsApp, Assistente e atendimento, Integracoes, Equipe e permissoes,
  Notificacoes, Seguranca, Privacidade e dados, Plano e cobranca, Preferencias) -
  subnav lateral funcional, formularios reais com save/validacao/toast, dados de
  API reais em 10 das 13 secoes. Fase 4: Disponibilidade ganhou `CalendarBlocksSection`
  - bloqueios de horario parcial ou multi-dia via `calendar_blocks` (starts_at/ends_at),
  form com tipo "dia inteiro" ou "por horario", lista de bloqueios com delete. O
  calendario mensal de dias bloqueados (blocked_dates) ja existia e foi mantido.
  `npx tsc --noEmit` e `npm run build` (40 rotas) ok.
- **Bloqueado/aguardando**: aguardando push/deploy (nao foi pedido explicitamente
  nesta sessao). Fases 5-8 (operacao, qualidade, testes) a implementar nas proximas
  sessoes conforme spec IMPLEMENTATION_PLAN_PREMIUM.md.

## Claude Code (anterior)

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

- **Ultima atividade**: 2026-06-17 - corrigiu a referencia visual para a versao mais limpa, alinhada ao zip do Lovable: criou `exports/frame-ascend-lovable-clean.html`, mantendo apenas agenda e disponibilidade por local, sem excesso de brilho, hero ou cards decorativos.
- **Em andamento**: nada no momento.
- **Bloqueado/aguardando**: aguardando a Heloisa revisar a visualizacao e dizer se quer que eu porte esse layout para o sistema real.
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
- **Ultima atividade**: 2026-06-16 - criou um novo arquivo Figma de brand
  kit (`XhhcjYjkMA87071O2Y8yKk`) para a logo/paleta da Frame System, mas a
  populacao da board foi bloqueada pelo limite de chamadas do Figma MCP no
  plano Starter antes de concluir a composicao.
- **Em andamento**: aguardando a liberacao/upgrade do limite do Figma MCP
  para concluir a board com logo, favicon e paleta.
- **Bloqueado/aguardando**: limite do Figma MCP no plano Starter.

---

## Como atualizar

Substitua os campos da sua secao. Seja breve (1-3 linhas por campo). Se
terminar uma tarefa, mova um resumo para `LOG.md` com a data e limpe o
"Em andamento" daqui.
