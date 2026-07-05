# Log de atividades â€” Frame System

> HistÃ³rico cronolÃ³gico do que cada agente fez. Entradas mais recentes no
> topo. Cada entrada deve ter: data, agente, resumo curto do que foi feito
> e (se houver) link para commit/PR.

---

## 2026-07-05 - Claude Code (auditoria E2E do atendimento + correções + banco Supabase provisionado)

Auditoria completa do fluxo (n8n + webhook backend) entregue em chat, seguida de
execução das correções aprovadas pela Heloísa:

- **n8n (publicado)**: `onError: continueRegularOutput` em todos os nodes "Enviar
  WhatsApp *" dos loops de blocos (Atendimento + Agendamento + PIX) — falha de envio
  não derruba mais o workflow no meio da resposta. Texto do "Formatar datas" corrigido
  (removida "lista de espera", feature inexistente; 1 CTA só). Prompt do Atendimento
  ganhou "ATALHO DE PREÇO" (lead que pede valor direto recebe preço em até 2 mensagens)
  e regra de OPT-OUT explícita. Escaping verificado (join('\n') literal preservado).
- **Backend (commitado, aguarda deploy)**: fallback para imagem/vídeo/documento/sticker
  sem texto no webhook (antes: silêncio total); opt-out persistido (coluna
  `clients.opted_out` + detecção conservadora no webhook + reengajamento automático +
  filtros nos crons de follow-up/retorno). Código resiliente a coluna ausente
  (try/catch) até a migration rodar no banco ativo. `tsc --noEmit` ok.
- **Supabase provisionado**: schema.sql completo (32 tabelas, paridade total incluindo
  colunas uazapi) + david-seed.sql executados no projeto Supabase. IMPORTANTE: o host
  correto do pooler é `aws-1-sa-east-1.pooler.supabase.com` (o `aws-0` documentado no
  MIGRATION_SUPABASE.md retorna "tenant not found"). Seed corrigido: INSERT de
  whatsapp_connections agora inclui `instance_token` (sem ele o roteamento do webhook
  quebra). Verificado: Daniela, 6 services com preço (destrava PIX), 7 locations,
  opted_out. Banco de produção AINDA NÃO trocado — falta Heloísa trocar DATABASE_URL
  no EasyPanel + dump da agenda/disponibilidade do banco atual (sem acesso externo).
- Descoberto na auditoria: `supabase-setup.sql` está desatualizado (pré-uazapi) — usar
  `schema.sql` como fonte de verdade em migrações futuras.

## 2026-07-04 - Claude Code (auditoria completa dos 4 workflows n8n + bug crítico de envio corrigido)

A pedido da Heloísa ("faça uma auditoria completa em todos workflows, teste cada um,
corrija todos os erros"), investiguei ~80 execuções com erro dos 4 workflows ativos
(Orquestrador, Atendimento, Agendamento, Eventos) via MCP n8n (`search_executions` +
`get_execution` com `includeData`), lendo os dados reais de cada falha em vez de só a
estrutura dos workflows. Achado o bug mais grave em produção desde a migração uazapi:
`POST /api/internal/whatsapp/send` recusava com 400 mesmo com a instância do David
realmente conectada (confirmado direto na uazapi via `GET /instance/status`), porque a
query em `whatsapp.service.ts`/`internal.routes.ts` exigia `whatsapp_connections.status
= 'connected'` — coluna que só se autocorrige quando alguém abre a tela de Integrações.
Efeito real observado nos logs: a IA respondia perfeitamente (texto correto, nas
executions 314/319/322) mas a mensagem nunca saía pro WhatsApp. Corrigido removendo essa
dependência nas duas queries (commit `642a80c`). Aproveitei pra corrigir também S1 (fallback
inseguro de roteamento por "instância mais recente conectada" quando falta `instance_token`
no payload — risco cross-tenant) e S2 (parou de mandar `claude_api_key`/`ANTHROPIC_API_KEY`
em claro pro n8n, campo confirmado não usado por nenhum workflow) da auditoria E2E de
2026-07-03. `npx tsc --noEmit` ok. Commitado e enviado pra `origin/main`.
**Redis NOAUTH** intermitente no Orquestrador (rajada de 6 falhas em 25s às 22:09 de
2026-07-03, nunca mais depois) — parece reinício momentâneo do serviço, não configuração
quebrada, sem ação tomada. **Rota `/clients/:phone/summary`** (memória longa) que retornava
404 ontem à noite já está 200 OK agora (deploy alcançou o commit `5932be9` entre ontem e
hoje). **Pendente de confirmação**: testei o endpoint `/whatsapp/send` ~3 min após o push
de hoje e ainda respondia com o erro antigo — deploy do EasyPanel pode precisar ser
disparado manualmente (padrão já visto antes neste projeto). Detalhes completos em
STATUS.md (2026-07-04).

## 2026-07-03 (noite, 2ª retomada) - Claude Code (2 dos 3 workflows da auditoria aplicados)

A pedido da Heloísa, acionei o `n8n-specialist` pra criar os 3 workflows faltantes da
auditoria (`FRAME - Eventos`, takeover verbal do Atendimento, Cobrança PIX). Descoberta
importante: esse agente não tem ferramentas MCP do n8n (só arquivos) — ele entregou specs
detalhadas em `n8n-workflows/*.json` numa worktree isolada, sem aplicar nada de verdade.
Apliquei eu mesmo, corrigindo 2 riscos que as specs tinham (mesmo padrão de erro do Passo
C: `$env.INTERNAL_API_KEY` não confirmada + URL pública hardcoded em vez do hostname
interno do Docker):
- **Takeover verbal do Atendimento**: publicado em `nrzMUgIFzjQ3Zf8F` — quando a IA usa a
  frase de transferência ("vou chamar ele"), agora marca `human_takeover` de verdade via
  PATCH `/conversations/:phone/takeover`.
- **Cobrança PIX**: publicado em `4jTfG8Ez6mXsRMNl` — branch paralelo após criar
  agendamento, chama `/n8n/payments/create-charge` (já existia no backend) e manda o PIX
  copia-e-cola por WhatsApp. Adicionei uma proteção extra (IF `tem pix_copy_paste?`) que
  não estava no plano do agente, pra não mandar mensagem quebrada enquanto o Asaas do
  David não estiver configurado.
- **`FRAME - Eventos`** (lembrete 24h): só especificado, não aplicado — depende de import
  manual da Heloísa no n8n + de uma mudança de backend (`webhook-events.service.ts`,
  adiciona `internal_api_url`/`internal_api_key` no payload de eventos + fallback de env
  var `N8N_EVENTS_WEBHOOK_URL`) que fiz no working tree mas não commitei ainda. Detalhes
  completos e checklist de pendências em STATUS.md.

Arquivos de spec do agente trazidos da worktree isolada pra `n8n-workflows/` na pasta
principal (pasta tinha sido apagada numa limpeza anterior).

---

## 2026-07-03 (noite, retomada) - Claude Code (humanização + memória longa: passos C-H concluídos)

Retomada a sessão interrompida por créditos (ver entrada anterior "handoff pra
Codex" logo abaixo — no fim, quem retomou foi o próprio Claude Code, não o
Codex). Como a Heloísa não respondeu se autorizava disparar execuções de teste
contra os 3 workflows em produção, segui o caminho seguro já documentado no
plano: publicar cada passo com revisão estrutural cuidadosa e verificação via
`get_workflow_details` após cada mudança, sem usar `execute_workflow`/
`prepare_test_pin_data`.

**Passo C — Debounce Redis atômico no Orquestrador** (`I6DwIWxE6qYNasZj`,
publicado, `activeVersionId: c2020c66`). Substituídos `Aguardar 10 segundos` +
`Verificar acumulo de mensagens` + `Sou o mais recente?` por: `Redis push`
(node "Guardar mensagem no buffer", lista `frame:{nutri}:{phone}:buffer`) +
`Redis incr` (node "Incrementar contador de rajada", chave
`frame:{nutri}:{phone}:counter`, `expire:true`/`ttl:120`) + IF "É a primeira
mensagem da rajada?" (`Object.values($json)[0] === 1`) + `Aguardar 15 segundos`
+ `Redis get` (keyType `list`, node "Ler mensagens acumuladas") + Code
"Concatenar mensagens" (join `\n\n`, filtra vazios) + `Redis delete` (buffer e
contador). **Achado técnico não previsto no plano original**: confirmado via
leitura do código-fonte do node `n8n-nodes-base.redis` (raw.githubusercontent)
que a operação `push` **descarta o valor de retorno do RPUSH/LPUSH e nunca
expõe o tamanho da lista** — por isso o plano original ("usar a resposta do
push pra saber se é o primeiro") não era implementável; troquei por um
contador Redis separado via `incr`, que É atômico e retorna o valor
incrementado (`{ [chave]: valor }`), confirmando corretamente "sou a 1ª
mensagem" sem a corrida de condição do padrão get+Code+set que a spec original
propunha (bug #8 do plano). Corrigidas na mesma operação as referências
`$('Verificar acumulo de mensagens')...`/`$('Registrar chegada').item.json.
message_text` no `AI Agent Orquestrador` (bugs #5/#6 do plano) — e também, não
previsto explicitamente no plano mas do mesmo bug: os 2 nodes que encaminham
pros sub-workflows (`Chamar Agente Atendimento`/`Chamar Agente Agendamento`) e
o Code `Preparar mensagem de escalacao` também usavam
`$('Registrar chegada').item.json.message_text` (só a 1ª mensagem da rajada,
mesmo com debounce funcionando) — corrigidos pra usar
`$('Concatenar mensagens').item.json.message_text` também.

**Passo D — Separação por parágrafo** (Atendimento `nrzMUgIFzjQ3Zf8F` e
Agendamento `4jTfG8Ez6mXsRMNl`, publicados). Instrução adicionada ao
`systemMessage` de cada AI Agent pedindo blocos de 1-3 frases separados por
`\n\n`, como se a IA estivesse digitando várias mensagens seguidas no
WhatsApp.

**Passo E — Blocos humanizados** (mesmos 2 workflows, publicados). Pattern:
Code "Preparar blocos" (split por `\n\n`, filtra vazios) → `Loop blocos`
(`n8n-nodes-base.splitInBatches`, `batchSize:1`) → node de envio existente
(reaproveitado, só trocando a fonte do texto pro item do loop) → `Aguardar 1
segundo` → volta pro loop; saída "done" do loop segue pro fluxo normal de
salvar mensagem/log (usando sempre o texto completo original via referência
nomeada ao node produtor, não o `$json` do loop). Atendimento: 1 ponto
(`Enviar resposta WhatsApp`). Agendamento: 4 pontos (`Enviar WhatsApp
datas/slots/confirmacao/texto`) — pra minimizar risco, o Code "Preparar
blocos X" de cada ramo reemite o MESMO nome de campo `text_to_send` (só que
com o bloco atual em vez do texto completo), então os nodes de envio
existentes não precisaram ser tocados, só rewired.

**Passo F — `delay:4000`/`readmessages:true`** ativado nos 5 nodes de envio em
loop (1 Atendimento + 4 Agendamento), publicados.

**Passo G — `ai_summary` no prompt** (mesmos 2 workflows, publicados). Campo
`text` (turno dinâmico) do AI Agent Atendimento e AI Agent Agendamento passou a
incluir bloco "O QUE VOCÊ JÁ SABE SOBRE ESSE LEAD" usando
`$('Buscar contexto').item.json.client.ai_summary` (sem `.context`, confirmado
direto no código de `internal.routes.ts` antes de editar).

**Passo H — Memória longa via Haiku** (mesmos 2 workflows, publicados). Fork
paralelo (não bloqueia o envio) a partir do AI Agent (Atendimento) ou dos nodes
que montam a resposta conversacional (Agendamento: `Preparar resposta texto` e
`Montar confirmacao`, não nos ramos transacionais de datas/slots): Code
"Montar input do resumo" (junta resumo atual + novo turno, prompt de fusão
"nunca apague informação antiga relevante") → HTTP Request pra
`https://api.anthropic.com/v1/messages` com `authentication:
predefinedCredentialType` + `nodeCredentialType: anthropicApi` (credencial
`0xxzbFr5hm3xvzRU`, "Anthropic account" — nunca `$env.CLAUDE_API_KEY`, bug #9
do plano, essa env var não existe confirmada), modelo `claude-haiku-4-5-20251001`,
header `anthropic-version: 2023-06-01` manual (não vem do credential) → HTTP
PATCH `/n8n/clients/{phone}/summary?nutritionist_id=` com
`onError: continueRegularOutput`.

**Lição técnica registrada em MEMORY.md** (custou 2 correções na mesma
sessão): ao editar via MCP um campo n8n que é uma expressão `{{ }}` inteira
(não texto estático com pedaços de expressão), o valor armazenado é o próprio
código-fonte JS — nunca pode ter quebra de linha real, só o texto literal de 2
caracteres `\n`. Como a chamada MCP já é JSON, isso exige escrever `\\n`
(dupla contra-barra) na chamada. Descoberto porque o node `n8n-nodes-base.
redis` `push` não expõe o tamanho da lista (ver Passo C) me obrigou a ler
código-fonte de mais coisas do que o normal nesta sessão, incluindo isso.
Verificação usada depois de cada edição desse tipo: `get_workflow_details` de
novo + contar `\n` reais no valor (tem que dar 0).

**Nenhum destes passos foi validado com execução ao vivo** (mesmo bloqueio de
permissão da sessão anterior, e a Heloísa não respondeu à pergunta de novo
nesta sessão) — só verificação estrutural via `get_workflow_details` após cada
publish. Validar na próxima mensagem real que chegar de qualquer lead via
`get_execution`, conferindo especialmente: 1 resposta só por rajada de
mensagens (não duplicada), blocos chegando separados com delay perceptível, e
o resumo do lead sendo de fato atualizado depois da conversa.

---

## 2026-07-03 (noite) - Claude Code (handoff pra Codex: humanização e memória longa)

Sessão interrompida por fim de créditos no meio da implementação do plano de
humanização (ver STATUS.md, entrada "(noite) — HANDOFF PARA CODEX" para o
detalhamento completo). Resumo: backend commitado/enviado (`5932be9`), Window
Buffer Memory removido e publicado nos 3 workflows n8n. Faltam os passos
C-H (debounce Redis, blocos humanizados, delay, ai_summary no prompt, braço de
memória Haiku) — todos documentados passo a passo no plano
`C:\Users\Heloisa\.claude\plans\happy-baking-island.md`, que também lista 9
bugs reais encontrados na spec original do `n8n-specialist`
(`obsidian/03 - Técnico/n8n/Spec - Humanizacao e Memoria Longa (2026-07-03).md`)
que teriam quebrado produção se implementados ao pé da letra (o mais grave:
campo errado faria a IA ecoar a mensagem do lead em vez de mandar datas de
agendamento). Bloqueio pendente: permissões do Claude Code recusaram testar
workflows em produção mesmo com número falso — Heloísa ainda não decidiu como
validar as próximas etapas.

## 2026-07-03 - Claude Code (fix produção: escalação repetida + rota HUMANO indevida + saudação dupla)

Heloísa reportou: IA re-enviando "vou chamar o David", escalando quando o lead só
queria marcar consulta, e respondendo 2x a saudações seguidas ("Ei" + "Bom dia").
Diagnóstico via executions do n8n (`FRAME - Orquestrador`, execs 292/294/295/300/302).
3 bugs corrigidos via MCP e **publicados** (`activeVersionId: b1156d1e`):

1. **O fix de takeover de 2026-07-02 estava quebrado em produção**: o node
   `Marcar conversa como humano` mandava header `content-type: application/json`
   com `sendBody: false` → Fastify rejeitava com 400 `FST_ERR_CTP_EMPTY_JSON_BODY`
   → a conversa NUNCA era marcada `human_takeover` → cada mensagem nova do lead
   reprocessava e re-enviava a escalação. Corrigido: `sendBody: true` +
   `jsonBody: {}` (o endpoint não lê body, só params/query — verificado em
   `internal.routes.ts:1068`).
2. **Classificador tratava "marcar consulta com o David" como HUMANO** (conf.
   0.97) — qualquer menção ao nome do David virava escalação. System message do
   `AI Agent Orquestrador` reescrito: a consulta é sempre com o David, citar o
   nome ao marcar = AGENDAMENTO; HUMANO só pra pedido explícito de FALAR com
   pessoa (não marcar), reclamação séria, emergência ou caso sensível; na
   dúvida, não escalar.
3. **Anti-acúmulo de mensagens nunca funcionou** (causa da saudação dupla):
   (a) `Salvar mensagem do cliente` rodava em paralelo mas, com executionOrder
   v1, só executava DEPOIS do branch principal inteiro — a mensagem nova nunca
   estava no banco na hora da checagem; rewired pra
   `Registrar chegada → Salvar mensagem do cliente → Aguardar` (salva antes de
   esperar); (b) o código de `Verificar acumulo de mensagens` filtrava
   `sender === 'user'`, mas a API retorna `sender: 'client'` — a checagem nunca
   detectava nada; corrigido (aceita client/user, com margem de 1s pra não
   contar a própria mensagem recém-salva e se auto-descartar); (c) node
   "Aguardar 45 segundos" esperava só 3s — ajustado pra 10s e renomeado
   `Aguardar 10 segundos` (compromisso latência × acúmulo).

Sem mudança de código no repo (tudo no n8n). **Nota**: a conversa do lead
5527999337639 recebeu a escalação antes do fix e NÃO está `human_takeover`
(o 400 impediu) — se ele mandar nova mensagem, cai em AGENDAMENTO normalmente.
Mensagens a <1s de intervalo ainda podem gerar resposta dupla (janela da margem).

**2ª rodada (mesma tarde)**, a pedido da Heloísa ("veja se tem mais algo que pode
me prejudicar" + estudo do template da mentoria):
- Publicado no Orquestrador (`activeVersionId: 3575550b`): guard
  `Filtrar so mensagens de lead` (B1 da auditoria — eventos de cron/payload sem
  texto não chegam mais na IA) e notificação de escalação pro WhatsApp da nutri
  (B2 — condicional a `nutritionists.phone`, que está NULL pro David; log de
  escalação agora registra se notificou ou não).
- Auditoria E2E atualizada com callout de status (linha "takeover ✅" corrigida —
  estava errada, o node nasceu quebrado).
- Template da mentoria (`Template IA + Agendamento`, `qNMmTmMOTdo9WwGc`)
  dissecado: análise + plano de adoção em
  `obsidian/03 - Técnico/n8n/Análise - Template Mentoria IA + Agendamento (2026-07-03).md`
  (debounce Redis, blocos humanizados com delay, memória longa 2 camadas,
  fromMe→takeover, áudio; rejeitados Baserow/Google Calendar/monólito).
- Confirmado no repo: trabalho de 02/07 está commitado (`ce1229e`/`51e6a61` em
  `origin/main`); working tree só tem `david-seed.sql`/`supabase-setup.sql`
  não rastreados + artefatos soltos.

## 2026-07-03 - Codex (Excalidraw: proposta comercial Frame System)

- Acessou no Chrome a imagem enviada pela Heloisa via ChatGPT: proposta comercial em estilo whiteboard/hand-drawn com 12 quadros (capa, problema, solucao, como funciona, inclusos, cronograma, suporte, responsabilidades, planos, pagamento, motivos e proximos passos).
- Gerou `exports/frame-system-proposta-comercial.excalidraw` e colou/importou a cena no Excalidraw aberto em `https://excalidraw.com/` como elementos editaveis: cards numerados, textos, bullets, icones simples, timeline, planos, fluxo e footer.
- Manteve o conteudo antigo do canvas intacto e colocou a nova proposta como um bloco separado, sem apagar elementos existentes.

## 2026-07-03 - Codex (mockup dashboard a partir de referencia Instagram)

- Acessou a referencia enviada no Instagram (`/p/DZ9Muguny2q/`), identificada como um dashboard SaaS de project management de `sujon.co`/`oripioagency`, e usou apenas a direcao visual/estrutura: layout claro, cards modulares, fila de tarefas, progresso e composicao limpa.
- Criou `exports/frame-system-dashboard-instagram-reference.html`, mockup HTML do zero para o dashboard do Frame System: sidebar escura, hero operacional, painel da assistente IA, metricas, fila comercial, board de tarefas, agenda do dia, grafico semanal e ultimas mensagens.
- Nao portou para o app Next.js real ainda; a entrega ficou como mockup estatico para revisao visual antes de substituir a tela funcional atual.

## 2026-07-03 - Claude Code (auditoria E2E: gap para produto vendável)

A pedido da Heloísa, auditoria profunda do estado atual (backend real, 3
workflows n8n publicados, crons de follow-up) pra fechar o gap até a 1ª
nutricionista pagante. Resultado completo em
`obsidian/02 - Produto/Auditoria E2E - Gap para Venda (2026-07-03).md`.
Achados novos (não mapeados antes): **(B1)** lembrete 24h/pós-consulta/retorno
quebrados em produção — `fireWebhookEvent` posta na MESMA URL do Orquestrador,
que trata evento como mensagem de lead (`message_text` undefined) e ainda marca
`reminder_sent=true`; **(B2)** escalação pra humano nunca manda WhatsApp pro
David (só pro lead + badge no dashboard, apesar do log dizer "David
notificado"); **(B3)** Agente Atendimento diz "vou chamar o David" (casos
clínicos) sem marcar `human_takeover`; **(B4)** nenhum agente coleta o nome do
lead → agenda enche de "Cliente"; **(S1)** falha de segurança: POST sem token
em `/webhook/whatsapp` cai no fallback "instância conectada mais recente"
(`webhook.routes.ts:107`) — spoofing/cross-tenant; **(S2)** `ANTHROPIC_API_KEY`
e `INTERNAL_API_KEY` viajam no payload pro n8n e ficam em claro nos execution
logs (a Claude key nem é usada); **(S3)** webhooks n8n dos sub-agentes aceitam
POST público e leem `internal_api_url` do payload (abuso de tokens Claude).
Plano priorizado P0/P1/P2 no documento do Obsidian. Nenhum código alterado
nesta sessão — só análise + documentação.


## 2026-07-02 - Claude Code (fix: escalação pra humano repetia mensagem)

Heloísa reportou, olhando os executions do n8n, que a IA reenviava "vou chamar
o David" várias vezes na mesma conversa depois de já ter escalado pra humano.
Causa raiz: `webhook.routes.ts` já bloqueia o encaminhamento de mensagens pro
n8n quando `conversations.status = 'human_takeover'`, mas o workflow
`FRAME - Orquestrador` nunca marcava esse status ao classificar rota `HUMANO`
— só mandava o WhatsApp de escalação e logava, então a próxima mensagem do
lead ainda batia como conversa `active` e era reclassificada do zero.

**Fix**: novo endpoint interno `PATCH
/api/internal/n8n/conversations/:phone/takeover?nutritionist_id=`
(`internal.routes.ts`); novo node `Marcar conversa como humano` no workflow do
Orquestrador (`I6DwIWxE6qYNasZj`), conectado a partir de `Preparar mensagem de
escalacao`, chamando esse endpoint — editado e **publicado** via n8n MCP.
Como não existia caminho de volta de `human_takeover` pra automático, criado
`POST /api/conversations/:id/resume` + botão "Devolver para IA" em
`/conversas` (substitui "Assumir" quando a conversa já está assumida).
`npx tsc --noEmit` ok em api e dashboard. Detalhes completos e efeito
colateral esperado (fallback do classificador agora também silencia a IA até
alguém devolver manualmente) documentados em MEMORY.md/STATUS.md.

## 2026-07-01 - Claude Code (vinculação manual da instância uazapi do David)

Heloisa decidiu reaproveitar a instância uazapi que já existia (criada diretamente no
site uazapi antes da migração) em vez de criar uma nova pelo fluxo `/api/whatsapp/connect`.
Isso evita duplicidade de instância na conta uazapi.

**Dados da instância a vincular:**
- `nutritionist_id`: `2dedeb18-6695-4b6d-a49b-09b7f8b340e0` (David Effgen)
- `instance_token`: `3041108b-c9a6-42fa-b9cc-6b390fd0e587`
- `instance_id`: `r71f138f3a679b9`
- Nome da instância na uazapi: `RA5S2j` (informativo, não armazenado na tabela)

**Por que não passou pelo fluxo normal `/connect`:**
O fluxo `/connect` chama `createInstance()` na uazapi e gera um token novo. Como a
instância já existia (com token próprio), criar outra resultaria em duas instâncias
distintas registradas na conta uazapi, ambas ouvindo o mesmo número — o que causaria
duplicidade de mensagens recebidas.

**Self-healing de status confirmado:**
`GET /api/whatsapp/status` (`whatsapp.routes.ts` linhas 106-114) consulta o status
ao vivo via `getInstanceStatus(instance_token)` e atualiza `status = 'connected'`
no banco automaticamente quando detecta a instância ativa. Não é necessário acertar
o `status` manualmente — ele se corrige na próxima chamada ao dashboard.

**Status da execução:**
O banco de produção (EasyPanel PostgreSQL interno) não é acessível externamente —
porta 5432 não está exposta no firewall do servidor. O SQL para execução manual
via EasyPanel está documentado na resposta da sessão de 2026-07-01.
Pré-requisito: a migration `schema.sql` (ALTER TABLE ... instance_token/instance_id)
deve ser rodada antes deste UPDATE (ela faz parte do commit pendente da migração uazapi).

---

## 2026-07-03 - Codex (Excalidraw: proposta comercial Frame System)

- Acessou no Chrome a imagem enviada pela Heloisa via ChatGPT: proposta comercial em estilo whiteboard/hand-drawn com 12 quadros (capa, problema, solucao, como funciona, inclusos, cronograma, suporte, responsabilidades, planos, pagamento, motivos e proximos passos).
- Gerou `exports/frame-system-proposta-comercial.excalidraw` e colou/importou a cena no Excalidraw aberto em `https://excalidraw.com/` como elementos editaveis: cards numerados, textos, bullets, icones simples, timeline, planos, fluxo e footer.
- Manteve o conteudo antigo do canvas intacto e colocou a nova proposta como um bloco separado, sem apagar elementos existentes.
## 2026-07-01 - Claude Code (migração Evolution API → uazapi — substituição total)

Heloisa decidiu abandonar a Evolution API (estava bloqueando números reais) e migrar 100%
para a uazapi. Substituição total em 10 arquivos, sem suporte duplo.

**Arquivos reescritos (3 completos):**
- `apps/api/src/services/whatsapp.service.ts` — todas as chamadas HTTP agora apontam para uazapi.
  `getQRCode/getPairingCode` unificados em `connectInstance(instanceToken, phone?)`.
  `markAsRead` removida (uazapi usa `readchat/readmessages` no send). `createInstance` agora
  retorna `{token, id}` — ambos persistidos no banco. `deleteInstance` usa `DELETE /instance`
  (sem instanceName na URL). Todas as funções públicas mantiveram assinaturas compatíveis
  (3º parâmetro virou `instanceToken` em vez de `instanceName`).
- `apps/api/src/routes/whatsapp.routes.ts` — `/connect` cria instância com `UAZAPI_ADMIN_TOKEN`,
  persiste `instance_token` + `instance_id`. Webhook URL usa `API_PUBLIC_URL` (corrigindo
  pendência de 2026-07-01 onde `API_URL` era usada). `/qr` chama `connectInstance` sem phone.
  `/pairing-code` chama `connectInstance` com phone. Sem `getQRCode`/`getPairingCode`.
- `apps/api/src/routes/webhook.routes.ts` — `parseEvolutionPayload` → `parseUazapiPayload`
  (novo formato: `event:"messages"`, `instance:"<id>"`, `data.text`, `data.chatid`, etc.).
  Roteamento multi-tenant agora usa `instance_id` (campo `instance` do payload) em vez de
  `instance_name`. `activeInstance` → `activeToken`. Payload do n8n substitui
  `evolution_api_url/key` por `uazapi_base_url/instance_token`.

**Arquivos atualizados (7 pontuais):**
- `webhook-events.service.ts` — `getConnectionData` retorna `instance_token/uazapi_base_url`.
- `followup.service.ts` — 8 pontos: SQL (`instance_name→instance_token`), fallback sends,
  payload do lembrete de consulta (evolution→uazapi).
- `report.service.ts` — SQL + sendMessage com instance_token.
- `patient.routes.ts` — SQL + sendMessage com instance_token.
- `internal.routes.ts` — 5 pontos: SQLs, endpoint `/whatsapp/send` (aceita `nutritionist_id`
  OU `instance_token`), resposta `/n8n/context` (whatsapp.instance_token/uazapi_base_url).
- `integrations.routes.ts` — mock de teste atualizado.
- `db/schema.sql` — `ALTER TABLE whatsapp_connections ADD COLUMN IF NOT EXISTS instance_token TEXT`
  e `instance_id TEXT` + índice único em `instance_id`.

**Env vars:** `EVOLUTION_API_URL/KEY` removidas do código. Entram `UAZAPI_BASE_URL` e
`UAZAPI_ADMIN_TOKEN`. Criado `apps/api/.env.example` com todas as vars documentadas.
`API_URL` e `INTERNAL_API_URL` removidas — sistema usa apenas `API_PUBLIC_URL`.

**`npx tsc --noEmit`:** sem erros. Sem commit/push — aguardando revisão da Heloisa.

**Pendência de validação em produção:** o parser `parseUazapiPayload` foi escrito com base
na documentação da uazapi (docs.uazapi.com), mas ainda não foi validado contra um payload
real. Recomendado capturar via webhook.cool antes do primeiro deploy em produção e ajustar
campos se necessário (especialmente `data.text`, `data.chatid`, `data.messageid`).

**Para o EasyPanel:** adicionar `UAZAPI_BASE_URL` e `UAZAPI_ADMIN_TOKEN`; remover
`EVOLUTION_API_URL`, `EVOLUTION_API_KEY`; confirmar que `API_PUBLIC_URL` está setada
(a URL do webhook agora usa exclusivamente essa var).

---

## 2026-07-03 - Codex (Excalidraw: proposta comercial Frame System)

- Acessou no Chrome a imagem enviada pela Heloisa via ChatGPT: proposta comercial em estilo whiteboard/hand-drawn com 12 quadros (capa, problema, solucao, como funciona, inclusos, cronograma, suporte, responsabilidades, planos, pagamento, motivos e proximos passos).
- Gerou `exports/frame-system-proposta-comercial.excalidraw` e colou/importou a cena no Excalidraw aberto em `https://excalidraw.com/` como elementos editaveis: cards numerados, textos, bullets, icones simples, timeline, planos, fluxo e footer.
- Manteve o conteudo antigo do canvas intacto e colocou a nova proposta como um bloco separado, sem apagar elementos existentes.
## 2026-07-01 - Claude Code (fix producao: webhook do WhatsApp do David nao disparava)

Heloisa reportou que reconectou o WhatsApp do David (troca de numero) e o
webhook parou de disparar. Diagnostico: `POST /api/whatsapp/connect`
(`apps/api/src/routes/whatsapp.routes.ts:22`) monta a URL do webhook usando
a env var `API_URL`, que em producao esta setada como
`http://nutriapp_api:3001` (hostname interno do Docker). Consultado
`GET /webhook/find/{instance}` direto na Evolution API confirmou que era
exatamente essa URL interna que estava registrada na instancia do David
(`nutri-2dedeb18-6695-4b6d-a49b-09b7f8b340e0`) - a Evolution API (servico
separado no EasyPanel, dominio publico proprio) nao consegue resolver esse
hostname, entao a entrega do webhook falhava silenciosamente.

**Fix aplicado agora (sem deploy)**: chamado `POST /webhook/set/{instance}`
direto na Evolution API para reapontar o webhook para
`https://api.framesystem.com.br/webhook/whatsapp/{instance}` (testado e
respondendo 200). Confirmado via `webhook/find` (URL atualizada) e
`instance/connectionState` (`state: open`). A pedido da Heloisa, so a
correcao imediata na Evolution foi feita nesta sessao - a correcao de
codigo (ver pendencia abaixo) ainda nao foi aplicada.

**Pendencia para o codigo** (nao alterado ainda, precisa decisao/execucao
futura): o backend usa 3 nomes de env var diferentes pro mesmo conceito
("URL publica da Frame API"): `API_URL` (so em `whatsapp.routes.ts`, com
fallback `http://localhost:3001`), `API_PUBLIC_URL` (usada em
`webhook.routes.ts`, `google-calendar.service.ts`, `ai.service.ts`) e
`INTERNAL_API_URL` (documentada no `.env.example`, nunca lida no codigo -
morta). Qualquer proxima nutri que conectar o WhatsApp pela primeira vez
vai cair no mesmo bug se a env var `API_URL` em producao nao estiver
setada para a URL publica. Recomendado: unificar tudo para `API_PUBLIC_URL`
em `whatsapp.routes.ts`, remover `INTERNAL_API_URL` do `.env.example`, e
conferir/ajustar `API_URL` no EasyPanel (ou removê-la, já que não seria
mais usada).

---

## 2026-07-03 - Codex (Excalidraw: proposta comercial Frame System)

- Acessou no Chrome a imagem enviada pela Heloisa via ChatGPT: proposta comercial em estilo whiteboard/hand-drawn com 12 quadros (capa, problema, solucao, como funciona, inclusos, cronograma, suporte, responsabilidades, planos, pagamento, motivos e proximos passos).
- Gerou `exports/frame-system-proposta-comercial.excalidraw` e colou/importou a cena no Excalidraw aberto em `https://excalidraw.com/` como elementos editaveis: cards numerados, textos, bullets, icones simples, timeline, planos, fluxo e footer.
- Manteve o conteudo antigo do canvas intacto e colocou a nova proposta como um bloco separado, sem apagar elementos existentes.
## 2026-06-18 - Claude Code (backend funcional: regras, Google Calendar, servicos, location/dia)

Sessao focada em deixar o sistema 100% funcional sem tocar no design. Tudo
commitado e enviado para origin/main (deploy Vercel disparado).

Commits desta sessao:
- `feat(funcionalidade): conecta conversas, clientes, disponibilidade e local por dia`
  - POST /api/conversations/:id/messages (envia WhatsApp pela nutri)
  - NovoPacienteModal em /clientes (POST /api/clients)
  - location_id por dia da semana (schema + rotas availability + UI DayRow)
  - /configuracoes conectada a APIs reais (perfil, equipe, senha, webhooks)
- `feat(backend): regras de agendamento, botao Google Calendar e servicos funcionais`
  - schema.sql: ADD COLUMN buffer_between_minutes/min_advance_hours/max_appointments_per_day em nutritionists
  - GET /api/nutritionists/profile retorna as 3 regras
  - PUT /api/nutritionists/scheduling-rules (novo endpoint)
  - /disponibilidade: card Regras editavel com save; botao Sincronizar Google funcional
  - /treinamento: botoes Novo servico e Editar navegam para /servicos

Pendencias tecnicas remanescentes (nao criticas para MVP):
- Migracoes das novas colunas precisam ser rodadas no banco de producao (schema.sql)
- KPIs de automacoes (execucoes/conversao) dependem de tracking do n8n, sem solucao no momento
- Build de producao pode estar em modo development (buildId: "development") - verificar NODE_ENV no Vercel

---

## 2026-07-03 - Codex (Excalidraw: proposta comercial Frame System)

- Acessou no Chrome a imagem enviada pela Heloisa via ChatGPT: proposta comercial em estilo whiteboard/hand-drawn com 12 quadros (capa, problema, solucao, como funciona, inclusos, cronograma, suporte, responsabilidades, planos, pagamento, motivos e proximos passos).
- Gerou `exports/frame-system-proposta-comercial.excalidraw` e colou/importou a cena no Excalidraw aberto em `https://excalidraw.com/` como elementos editaveis: cards numerados, textos, bullets, icones simples, timeline, planos, fluxo e footer.
- Manteve o conteudo antigo do canvas intacto e colocou a nova proposta como um bloco separado, sem apagar elementos existentes.
## 2026-06-17 - Codex (mockup Lovable clean / agenda e disponibilidade)

- Criou `exports/frame-ascend-lovable-clean.html` com uma versao mais limpa
  e fiel ao zip do Lovable: sidebar compacta, topbar discreta, cards
  minimalistas e foco apenas em agenda e disponibilidade por local.
- Aversao anterior, mais pesada, foi tratada como rascunho; a nova fica como
  referencia ativa para continuidade.

## 2026-06-17 - Codex (mockup Legitimuz / Frame Ascend)

- Criou `exports/frame-ascend-legitimuz-redesign.html` com a nova direcao
  visual do sistema: dark minimal, Inter, cards compactos, agenda
  operacional e destaque para disponibilidade por local e por dia.
- Registrou a regra de produto para que o agendamento respeite nao so a
  data/horario, mas tambem o local escolhido pelo nutricionista naquele dia.

## 2026-06-16 - Codex (modelo 5 recortado da referencia correta)

- Gerou `exports/frame-system-logo-modelo-5.png` a partir do screenshot
  enviado pela Heloisa, recortando o simbolo circular escuro com as ondas
  verdes.
- Gerou tambem `exports/frame-system-logo-modelo-5.svg` como wrapper
  importavel no Figma.

## 2026-06-16 - Codex (logo base exportada em PNG e SVG)

- Copiou a logo original da Frame System para `exports/frame-system-logo-base.png`.
- Gerou `exports/frame-system-logo-base.svg` como wrapper importavel no Figma, mantendo a imagem original embutida.

## 2026-06-16 - Codex (arquivo vetorial importavel para o Figma)

- Criou `exports/frame-system-brand-kit-import.svg` com duas variantes da
  logo, favicon e nova paleta em layout de cards, pensado para importacao
  direta no Figma.
- Validou o SVG como XML para evitar arquivo quebrado.

## 2026-06-16 - Codex (Figma brand kit bloqueado por limite)

- Tentativa de criar no Figma um brand kit com a nova logo, favicon e
  paleta da Frame System.
- O arquivo Figma foi criado com sucesso (`XhhcjYjkMA87071O2Y8yKk`), mas a
  populacao da board nao concluiu porque o Figma MCP atingiu o limite de
  chamadas do plano Starter antes do primeiro layout ser salvo.
- Nenhuma composicao visual foi escrita no arquivo; ele permanece em branco
  aguardando nova tentativa quando o limite for liberado/expandido.

## 2026-06-15 - Claude Code (remover Oportunidades, restaurar funcionalidades pos-V4)

A pedido da Heloisa ("tire essa aba de oportunidades... torne o sistema
funcional agora (tem alguns botoes que nao funcionam)... calendario de
bloqueio... automacoes/n8n... assistente 100%... nutri ativo nao pode perder
configuracoes"):

- **Removida a aba/pagina `/oportunidades`** por completo: rota, item da
  Sidebar e referencia em `PAGE_TITLES` do `TopBar`. Kanban de funil
  removido do produto (API `/api/clients/opportunities` e
  `/api/clients/:id/stage` continuam existindo no backend, sem uso no
  frontend por ora).
- **`/agenda`**: restaurado o calendario de bloqueio de data/horario
  (`BlockTimeModal`), `NewAppointmentModal`, `AppointmentModal` e
  `MiniCalendar`/`GoogleCalendarCard`, com dados reais de
  `/api/appointments` e navegacao semanal - mantendo estilo V4.
- **`/dashboard`**: reescrito por completo (~290 linhas). Removidos todos os
  dados fabricados (`funnel`/`opportunities`, link morto para
  `/oportunidades`, "Agenda de hoje"/"Follow-ups" hardcoded). Agora usa
  dados reais de `/api/metrics/overview`, `/api/conversations/stats`,
  `/api/appointments?date=...`, `/api/metrics/recent-activity` e
  `/api/whatsapp/status`: KPIs (precisam de voce, conversas ativas, novos
  leads 7d, consultas hoje), "Atividade recente", "Agenda de hoje", "Saude
  da assistente", "Conversao" e cards de navegacao para
  Conversas/Agenda/Pacientes.
- **`/treinamento` (Assistente IA)**: o port V4 havia substituido a pagina
  inteira (1884 linhas funcionais) por um mockup de 115 linhas sem nenhuma
  chamada de API (identidade fake "Lia", score "82%" fixo, botao "Salvar
  identidade" sem acao). **Restaurada a versao funcional completa**
  (identidade da assistente, base de conhecimento manual/PDF/entrevista,
  automacoes de mensagens, regras clinicas, objeções, exemplos de conversa,
  toggle de IA, horario de funcionamento, testar atendimento). Isso garante
  que as configuracoes que a nutri ativa ja salvou em `assistants`
  (`farewell_message`, `frases_proibidas/preferidas`, `custom_objections`,
  `conversation_examples`, `clinical_rules`, mensagens de followup, etc.)
  continuam visiveis/editaveis - nada foi perdido no banco, mas estava
  invisivel na UI V4.
- **`/configuracoes`**: reescrita no layout "secoes com nav lateral"
  (Perfil / Seguranca / Aparencia / Integracoes / Equipe), portando a logica
  real das paginas orfas `/perfil`, `/seguranca`, `/integracoes` e `/equipe`
  (que continuam existindo como rotas standalone, agora sem uso no menu).
  Nova secao "Aparencia" com toggle de tema (`useTheme()`).
- **`/followup` (Automacoes)**: ja estava redesenhado em sessao anterior
  (tabela "Todos os fluxos" com Execucoes/Conversao/Status, KPIs reais,
  filtros Todos/Ativos/Pausados) - confirmado e sem alteracoes.
- Validacao: `npx tsc --noEmit` (sem erros) e `npm run build` em
  `apps/dashboard` (40 rotas, ok) apos todas as mudancas.
- Fluxo n8n/follow-up: confirmado que a infraestrutura
  (`followup.service.ts`, `followup-sequences.routes.ts`,
  `webhook-events.service.ts`) nao foi tocada pelo port V4 e a UI de
  `/treinamento` (aba Automacoes) continua escrevendo nos mesmos campos de
  `assistants` que alimentam esse fluxo. Teste end-to-end com WhatsApp/n8n
  em produção nao foi feito (fora do alcance deste ambiente - depende do
  Codex/infra).
- Arquivos temporarios `old_treinamento.tsx`/`old_agenda.tsx`/
  `old_disponibilidade.tsx` (copias de referencia do commit anterior, criadas
  via `git show HEAD~1:...`) foram removidos apos uso.
- Sem commit/push - aguardando revisao da Heloisa.

## 2026-06-15 - Codex (V4 oficial aplicado nas rotas principais)

- Apos a Heloisa esclarecer que nao queria apenas shell/oportunidades, e sim
  o sistema abrindo igual ao mockup V4, foram reescritas as rotas principais
  do dashboard usando a composicao visual do
  `frame-system-lovable-light-v4-claude.html`:
  `/dashboard`, `/conversas`, `/agenda`, `/clientes`, `/treinamento`,
  `/followup`, `/disponibilidade` e `/configuracoes`, alem das rotas ja
  ajustadas `/oportunidades` e `/relatorios`.
- Criado `apps/dashboard/src/components/v4/V4Primitives.tsx` para padronizar
  PageHeader, cards, botoes, tags, inputs, selects, metricas e avatares no
  vocabulario visual do V4.
- Resultado visual: dashboard com funil/agenda/saude da assistente; inbox com
  lista/chat/contexto; agenda semanal com painel lateral; pacientes em tabela
  V4; assistente com subabas internas; automacoes em tabela operacional;
  disponibilidade com horarios/locais; configuracoes com perfil, seguranca,
  integracoes e equipe.
- Validacao: `npx.cmd tsc --noEmit` em `apps/api`, `npx.cmd tsc --noEmit` em
  `apps/dashboard` e `npm.cmd run build` em `apps/dashboard` passaram. Build
  gerou 41 rotas.

## 2026-06-15 - Codex (alinhamento V4 oficial no app real)

- Conferiu que o arquivo enviado pela Heloisa
  `C:\Users\Heloisa\Documents\HELOISA\frame-system-lovable-light-v4-claude.html`
  e a copia local `frame-system-lovable-light-v4-claude.html` sao identicos
  por SHA256; usado como fonte oficial desta rodada.
- Alinhou o shell do dashboard ao V4: sidebar desktop compacta/expansivel
  (72px -> 210px), itens do menu na ordem/nomes do mockup (Visao geral,
  Caixa de entrada, Oportunidades, Agenda, Pacientes, Assistente, Automacoes,
  Relatorios, Disponibilidade, Configuracoes), TopBar ajustada para offset de
  72px e titulos corrigidos.
- Removeu a pagina `/design-system` do app e criou a nova rota `/relatorios`
  com KPIs, graficos visuais, gargalos e recomendacoes no estilo V4.
- Corrigiu `/oportunidades` para usar os endpoints reais com prefixo
  `/api/clients/opportunities` e `/api/clients/:id/stage`; antes estava sem
  `/api` e podia falhar dependendo do ambiente.
- Validacao: `npx.cmd tsc --noEmit` em `apps/api`, `npx.cmd tsc --noEmit` em
  `apps/dashboard` e `npm.cmd run build` em `apps/dashboard` passaram. Build
  gerou 41 rotas, incluindo `/relatorios` e sem `/design-system`.

## 2026-06-13 - Claude Code (port V4 + Oportunidades + schema de funil)

- Polimento visual V4 (a partir de `frame-system-lovable-light-v4-claude.html`,
  aprovado pela Heloisa): `globals.css` (scrollbar mais grossa, novas
  utilities `.card-hover`/`.btn-gradient`/`.table-row-hover`),
  `finance-primitives.tsx` (`Card` com prop `hover`, `Badge` pill com prop
  `dot`, `Btn` primary com `.btn-gradient`, `Avatar` com ring/shadow) e
  `Sidebar.tsx` (item ativo com barra lateral em gradiente).
- Nova pagina `/oportunidades` (Kanban de funil: Novos contatos / Em
  atendimento / Qualificados / Avaliando / Agendamento pendente / Consulta
  marcada), com busca, filtro por origem e botoes de mover etapa por card.
  Adicionada ao `Sidebar` (icone `Target`) e ao `PAGE_TITLES` do `TopBar`.
- Schema novo em `clients` (`stage`, `source`, `estimated_value`,
  `stage_updated_at` + indice `idx_clients_stage`) via `ALTER TABLE ... ADD
  COLUMN IF NOT EXISTS` em `apps/api/src/db/schema.sql` - ainda nao aplicado
  no banco de producao.
- API nova em `apps/api/src/routes/client.routes.ts`: `GET
  /api/clients/opportunities` e `PATCH /api/clients/:clientId/stage`.
- Decisao registrada em `MEMORY.md`: essa parte do CRM/funil, antes listada
  como pendencia do Codex, foi feita pelo Claude Code a pedido explicito da
  Heloisa ("Tudo, incluindo schema novo").
- `npx tsc --noEmit` (api e dashboard) e `npm run build` (dashboard, 40
  rotas) ok. Sem commit/push - aguardando revisao da Heloisa.

## 2026-06-12 - Codex (base visual light-first)

- Atualizou a base visual do dashboard para a direcao light-first premium
  pedida pela Heloisa:
  - `apps/dashboard/src/app/globals.css`: removeu Bricolage do import,
    manteve Inter + DM Mono e redefiniu `.font-display` para usar Inter.
  - `apps/dashboard/tailwind.config.ts`: `fontFamily.display` passou a ser
    Inter, alinhando toda a hierarquia tipografica ao novo briefing.
  - `apps/dashboard/src/contexts/ThemeContext.tsx`: o tema padrao agora
    nasce em `light`, sem herdar dark salvo; o tema escuro fica como opcao
    manual.
  - `apps/dashboard/src/components/ui/finance-primitives.tsx`: botoes
    secundarios/ghost/outline ficaram mais leves e coerentes com a nova
    paleta.
  - `apps/dashboard/src/app/(dashboard)/design-system/page.tsx`: mostra a
    paleta oficial light (#F4F5F0/#FFFFFF/#FAFBF8/#E5E7E2) e a tipografia
    Inter.
- Validacao: `npm.cmd run build` em `apps/dashboard` passou (40 rotas) e o
  preview local `http://localhost:3000/preview-dashboard` foi capturado com
  sucesso no novo tema.

## 2026-06-12 - Codex

- Heloisa mudou a direcao da discussao de "corrigir novamente o design no
  Next atual" para avaliar "usar o Lovable como interface" para reduzir
  retrabalho de design.
- Codex leu a memoria atualizada e encontrou entrada do Claude Code sobre
  auditoria do modo claro: Claude revisou as paginas no preview, corrigiu
  mojibake em `treinamento`/`followup`, ajustou filtros de `conversas`,
  reverteu mocks temporarios e validou `npx tsc --noEmit` + `npm run build`.
- Estado local verificado: apenas `memoria-compartilhada/STATUS.md` modificado
  por Codex; nenhuma mudanca de codigo aparecendo em `git status`.

## 2026-06-12 - Claude Code (auditoria modo claro)

- A Heloisa enviou print do dashboard em modo claro classificando como
  "horrivel, nada a ver com o Lovable" e pediu para resolver de forma
  definitiva, sem aceitar mais erros antes do push.
- Auditoria visual completa (preview em modo claro) de todas as paginas do
  dashboard: Painel, Conversas, Agenda, Clientes, Financeiro, Automacoes,
  Assistente IA, Disponibilidade, Equipe, Integracoes, Configuracoes,
  Admin, Servicos, Perfil, Seguranca.
- Correcoes aplicadas:
  - `treinamento/page.tsx`: mojibake "Modelo Frame Â· v3.2" / "Em
    produÃ§Ã£o" -> "Modelo Frame · v3.2" / "Em produção".
  - `followup/page.tsx`: mojibake "ExecuÃ§Ãµes (7d)" / "ConversÃ£o mÃ©dia"
    -> "Execuções (7d)" / "Conversão média".
  - `conversas/page.tsx`: linha de filtros (Todas/IA ativa/Aguardando
    você/Resolvidas) estava truncando "Resolvidas" em "Resolvic" com
    scrollbar horizontal no painel de ~280px; trocado
    `overflow-x-auto`+`shrink-0` por `flex flex-wrap`, agora os 4 filtros
    aparecem completos em 2 linhas sem scroll.
- Revertidos os 3 edits temporarios de debug/mock-auth (AuthContext.tsx,
  layout.tsx, lib/api.ts) usados apenas para navegar no preview sem login.
- `npx tsc --noEmit` e `npm run build` ok (39 rotas). Sem commit/push -
  aguardando a Heloisa revisar os screenshots e confirmar.

## 2026-06-12 - Claude Code

- Concluido o port 100% Lovable de `followup` (Automacoes) e `treinamento`
  (Assistente IA), itens do escopo original de 2026-06-11 que o Codex nao
  cobriu, com autorizacao da Heloisa ("Sim, faca as duas").
- **`followup/page.tsx`**: substituido o badge `FlowTag` (Ativa/Inativa)
  por `FlowStatusDot` (dot + glow + label "Ativo - automatico"/"Pausado",
  padrao Lovable). `AutoCard` ganhou icon box (36px, `var(--raised)`) +
  `Badge` com o trigger ao lado do titulo. Cards de automacao (Sem
  resposta/Pos-consulta/Lembrete/Retorno) ganharam icones e cores
  (`MessageSquare`/`Mail`/`Calendar`/`RotateCcw`). O antigo bloco "Status da
  IA" foi substituido por um card "Todos os fluxos" (`Card !p-0`) com lista
  `divide-y` de icone+nome+status-dot, no padrao
  `.tmp-frame-vision/src/routes/automacoes.tsx`. Nao foram portados os
  "template cards" do Lovable nem KPIs fabricados (Execucoes/Conversao/
  Tempo economizado) - sem dados reais no backend para isso.
- **`treinamento/page.tsx`**: `AIPowerToggle` deixou de usar hex fixos
  (`#ECFDF5`/`#FEF2F2`/etc., que so funcionavam no tema claro) e passou a
  usar tokens (`var(--brand-s)`, `var(--brand-ring)`, `var(--danger)`,
  `var(--raised)`) - agora funciona corretamente no tema escuro (padrao
  Lovable). `SectionCard` ganhou icon box de 36px (`var(--raised)`) para o
  icone do cabecalho; as 3 secoes (Configuracoes da assistente/Horario de
  funcionamento/Locais de atendimento) ganharam icones coloridos (`Bot`
  verde, `Clock` azul, `MapPin` laranja). Layout `max-w-3xl` de uma coluna
  mantido - o hero "Modelo Frame v3.2" e KPIs/chart de `ia.tsx` nao foram
  portados por dependerem de dados fabricados sem suporte no backend.
- Correcao de tipo: trocado `React.ComponentType<{...}>` por `LucideIcon`
  (de `lucide-react`) na prop `icon` do `AutoCard` em `followup/page.tsx` -
  o tipo customizado nao era compativel com os componentes do lucide.
- `npx tsc --noEmit` ok e `npm run build` ok (40 rotas, incluindo
  `/followup` e `/treinamento`). **Sem commit/push** - aguardando
  confirmacao da Heloisa.

## 2026-06-11 - Codex

- Heloisa autorizou o Codex a assumir o escopo Lovable/PDF que estava
  reservado ao Claude Code. Ajustes aplicados:
  - `/configuracoes`: refeito como hub no padrao Lovable com nav lateral de
    10 secoes (Workspace, Perfil, Aparencia, Notificacoes, Integracoes,
    Plano e cobranca, Equipe, Seguranca, API/Webhooks, Dados/LGPD).
  - `/integracoes`: marketplace igual ao Lovable, com mais apps e marcas
    visuais reconheciveis (WhatsApp, Instagram, Google Calendar, Stripe,
    Asaas, Mailchimp, Zapier, Webhook), mantendo status real de WhatsApp e
    Google Calendar e importacao CSV real.
  - `/clientes` e `/equipe`: largura/spacing e KPIs no topo para ficar mais
    proximo do Lovable.
  - `/agenda` e `/conversas`: refinados para topbar de 56px, headings e
    proporcoes mais consistentes com o shell Lovable, preservando calendario,
    modais, copiloto e classificacao de conversas.
  - `/design-system`: removido do source e sem referencias restantes em
    `apps/dashboard/src`.
- Validacao: `npm.cmd run build` em `apps/dashboard` passou (39 rotas).

## 2026-06-11 - Codex

- Atualizou o diagnostico apos pedido da Heloisa para retomar de onde o
  Claude Code parou. Estado encontrado: ultimo commit relevante e `2dbf4e4`
  (`feat(dashboard): finaliza port das telas Lovable...`); depois dele ha
  alteracoes locais em `/integracoes`, `Sidebar`, `TopBar`, `globals.css`,
  remocao de `/design-system` e memoria compartilhada. `npm.cmd run build`
  em `apps/dashboard` passou (39 rotas; `/design-system` nao aparece mais).
  Pendencias observadas: textos com encoding quebrado (`Ã`, `Â`) e fidelidade
  visual ainda incompleta em relacao ao Lovable/PDF nas paginas indicadas pela
  Heloisa.

## 2026-06-11 - Codex

- Atualizou `MEMORY.md` a pedido da Heloisa para remover a ambiguidade entre
  a referencia antiga (sidebar 220px/prints) e a direcao atual: `Frame
  Vision.zip` do Lovable e copia visual fiel, com sidebar 240px, topbar 56px,
  busca central, white-alpha surfaces/hover states e microdetalhes do
  Lovable, preservando apenas a logica/funcionamento real por baixo.

## 2026-06-15 - Codex

- Atualizou contexto via `STATUS.md`, `MEMORY.md`, `LOG.md`, `git status` e
  `git log`.
- Confirmou que `74a0a5d feat(dashboard): port V4 (polimento visual) + nova
  pagina Oportunidades com funil` ja esta em `main` e `origin/main`.
- Estado local restante: modificacao nao commitada em
  `apps/dashboard/src/app/(dashboard)/oportunidades/page.tsx`, arquivo
  `apps/dashboard/tsconfig.tsbuildinfo` modificado e mockups/HTMLs soltos na
  raiz. Lembrete: schema novo de oportunidades existe no codigo, mas a
  migration ainda precisa ser aplicada no banco no deploy.

## 2026-06-13 - Codex

- Refinou `frame-system-lovable-light-v3-refinado.html` apos feedback visual
  da Heloisa nos prints.
- Ajustes: substituiu simbolos/emoji-like em cards, automacoes, insights e
  locais por SVGs lineares; suavizou pesos de fonte restantes; ajustou avatares
  e tags para cores mais alinhadas a paleta Frame; melhorou os graficos de
  relatorios com grid, maior altura, barras mais robustas e linha mais
  consistente; removeu mojibake do arquivo.
- Mantida a base do mockup Lovable Light V2, sem criar outra estrutura.

## 2026-06-13 - Codex

- Apos feedback da Heloisa de que o arquivo anterior ficou chamativo demais,
  voltou para a abordagem correta: usar o HTML Lovable Light V2 enviado como
  base e criar `frame-system-lovable-light-v3-refinado.html`.
- O novo arquivo preserva a estrutura/telas do mockup original e aplica uma
  camada final de CSS com paleta Frame original
  (`#0B0C0E`, `#141618`, `#1E2124`, `#00C27C`, `#00E892`, `#0B2E1E`,
  `#F4F5F0`, `#6B7280`), tipografia simples (`Inter`, fallback `Open Sans`/
  `Montserrat`) e pesos principais reduzidos para 400/500/600.
- O arquivo anterior `frame-system-visual-direction-2026-06-13.html` deve ser
  tratado como rejeitado/fora da direcao atual.

## 2026-06-13 - Codex

- Criou `frame-system-visual-direction-2026-06-13.html` como novo arquivo
  standalone de referencia visual, inspirado nas 10 imagens enviadas pela
  Heloisa.
- Direcao aplicada: tema claro como padrao, dark mode consistente, sidebar
  verde profunda, acento lime `#E7FE25`, estrutura premium SaaS com cards
  densos, chips/status com glow controlado, agenda semanal, inbox com painel
  de contexto, assistente, automacoes e pagina de paleta/configuracoes.
- Paleta registrada para avaliacao: `#013F32`, `#E7FE25`, `#FDFDFD` e
  `#161616`. O arquivo e referencia visual, nao substitui ainda o app Next.

## 2026-06-13 - Codex

- Avaliou o arquivo `frame-system-lovable-light-v2.html` enviado pela Heloisa.
- Conclusao: e uma referencia visual melhor alinhada ao pedido atual
  (light-first premium, denso, operacional, com telas completas de dashboard,
  caixa de entrada, oportunidades, agenda, pacientes, assistente, automacoes,
  disponibilidade/servicos, relatorios e configuracoes).
- Ressalvas: o HTML esta estatico, tem camadas de CSS duplicadas/reescritas e
  varios textos com mojibake/encoding quebrado; deve ser usado como fonte de
  layout, tokens e hierarquia visual, nao colado diretamente no app Next sem
  portar para componentes reais e dados reais.

## 2026-06-11 - Claude Code

- Concluido o plano "Replicar telas novas do Lovable (PDF) no dashboard
  real" (13 telas + sidebar + nova pagina `/design-system`). Resumo dos
  ajustes desta rodada (apos `clientes`, `financeiro`, `followup`,
  `treinamento`, `disponibilidade`, `equipe` ja feitos em rodadas
  anteriores):
  - `integracoes`: `IntegrationTile` reestilizado de card vertical para
    linha horizontal (icone + nome + badge inline + descricao), grid mudou
    de 3 para 2 colunas, e subtitulo do header passou a ser dinamico
    ("X ativa(s) - Conecte suas ferramentas favoritas") calculado a partir
    do status real de WhatsApp/Google Calendar. Nao foram adicionadas
    integracoes ficticias (Instagram, Stripe, Asaas, Mailchimp, Zapier,
    Webhook) que aparecem no PDF mas nao existem no backend.
  - `configuracoes`: **decisao no-op**. O PDF (page-14, "Configuracoes - 10
    secoes") mostra um hub com nav lateral de 10 secoes e campos de
    "Identidade do workspace" (nome da clinica, CNPJ, subdominio, fuso
    horario, moeda, endereco comercial) que nao existem no schema atual
    (`nutritionists`). A pagina atual (Perfil/Seguranca/Notificacoes) ja
    cobre o que tem dados reais; reescrever para o hub completo exigiria
    fabricar 9 das 10 secoes. Mantida como esta.
  - `admin`: **decisao no-op**. O PDF (page-15, "Admin - Infraestrutura e
    auditoria") mostra uptime, eventos criticos, armazenamento, sessoes
    ativas, postura de seguranca, infra (latencia API, replicas de banco,
    jobs pendentes, backup) e log de auditoria - nenhum desses dados existe
    no backend hoje. A pagina atual (aprovacao de nutricionistas/conta
    mestre) ja usa os primitivos "Calm Pro" e cobre a funcionalidade real
    existente. Mantida como esta.
- Validacao: `npx tsc --noEmit` ok apos cada pagina; `npm run build` em
  `apps/dashboard` passou no final (40 rotas geradas, incluindo a nova
  `/design-system`).
- Sem commit/push - aguardando confirmacao da Heloisa (deploy Vercel).

## 2026-06-11 - Codex

- Apos feedback da Heloisa de que o Lovable ainda estava superior e deveria
  ser copiado com mais fidelidade, fez nova rodada de port visual literal do
  `Frame Vision.zip`:
  - `Sidebar.tsx` reescrita no padrao Lovable: 240px desktop, logo FS em
    gradiente, grupos Painel/Operacao/Workspace, botao "Novo", tema
    Dark/Light e usuario real no rodape.
  - `(dashboard)/layout.tsx` e `TopBar.tsx` ajustados para offset de 240px e
    topbar de 56px com busca central e acoes.
  - `finance-primitives.tsx` recriado limpo com os microestados do Lovable
    (white-alpha, green accent, botao primario com texto escuro, KPI limpo).
  - `globals.css` ganhou aliases/utility classes do Frame Vision
    (`--bg-base`, `--bg-elevated`, `--brand-soft`, `gradient-brand-text`,
    `brand-glow`, etc.).
- Validacao: `npm.cmd run build` em `apps/dashboard` passou; local
  `/dashboard` e `/financeiro` responderam 200.

## 2026-06-11 - Codex

- Analisou `C:\Users\Heloisa\Downloads\Frame Vision.zip` (export do Lovable)
  contra o dashboard atual. O sistema ja tinha varias telas portadas,
  inclusive `/financeiro`, mas ainda faltavam detalhes do shell/design system.
- Portou ajustes visuais faltantes sem alterar funcionamento/API:
  - `TopBar.tsx`: visual Lovable com topbar translúcida de 56px, busca
    central, icones Frame AI/ajuda/notificacoes/configuracoes e titulo
    compacto.
  - `(dashboard)/layout.tsx`: padding superior ajustado para a nova topbar.
  - `Sidebar.tsx`: botao rapido "Novo", seletor Dark/Light no rodape,
    fundo `#0E0F11` e marca verde com texto escuro.
  - `globals.css`: tokens escuros aproximados do Frame Vision e surfaces com
    raios 14/12.
  - `finance-primitives.tsx`: botao primario verde com texto escuro como no
    Lovable.
- Validacao: `npm.cmd run build` em `apps/dashboard` passou. Servidor local
  iniciado; `http://localhost:3000/dashboard` e `/financeiro` responderam 200.

## 2026-06-11 - Codex

- Registrou em `MEMORY.md` a decisao sobre Lovable: usar como laboratorio de
  design/UI e portar apenas a camada visual para `apps/dashboard`, mantendo o
  funcionamento atual do Frame System (auth, API, Fastify/Postgres, Evolution
  API, Claude, webhooks e deploy). Recomendado trabalhar via branch/export
  separada, evitando migracao full-stack para Supabase/Lovable neste momento.

## 2026-06-11 - Claude Code (redesign "tudo": agenda + treinamento, fim do ciclo de páginas)

Concluído o pedido "vamos voltar ao design, faça todas as páginas... copiar e
colar" (DNA visual Lovable / Calm Pro) para as duas últimas páginas
pendentes:

- `agenda/page.tsx`: toolbar (prev/hoje/próxima semana, "Bloquear", "Nova
  consulta"), rodapés dos modais `NewAppointmentModal`/`AppointmentModal`/
  `BlockTimeModal` (ações confirmar/realizado/cancelar/bloquear) e botão
  "Salvar" do `LocationsPanel` convertidos para `<Btn>`. Calendário
  (`MiniCalendar`, `WeekView`, `GoogleCalendarCard`, pills de consulta) e o
  grid com posicionamento absoluto foram mantidos como estavam.
- `treinamento/page.tsx`: header padronizado (`font-display` + `var(--t3)`
  no subtítulo). Todos os ~11 botões `.btn-primary`/`.btn-secondary`/
  `.btn-ghost` restantes (entrevista guiada, manual, automações, horários de
  funcionamento, fora do horário, modal de local) convertidos para `<Btn>`.
  Componentes locais já existentes (`SectionCard`, `Field`, `Toggle`,
  `AIPowerToggle`) mantidos sem alteração - já usavam tokens Calm Pro.

`npx tsc --noEmit` em `apps/dashboard` → sem erros.

**Com isso, o redesign "Calm Pro"/Lovable de todas as páginas do dashboard
está concluído**: clientes, perfil, equipe, admin, segurança, servicos
(Planos), configurações, disponibilidade, followup, integrações,
onboarding, agenda e treinamento. Ainda sem commit/push - aguardando
confirmação da usuária antes do deploy (workflow: build → commit → push =
deploy Vercel).

## 2026-06-11 - Claude Code (commit/push do trabalho acumulado)

A pedido da usuária ("PRIORIZE O 2"), todo o trabalho acumulado (plano de
13 itens B.4-C.13 + redesign do dashboard + docs) foi commitado e enviado
para `origin/main` (deploy automático no Vercel):
- `2075f2f` feat(api): cérebro da IA - perfil da assistente, copiloto,
  memória do paciente e logs de conversas (B.4-C.13)
- `73019f5` feat(dashboard): UI para perfil da assistente, copiloto e
  avaliação de conversas + ajustes de proxy/preview
- `da8cdff` docs: instruções de projeto (AGENTS/CLAUDE), memória
  compartilhada e script de dev

`npm run build` em `apps/dashboard` validado antes do push (sem erros).
`.gitignore` atualizado para ignorar `.agents/`, `.tmp-*` e
`apps/dashboard/next-env.d.ts`. Mockups soltos na raiz não foram
versionados (ver MEMORY.md).

## 2026-06-11 - Claude Code (C.13)

- Implementou C.13 (logs/avaliacao de conversas) - ultimo item do plano
  consolidado de 13 itens (13/13 concluidos):
  - `schema.sql`: novo bloco `-- Avaliacao/outcome de conversas (C.13)` -
    `conversations.outcome` (TEXT, nullable), `conversations.outcome_notes`
    (TEXT) e `conversations.closed_at` (TIMESTAMPTZ). Valores sugeridos para
    `outcome`: `agendou | comprou | nao_avancou | sem_resposta | outro`.
  - `conversation.routes.ts`:
    - `POST /:id/resolve` agora aceita body opcional `{ outcome,
      outcome_notes }` e seta `closed_at = NOW()` ao resolver.
    - Nova rota `POST /:id/outcome` - classifica/reclassifica o resultado
      de qualquer conversa (seta `outcome`, `outcome_notes` opcional,
      `closed_at` se ainda nao tiver).
    - Nova rota `GET /api/conversations/stats` - retorna contagens por
      status (`active`, `human_takeover`, `resolved`) e por `outcome`
      (`agendou`, `comprou`, `nao_avancou`, `sem_resposta`, `outro`,
      `sem_classificacao`) para o nutricionista autenticado.
  - `ai.service.ts`: `detectAndCreateAppointment()` agora seta
    `outcome = 'agendou'` e `closed_at = NOW()` junto com
    `status = 'resolved'` quando a IA confirma um agendamento (ja
    classifica automaticamente o desfecho mais comum).
  - `/conversas` (UI):
    - Nova linha de cards de metricas no topo da pagina (Resolvidas,
      Agendamentos, Vendas, Sem retorno) alimentada por `GET
      /api/conversations/stats`.
    - Para conversas com `status = 'resolved'`, novo rodape de
      classificacao: se `outcome` ainda nao definido, mostra botoes
      "Como terminou essa conversa?" (Agendou consulta / Comprou plano /
      Nao avancou / Sem resposta / Outro); se ja definido, mostra badge
      com a classificacao + botao "Alterar classificacao".
  - `tsc --noEmit` ok em `apps/api` e `apps/dashboard`.

## 2026-06-11 - Claude Code

- Implementou C.12 (modo copiloto):
  - `schema.sql`: `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS mode
    TEXT DEFAULT 'auto'` e `ALTER TABLE messages ADD COLUMN IF NOT EXISTS
    pending_send BOOLEAN DEFAULT false`.
  - `ai.service.ts`: `processMessage` agora le `conversations.mode`. Se
    `mode = 'copilot'`, a resposta da IA e salva em `messages` com
    `pending_send = true` e o retorno inclui `pendingApproval: true`.
  - `webhook.routes.ts`: quando `response.pendingApproval` e verdadeiro,
    o webhook retorna sem enviar nada ao paciente (nem texto, nem midia de
    planos, nem mensagem de confirmacao de agendamento). **Limitacao MVP
    conhecida**: no modo copiloto, midia/mensagens de planos e confirmacao
    de agendamento atrelados aquela resposta tambem ficam retidos junto
    com o rascunho - se a nutri aprovar so o texto, esses extras nao sao
    reenviados automaticamente. Avaliar se vale revisar no futuro.
  - `conversation.routes.ts`: 4 novas rotas - `POST /:id/mode` (alterna
    auto/copilot), `PATCH /:id/messages/:messageId` (edita o texto do
    rascunho), `POST /:id/messages/:messageId/approve` (envia via
    `sendMessageForNutri` e zera `pending_send`), `POST
    /:id/messages/:messageId/discard` (deleta o rascunho sem enviar).
  - `/conversas` (UI): botao de alternancia "Modo automatico"/"Modo
    copiloto" no header da conversa selecionada (so aparece quando
    `status = 'active'`); mensagens com `pending_send = true` sao
    renderizadas com borda tracejada verde, label "Rascunho - aguardando
    aprovacao" e botoes Aprovar e enviar / Editar (textarea inline) /
    Descartar.
  - `tsc --noEmit` ok em `apps/api` e `apps/dashboard`. Sem commit/push.
- Corrigiu bug de wiring de B.8/B.9: `conversationExamplesSection` e
  `clinicalRulesSection` eram montadas em `buildSystemPrompt()` mas nunca
  interpoladas no template final do prompt (so `customObjectionsSection`
  era usada). Agora as 3 secoes sao injetadas juntas
  (`${customObjectionsSection}${conversationExamplesSection}${clinicalRulesSection}`)
  em `apps/api/src/services/ai.service.ts`. Sem essa correcao, os campos
  "Exemplos de conversas" e "Regras clinicas" da UI nao tinham efeito real
  na IA.
- Implementou C.11 (memoria estruturada por paciente):
  - `schema.sql`: `ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_memory
    JSONB DEFAULT '{}'`.
  - `client.routes.ts`: `PATCH /:clientId` aceita `ai_memory` (Zod:
    `{restricoes?: string[], preferencias?: string[], observacoes?: string}`),
    salvo via `COALESCE($7::JSONB, ai_memory)`. `GET /:clientId` ja retorna
    via `SELECT *`.
  - `ai.service.ts`: `processMessage` busca `ai_memory` do cliente por
    `nutritionist_id` + `phone` (com try/catch defensivo) e passa para
    `buildSystemPrompt()`. Nova secao "MEMORIA DESTE PACIENTE" injetada
    apos `clinicalRulesSection`.
  - `/clientes/[id]/page.tsx`: novos campos no formulario de edicao
    (Restricoes, Preferencias - textarea uma por linha; Observacoes) e novo
    card de exibicao "Memoria da IA" (chips para restricoes/preferencias +
    paragrafo para observacoes), seguindo o padrao visual do card
    "Anotacoes clinicas".
  - `tsc --noEmit` ok em `apps/api` e `apps/dashboard`. Sem commit/push.
- Plano de 13 itens: 11/13 concluidos (A.1, A.2, B.4-B.10, C.11). Restam C.12
  (modo copiloto) e C.13 (logs/avaliacao de conversas).

## 2026-06-11 - Claude Code

- Concluiu B.7 (Roteiros de venda / objecoes personalizadas), B.8 (Exemplos
  de conversas) e B.9 (Regras clinicas / limites adicionais), e confirmou
  que B.6 (Servicos e precos) ja estava implementado (CRUD completo em
  `services.routes.ts` + pagina `/servicos` + uso em `ai.service.ts`, de um
  commit anterior).
  - Schema (`schema.sql`): `ALTER TABLE assistants ADD COLUMN IF NOT EXISTS
    custom_objections JSONB DEFAULT '[]'`, `conversation_examples JSONB
    DEFAULT '[]'`, `clinical_rules JSONB DEFAULT '[]'`.
  - `assistant.routes.ts`: GET inclui as 3 novas colunas no select primario
    (fallback sem migration continua sem elas, padrao ja existente);
    `assistantSchema` (Zod) aceita `custom_objections` (`{gatilho,
    resposta}[]`), `conversation_examples` (`{situacao, resposta}[]`) e
    `clinical_rules` (`string[]`); bloco `autoUpdates`/`autoParams` salva os
    3 campos com `JSON.stringify`.
  - `ai.service.ts`/`buildSystemPrompt()`: novas secoes condicionais
    "OBJECOES PERSONALIZADAS DESTE CONSULTORIO" (custom_objections),
    "EXEMPLOS DE BOAS RESPOSTAS" (conversation_examples, formato
    situacao/resposta ideal) e "LIMITES CLINICOS ADICIONAIS DESTE
    CONSULTORIO" (clinical_rules), injetadas perto do bloco de objecoes/
    `NUNCA:`.
  - `treinamento/page.tsx` (aba "Configuracoes da assistente"): 3 novos
    campos textarea apos "Frases preferidas" -
    "Objecoes personalizadas" (formato `gatilho :: resposta`, uma por
    linha), "Exemplos de conversas" (formato `situacao :: resposta`, uma
    por linha) e "Regras clinicas / limites adicionais" (uma regra por
    linha). Convencao `::` reaproveitada de B.7 para os campos de pares.
  - `tsc --noEmit` ok em `apps/api` e `apps/dashboard`. Sem commit/push.
  - Plano consolidado de 13 itens: A.1, A.2, B.4, B.5, B.6 (ja existia), B.7,
    B.8, B.9, B.10 concluidos. A.3 e decisao registrada (sem codigo). Restam
    C.11, C.12, C.13 (memoria estruturada por paciente, modo copiloto, logs/
    avaliacao de conversas) - features maiores, nao iniciadas nesta sessao.

## 2026-06-11 - Claude Code

- Implementou item B.5 do plano "cerebro da IA" (consolidar fontes de
  conhecimento) em `apps/dashboard/.../treinamento/page.tsx`:
  - `TRAINING_TABS` perdeu a aba "Entrevista" (agora comeca em "Manual").
  - `ManualSection` ganhou um terceiro modo `'interview'`; a tela "choose"
    agora mostra 3 opcoes (Entrevista guiada / Editar no sistema / Enviar
    PDF) em vez de 2.
  - Ao terminar a entrevista guiada, `onSaved` invalida as queries
    `assistant` e `manual-content` e volta para o modo `editor`, mostrando o
    conteudo compilado pronto para revisao/edicao.
  - `InterviewMode` (compilacao das 5 perguntas -> `pdf_content` via
    `POST /api/assistants/interview`) nao foi alterado internamente, so
    deixou de ser uma aba separada (estava duplicando o destino com
    "Manual").
  - `npx tsc --noEmit` sem erros em `apps/dashboard`. Verificacao visual no
    preview nao foi possivel (`/treinamento` redireciona para `/login`, sem
    credenciais de teste).
  - Nenhum commit/push feito.

## 2026-06-11 - Claude Code

- Implementou item B.4 do plano "cerebro da IA": aba "Assistente" de
  `/treinamento` ganhou secao "Perfil da atendente".
- `apps/api/src/db/schema.sql`: `ALTER TABLE assistants ADD COLUMN IF NOT
  EXISTS farewell_message TEXT`, `frases_proibidas JSONB DEFAULT '[]'`,
  `frases_preferidas JSONB DEFAULT '[]'`.
- `apps/api/src/routes/assistant.routes.ts`: GET /api/assistants (SELECT
  primario) agora retorna os 3 campos novos; Zod schema do POST aceita
  `farewell_message` (string), `frases_proibidas`/`frases_preferidas`
  (array de strings); bloco defensivo `autoUpdates` grava os 3 campos
  (arrays via `JSON.stringify`).
- `apps/api/src/services/ai.service.ts`: `buildSystemPrompt()` agora monta
  `frasesProibidasSection`, `frasesPreferidasSection` e `farewellSection` a
  partir desses campos e injeta no prompt logo apos o `trainingSection`/
  `firstMsgInstruction`.
- `apps/dashboard/.../treinamento/page.tsx` (TabAssistente): novos campos
  "Mensagem de despedida" (textarea), "Frases proibidas" e "Frases
  preferidas" (textarea, uma por linha — convertidas para array no
  `onSubmit`). Interface `Assistant` e `assistantSchema` atualizados.
- `npx tsc --noEmit` sem erros em `apps/api` e `apps/dashboard`. Validacao
  visual no preview nao foi possivel (sem credenciais de teste).
- Nenhum commit/push feito - mudancas ainda nao versionadas.

## 2026-06-11 - Codex

- Tentou criar o carrossel do Instagram no Figma, mas a composicao foi bloqueada pelo limite do Figma MCP do plano Starter.
- O arquivo Figma ficou vazio ao abrir porque o canvas nao recebeu os elementos planejados.
- O preview editavel segue disponivel em `marketing/instagram-carousel-01.html` como referencia temporaria.
## 2026-06-11 - Codex

- Criou o arquivo Figma `Frame System — Instagram Carousel 01` para o primeiro carrossel da marca.
- Estruturou a linguagem visual do post com base na LP do Lovable: tema escuro, grid sutil, brilhos verdes, cards premium e narrativa progressiva de problema -> definicao -> funcionamento -> beneficio -> CTA.
- A montagem do canvas ficou bloqueada pelo limite do Figma MCP no plano Starter antes da composicao final.
- Link do arquivo: https://www.figma.com/design/xLH2potwwNtgzxCbtBRUzr
## 2026-06-11 - Claude Code

- Implementou item B.10 do plano de melhoria do "cerebro" da IA: nova aba
  "Testar atendimento" em `apps/dashboard/src/app/(dashboard)/treinamento/page.tsx`
  (componente `TestarAtendimentoSection`), expondo o endpoint ja existente
  `/api/assistants/test` como simulador de chat (mensagens sugeridas, reset
  de conversa de teste, exibicao da `action` detectada).
- Implementou item A.1: em `apps/api/src/routes/webhook.routes.ts`, quando
  `processMessage` retorna com sucesso mas `response.text` vazio, agora envia
  a mensagem de fallback "Oi! Estou com uma instabilidade aqui..." ao paciente
  (antes ficava em silencio total).
- Implementou item A.2: em `apps/api/src/services/ai.service.ts`,
  `detectAndCreateAppointment()` agora loga um warning quando a resposta da IA
  contem "consulta confirmada" mas nao bate com o regex exato de confirmacao
  (`✅ Consulta confirmada para ... às HH:MM`), para diagnosticar drift do
  prompt sem alterar o fluxo de sucesso.
- `npx tsc --noEmit` sem erros em `apps/dashboard` e `apps/api` apos as
  mudancas. Verificacao visual da aba "Testar atendimento" no preview nao foi
  possivel (preview redireciona para `/login` e nao ha credenciais de teste
  disponiveis no repo).
- Nenhum commit/push feito - mudancas ainda nao versionadas.

## 2026-06-11 - Codex

- Criou no Figma o arquivo `Frame System - Dashboard Screens Lovable Continuation` para continuar a referencia visual do Lovable a partir da Agenda.
- Desenhou 5 telas 1440x960: Agenda, Pacientes, Automacoes, Frame AI e Configuracoes, com sidebar fixa 220px, tema escuro, cards de metricas, paineis operacionais e acentos Frame Green.
- Validou visualmente a tela `Agenda - continuacao Lovable` por screenshot do Figma; layout sem sobreposicoes aparentes.
- Link do arquivo: https://www.figma.com/design/IfIPF3o0iygF4ht0Pp9uWi
## 2026-06-11 â€” Codex

- Criou `apps/dashboard/src/app/preview-dashboard/page.tsx` para mostrar o redesign do dashboard com dados fictÃ­cios, sem autenticaÃ§Ã£o.
- Validou `http://localhost:3000/preview-dashboard` com `200 OK`.
- Rodou `npm.cmd run build` em `apps/dashboard` com sucesso; rota `/preview-dashboard` entrou no build.

## 2026-06-11 â€” Codex

- Corrigiu visualizaÃ§Ã£o local com conta real: adicionou rewrite `/api/:path*` em `apps/dashboard/next.config.js` para proxy em `https://api.framesystem.com.br/api/:path*`.
- Atualizou `run-dashboard-dev.cmd` para iniciar o dashboard local com `NEXT_PUBLIC_API_URL=http://localhost:3000`, evitando bloqueio CORS no login local.
- Reiniciou o servidor local; `/dashboard` respondeu `200 OK` e `/api/auth/me` via localhost chegou na API de produÃ§Ã£o.

## 2026-06-11 â€” Codex

- Criou `run-dashboard-dev.cmd` para iniciar o dashboard local com `npm.cmd run dev`.
- Iniciou o servidor local do dashboard em `http://localhost:3000`; `/dashboard` respondeu `200 OK`.

## 2026-06-11 â€” Codex

- Redesenhou `apps/dashboard/src/app/(dashboard)/dashboard/page.tsx` como central de operaÃ§Ã£o premium: header mais forte, cards de comando, linha do tempo comercial, agenda do dia, saÃºde da assistente IA e cards de prÃ³ximos focos.
- Mantido o shell oficial atual (`Sidebar`/`TopBar`), conforme decisÃ£o registrada; o redesign foi aplicado ao conteÃºdo da pÃ¡gina.
- Validou com `npm.cmd run build` em `apps/dashboard` com sucesso.

## 2026-06-11 â€” Codex

- Testou `http://2.24.97.229:3000/projects/nutriapp/app/api/deployments`: servidor retornou `200 OK` com a SPA base do EasyPanel. A rota direta existe/carrega, mas confirmar a tela interna de deployments exige sessÃ£o autenticada no EasyPanel.

## 2026-06-10 â€” Codex

- Inspecionou `http://2.24.97.229:3000/`: EasyPanel estÃ¡ online e servindo uma SPA administrativa, mas a visÃ£o interna depende de login/sessÃ£o.
- Inspecionou `https://app.framesystem.com.br/`: app Next estÃ¡ online, raiz cai em `/dashboard`, login/cadastro pÃºblicos estÃ£o publicados e rotas internas dependem de autenticaÃ§Ã£o.
- Confirmou que o frontend publicado aponta para `https://api.framesystem.com.br`; `/health` da API respondeu `{"status":"ok","service":"frame-system-api"}`.
- ObservaÃ§Ã£o: o app publicado expÃµe bundle Next em modo `development`/eval, indicado por `buildId: "development"` e avisos de webpack nos chunks.

## 2026-06-10 â€” Codex

- Leu `memoria-compartilhada/` e `CONTEXT.md` para responder Ã  pergunta da usuÃ¡ria sobre o que o projeto estÃ¡ criando.

## 2026-06-10 â€” Claude Code

- Criada a estrutura `memoria-compartilhada/` (`MEMORY.md`, `STATUS.md`,
  `LOG.md`) e atualizados `CLAUDE.md`/`AGENTS.md` na raiz para que ambos os
  agentes leiam essa pasta antes de qualquer tarefa e a atualizem depois.
- Confirmado com a usuÃ¡ria: NÃƒO redesenhar Sidebar/TopBar para bater com
  `mockup-sistema.html` â€” manter shell de navegaÃ§Ã£o atual.
- PendÃªncia aberta: usuÃ¡ria reportou que "todas as pÃ¡ginas" ainda nÃ£o batem
  com o mockup, sem detalhe especÃ­fico. Aguardando print.

## 2026-06-16 - Codex

- Atendeu a revisao da Heloisa sobre pontos que o Claude nao tinha aplicado:
  topbar, sidebar, integracoes, caixa de entrada e pacientes.
- `apps/dashboard/src/components/layout/TopBar.tsx`: removido o titulo fixo
  duplicado no topo (a pagina ja mostra o titulo), removida a engrenagem de
  configuracoes do topo e mantidos apenas atalhos para rotas reais
  (`/treinamento`, `/conversas?filter=unread`, busca levando a `/clientes`).
- `apps/dashboard/src/components/layout/Sidebar.tsx`: reescrita limpa com
  labels sem mojibake, sem badge fake em Caixa de entrada e com
  `/integracoes` no grupo Gestao.
- `apps/dashboard/src/app/(dashboard)/integracoes/page.tsx`: refeita no estilo
  V4 em cards quadrados, com logos reconheciveis; WhatsApp e Google Calendar
  usam status/acoes reais, demais apps aparecem como "Em breve" sem botao de
  conexao falso; importacao CSV/planilha continua funcional.
- `apps/dashboard/src/app/(dashboard)/conversas/page.tsx`: removidos
  fallbacks ficticios de conversas/mensagens; tela agora lista somente dados
  reais, tem empty states e mantem acao real de assumir conversa.
- `apps/dashboard/src/app/(dashboard)/clientes/page.tsx`: removidos pacientes
  ficticios de fallback; busca/filtro front-end sobre dados reais; importacao
  CSV/planilha funcional.
- Validacoes: `npx.cmd tsc --noEmit` em `apps/dashboard` e `apps/api` ok;
  `npm.cmd run build` em `apps/dashboard` ok (40 rotas). Browser interno nao
  abriu por erro de permissao do Windows, portanto sem screenshot local.







