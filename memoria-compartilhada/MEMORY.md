# MemÃ³ria Compartilhada â€” Frame System

> ConvenÃ§Ãµes, decisÃµes e pendÃªncias de longo prazo. Lido e atualizado tanto
> pelo Claude Code quanto pelo Codex. Para o que estÃ¡ acontecendo AGORA, veja
> [STATUS.md](STATUS.md). Para o histÃ³rico detalhado de atividades, veja
> [LOG.md](LOG.md).

---

## ConvenÃ§Ãµes ativas

- Design system "Calm Pro" â€” tokens CSS em `apps/dashboard/src/app/globals.css`
  (`--bg`, `--surface`, `--t1/2/3`, `--brand`, etc.) + `tailwind.config.ts`
  (tokens semÃ¢nticos: `bg`, `surface`, `raised`, `border`, `t1`, `t2`, `t3`).
- Header padrÃ£o de pÃ¡gina:
  `<h1 className="font-display font-bold text-[22px] tracking-tight" style={{ color: 'var(--t1)' }}>`
  + `<p className="text-sm mt-0.5" style={{ color: 'var(--t3)' }}>`.
- (SUPERSEDE 2026-06-11) Nova referÃªncia visual completa: prints do "Lovable"
  (tema escuro, sidebar fixa 220px com seÃ§Ãµes "INTELIGÃŠNCIA"/"WORKSPACE",
  headers de pÃ¡gina integrados ao conteÃºdo). UsuÃ¡ria confirmou: "Sim, Ã© a nova
  referÃªncia completa". Tema escuro agora Ã© o padrÃ£o (`ThemeContext.tsx`).
  `Sidebar.tsx` redesenhada: fixa 220px, sempre expandida, com seÃ§Ãµes. Nav:
  principal = Dashboard/Conversas/Agenda/Pacientes; INTELIGÃŠNCIA =
  AutomaÃ§Ãµes/Frame AI; WORKSPACE = Planos/Disponibilidade/Equipe/
  IntegraÃ§Ãµes/ConfiguraÃ§Ãµes. `TopBar.tsx` ajustada para offset 220px (ainda
  nÃ£o removida â€” Lovable integra header ao conteÃºdo da pÃ¡gina, repensar
  pÃ¡gina a pÃ¡gina). `(dashboard)/layout.tsx` ajustado para `ml-[220px]`.
- Workflow de deploy: editar â†’ `npm run build` (em `apps/dashboard`) â†’ commit
  com `Co-Authored-By: <agente> <noreply@anthropic.com>` â†’ `git push origin main`
  (push = deploy no Vercel).

## Checklist de lanÃ§amento (definido pelo Codex em 2026-06-11)

Dividido em 5 frentes. **Item 1 (Produto/Design) ficou com o Claude Code**;
itens 2-5 (infra/deploy, WhatsApp/IA, conta/admin, prÃ©-lanÃ§amento) ficam com
o Codex.

1. **Produto/Design (Claude)**:
   - Finalizar design nas telas: dashboard, conversas, agenda,
     assistente/treinamento, clientes, configuraÃ§Ãµes.
   - Garantir login/cadastro funcionando.
   - Garantir que uma nutri consegue completar o onboarding (perfil,
     assistente, horÃ¡rios, WhatsApp).
   - Testar fluxo completo: lead chama no WhatsApp â†’ IA responde â†’ qualifica
     â†’ agenda â†’ aparece no dashboard.
2. **Infra/Deploy (Codex)**: corrigir build de produÃ§Ã£o (estÃ¡ em modo
   `development`), conferir env vars no EasyPanel/Vercel/Railway, confirmar
   domÃ­nios, rodar migrations, conferir CORS, verificar logs.
3. **WhatsApp/IA (Codex)**: conectar nÃºmero real via Evolution API, testar
   QR Code, webhook, envio de mensagem, prompt da Claude, upload/leitura de
   PDF, fallback da IA.
4. **Conta/Admin (Codex)**: criar conta master, definir aprovaÃ§Ã£o de novas
   nutricionistas, testar cadastro do zero, decidir se cadastro Ã© aberto,
   garantir que pagamento nÃ£o bloqueia o MVP.
5. **Antes do primeiro cliente (Codex)**: checklist de onboarding manual,
   roteiro de venda/demo, termo/privacidade, backup do banco, monitoramento
   de erros, teste com paciente fake, plano B se IA/Evolution cair.

## 2026-06-11 - C.13 concluído: plano de 13 itens 100% feito

- Implementado C.13 (logs/avaliação de conversas), o último item do plano
  consolidado. Resumo (detalhes técnicos completos no LOG.md):
  - `conversations` ganhou `outcome` (TEXT, valores sugeridos: `agendou |
    comprou | nao_avancou | sem_resposta | outro`), `outcome_notes` (TEXT) e
    `closed_at` (TIMESTAMPTZ).
  - `POST /api/conversations/:id/resolve` aceita `{outcome, outcome_notes}`
    opcional; nova `POST /api/conversations/:id/outcome` para
    classificar/reclassificar; nova `GET /api/conversations/stats` com
    contagens por status e por outcome.
  - `detectAndCreateAppointment()` (ai.service.ts) já classifica
    automaticamente `outcome = 'agendou'` quando a IA confirma um
    agendamento.
  - `/conversas`: cards de métricas (Resolvidas/Agendamentos/Vendas/Sem
    retorno) + rodapé de classificação para conversas resolvidas.
- **Plano consolidado de 13 itens (A/B/C): 13/13 concluídos.** A.3 segue
  como decisão registrada sem mudança de código (ver entrada de 2026-06-11
  sobre `ai_training_notes` acima) - pendência de produto a decidir com a
  Heloísa/Codex quando fizer sentido.
- Sem commit/push feito - aguardando revisão da usuária.

## PendÃªncias em aberto

- (2026-06-11) Gap analysis do produto "assistente IA" feito pelo Claude Code
  a partir de checklist enviado pelo Codex. Levantamento tÃ©cnico completo no
  histÃ³rico da conversa do Claude Code. Resumo do que falta, dividido por
  responsÃ¡vel:

  **Codex (infra/IA/CRM/pagamentos/LGPD)**:
  - CRM de pacientes/leads: tabela `clients` nÃ£o tem `status` (lead novo/
    qualificado/agendado/ativo/perdido), `origem`/`source`, `tags` nem
    lembretes. Hoje Ã© tabela "achatada", sem funil.
  - Pagamentos: nenhuma integraÃ§Ã£o com gateway (Stripe/Mercado Pago/Asaas).
    Campos `price`/`payment_info` em `locations` sÃ£o sÃ³ texto informativo,
    nÃ£o processam nada. Sem isso nÃ£o hÃ¡ link de pagamento nem confirmaÃ§Ã£o
    automÃ¡tica.
  - Alerta de desconexÃ£o do WhatsApp: `/api/whatsapp/status` detecta o
    estado, mas nÃ£o hÃ¡ notificaÃ§Ã£o automÃ¡tica pra nutri quando a instÃ¢ncia
    cai (risco de leads "sumirem" silenciosamente).
  - Reagendamento de consulta: nÃ£o existe endpoint dedicado (hoje seria
    cancelar + criar nova appointment).
  - Painel: faltam mÃ©tricas de "leads quentes" (scoring), "pacientes sem
    resposta hÃ¡ X horas", "vendas geradas" e fila de "respostas que
    precisam de aprovaÃ§Ã£o da nutri".
  - LGPD: pÃ¡ginas de privacidade/termos existem, mas faltam endpoints de
    exportaÃ§Ã£o/exclusÃ£o de dados (Art. 18 LGPD) e fluxo de consentimento
    explÃ­cito do paciente.
  - WhatsApp oficial (Meta Cloud API / WABA) e templates aprovados: hoje sÃ³
    existe Evolution API (Baileys, nÃ£o-oficial) â€” avaliar se/quando migrar.
  - VerificaÃ§Ã£o do `N8N_WEBHOOK_URL` em produÃ§Ã£o: confirmar que estÃ¡
    configurado (sem ele o sistema cai num fallback direto sem passar pelo
    n8n).

  **Claude (produto/design, jÃ¡ no checklist do item 1)**:
  - Os pontos de design/UX do checklist (telas, onboarding, fluxo
    WhatsApp â†’ IA â†’ agenda â†’ dashboard) seguem como jÃ¡ descrito no
    "Checklist de lanÃ§amento" acima. Nada novo adicionado por este gap
    analysis alÃ©m do jÃ¡ registrado.

  Prioridades sugeridas pelo Claude Code (maior impacto primeiro): 1) CRM
  com status/funil, 2) Pagamentos, 3) Alerta de desconexÃ£o do WhatsApp.

- (2026-06-10) UsuÃ¡ria reportou que "todas as pÃ¡ginas" ainda nÃ£o batem com
  `mockup-sistema.html`, mas sem especificar qual elemento. Aguardando print
  ou descriÃ§Ã£o mais especÃ­fica antes de seguir com novos ajustes visuais.
- (2026-06-10) ProduÃ§Ã£o verificada por Codex: `app.framesystem.com.br` e
  `api.framesystem.com.br/health` estÃ£o online. O app publicado parece estar
  rodando build Next em modo `development` (`buildId: "development"` nos chunks);
  revisar configuraÃ§Ã£o de build/deploy antes de considerar produÃ§Ã£o pronta.
- (2026-06-10) EasyPanel em `http://2.24.97.229:3000/` estÃ¡ online, mas a visÃ£o
  interna exige login/sessÃ£o da usuÃ¡ria.

## DecisÃµes e histÃ³rico relevante

- (2026-06-11) DireÃ§Ã£o de design premium iniciada no `/dashboard`: priorizar
  "central de operaÃ§Ã£o" (leads, agenda, conversas, IA, riscos e prÃ³ximos focos)
  em vez de dashboard genÃ©rico de mÃ©tricas. PrÃ³ximas telas candidatas para a
  mesma linguagem: `/conversas`, `/treinamento` e `/agenda`.
- (2026-06-10) Confirmado: NÃƒO redesenhar sidebar/topbar para o formato do
  mockup (220px fixa com texto sempre visÃ­vel, sem topbar). Manter shell atual.
- (2026-06-10) Criada a pasta `memoria-compartilhada/` para Claude Code e
  Codex ficarem cientes do que um e outro estÃ£o fazendo. Estrutura:
  `MEMORY.md` (convenÃ§Ãµes/decisÃµes), `STATUS.md` (trabalho em andamento agora),
  `LOG.md` (histÃ³rico cronolÃ³gico de atividades de cada agente).

---

## Como adicionar uma entrada

```
## (AAAA-MM-DD) TÃ­tulo curto
Contexto / decisÃ£o / o que mudou.
```

## 2026-06-11 - Progresso no plano "cerebro da IA" (Claude Code)

Continuação do gap analysis de 2026-06-11 (plano consolidado de 13 itens,
categorias A/B/C). Concluído nesta sessão:

- **B.10 (Aba "Testar atendimento")**: implementada em `treinamento/page.tsx`
  como `TestarAtendimentoSection`, usando o endpoint já existente
  `POST /api/assistants/test`.
- **A.1 (Fallback de resposta vazia)**: `webhook.routes.ts` agora envia a
  mensagem padrão de instabilidade ao paciente quando `processMessage`
  retorna sucesso mas com `text` vazio (antes era silêncio total).
- **A.2 (Confirmação de agendamento robusta)**: `detectAndCreateAppointment()`
  em `ai.service.ts` agora loga `console.warn` quando a resposta da IA contém
  "consulta confirmada" mas não bate com o regex exato
  `/✅ Consulta confirmada para (.+) às (\d{2}:\d{2})/i`. Não altera o fluxo
  de sucesso — apenas torna visível em log o drift de prompt.

**A.3 — análise de `ai_training_notes` (decisão registrada, sem código
alterado)**:
- A tabela `ai_training_notes` (schema.sql linha ~360) é **global** (sem
  `nutritionist_id`) e o endpoint `POST /api/assistants/training`
  (`assistant.routes.ts` linha ~379) só exige `auth` (qualquer nutri
  autenticado), sem checagem de admin/role.
- **Achado importante**: a UI atual de `/treinamento` (`page.tsx`) **não
  chama** `/api/assistants/training` em lugar nenhum — é infraestrutura da
  "Epic 10" que ficou órfã/não conectada ao frontend.
- **Decisão sugerida**: como ninguém está escrevendo nessa tabela hoje, não
  há risco ativo de uma nutri sobrescrever o comportamento de outra. Duas
  opções para o futuro, a definir com a Heloísa/Codex:
  1. Reaproveitar como camada global de "boas práticas" (somente leitura para
     nutris, escrita restrita a admin) — alinhado ao texto original do Epic 10.
  2. Migrar para `nutritionist_id` (adicionar coluna + filtrar por tenant) se
     a intenção é cada nutri ter suas próprias notas de treinamento.
  Se a opção 2 for escolhida, **também restringir `POST /training` por role**
  — hoje qualquer usuário autenticado pode inserir uma nota que entra no
  prompt de produção de todas as IAs (`ai.service.ts` linha 236).

**Gaps de schema confirmados para B.4-B.9** (próxima fase, ainda não
implementada):
- `assistants` (schema.sql linha 28-41) tem `name`, `tone`, `greeting_message`
  mas **não tem** `farewell_message` (despedida) nem campos de
  `frases_preferidas` / `frases_proibidas` — necessários para a aba
  "Perfil da atendente" (B.4).
- Roteiros de venda (objeções, fluxo de 4 passos) hoje estão **hardcoded** no
  prompt/lógica de `ai.service.ts` — para B.7 será preciso extrair isso para
  uma estrutura editável (tabela ou JSONB em `assistants`).
- Não existe tabela de "exemplos de conversas" (B.8) nem de "regras
  clínicas" editáveis (B.9) — hoje os limites clínicos também são texto fixo
  no prompt.

## 2026-06-11 - B.4 concluído + estado do plano de 13 itens

**B.4 (Aba "Perfil da atendente") concluído** — ver LOG.md para detalhes
técnicos completos. Resumo: novos campos `farewell_message`,
`frases_proibidas`, `frases_preferidas` em `assistants` (schema.sql,
JSONB para os arrays), expostos em GET/POST `/api/assistants`, injetados em
`buildSystemPrompt()` e editáveis em `/treinamento` (aba "Configurações da
assistente"). `tsc --noEmit` ok em api e dashboard. Sem commit/push.

**Estado do plano consolidado de 13 itens (A/B/C)**:
- Concluídos: B.10, A.1, A.2, B.4.
- A.3: decisão registrada (ver entrada de 2026-06-11 acima), sem código
  alterado — aguardando decisão de produto sobre `ai_training_notes`.
- Pendentes (não iniciados): B.5 (consolidar fontes de conhecimento), B.6
  (Serviços e preços), B.7 (Roteiros de venda/Playbooks), B.8 (Exemplos de
  conversas), B.9 (Regras clínicas/Limites), C.11 (Memória estruturada por
  paciente), C.12 (Modo copiloto), C.13 (Logs/avaliação de conversas).

**Observação para B.5**: ao investigar, a aba "Manual" de `/treinamento`
(`ManualSection`, page.tsx ~linha 453) já unifica edição manual e upload de
PDF num único fluxo (escreve em `pdf_content` via `POST
/api/assistants/interview`). A aba "Entrevista" (`InterviewMode`) também
parece alimentar o mesmo destino. B.5 provavelmente é sobre integrar/clarear
a relação entre essas duas abas e a tabela `ai_training_notes` (ver análise
A.3) — vale revisar as duas implementações lado a lado antes de decidir se
B.5 é uma fusão de UI ou uma mudança de schema.

## 2026-06-11 - B.5 concluído (consolidar fontes de conhecimento)

`/treinamento`: aba "Entrevista" deixou de existir como tab top-level.
`ManualSection` agora tem 3 modos na tela inicial: "Entrevista guiada"
(`InterviewMode`), "Editar no sistema" (template manual) e "Enviar PDF" —
todos escrevem no mesmo destino (`pdf_content` via `/api/assistants/interview`
ou `/api/assistants/upload-pdf`). `TRAINING_TABS` agora é `[manual,
automacoes, testar]`. `tsc --noEmit` ok. Ver LOG.md para detalhes.

**Estado do plano de 13 itens**: concluídos B.10, A.1, A.2, B.4, B.5. A.3
decisão registrada (sem código). Pendentes: B.6 (Serviços e preços), B.7
(Roteiros de venda), B.8 (Exemplos de conversas), B.9 (Regras clínicas),
C.11-C.13 (memória/copiloto/logs).

## 2026-06-11 - Figma Lovable continuation

Arquivo Figma de referencia criado para continuar o redesign do Lovable a partir de Agenda: https://www.figma.com/design/IfIPF3o0iygF4ht0Pp9uWi. Contem telas 1440x960 para Agenda, Pacientes, Automacoes, Frame AI e Configuracoes, com sidebar fixa 220px, tema escuro e acentos Frame Green.


## 2026-06-11 - C.12 (modo copiloto) concluido, resta C.13

- Implementado "modo copiloto": `conversations.mode` ('auto'|'copilot') e
  `messages.pending_send` (bool). Em modo copiloto a IA gera a resposta mas
  ela fica como rascunho (`pending_send=true`) ate a nutri aprovar/editar/
  descartar em `/conversas`. Novas rotas em `conversation.routes.ts`:
  `POST /:id/mode`, `PATCH /:id/messages/:messageId`, `POST
  /:id/messages/:messageId/approve`, `POST /:id/messages/:messageId/discard`.
  Detalhes tecnicos completos em LOG.md.
- **Limitacao MVP conhecida (documentar para Codex)**: quando uma resposta
  fica pendente em modo copiloto, midia de planos, mensagem pos-midia e
  confirmacao de agendamento atrelados aquela resposta NAO sao enviados nem
  ficam pendentes separadamente - sao perdidos se a nutri so aprovar o texto.
  Se o modo copiloto for usado em producao com fluxos de venda/agendamento,
  vale revisar essa logica (ex.: tambem persistir esses extras como parte do
  rascunho).
- Plano consolidado de 13 itens: **12/13 concluidos**. Falta apenas **C.13**
  (logs/avaliacao de conversas) - feature maior, recomendado planejar
  separadamente com a Heloisa/Codex (provavelmente nova tabela de
  avaliacoes + UI de historico/metricas de conversas).

## 2026-06-11 - Plano "cerebro da IA": B.6-B.9 concluidos, restam C.11-C.13

- B.6 (Servicos e precos) **ja estava pronto** desde commit anterior:
  `apps/api/src/routes/services.routes.ts` (CRUD completo + `modality`),
  pagina `/servicos`, e `ai.service.ts` ja consome `services` filtrando por
  modalidade no prompt.
- B.7, B.8 e B.9 implementados nesta sessao seguindo o padrao de B.4: novas
  colunas JSONB em `assistants` (`custom_objections`, `conversation_examples`,
  `clinical_rules`), expostas em GET/POST `/api/assistants`, injetadas em
  `buildSystemPrompt()` e editaveis em `/treinamento` (aba "Configuracoes da
  assistente"). Convencao de UI: pares `chave :: valor` numa textarea (uma
  linha por item), listas simples = uma linha por item.
- Plano consolidado de 13 itens: **10/13 concluidos** (A.1, A.2, B.4-B.10).
  A.3 ficou como decisao registrada sem mudanca de codigo (ver entrada
  anterior sobre `ai_training_notes`). **Pendente**: C.11 (memoria
  estruturada por paciente), C.12 (modo copiloto), C.13 (logs/avaliacao de
  conversas) - sao features maiores que precisam de planejamento proprio
  (provavelmente novas tabelas + UI dedicada), recomendado tratar como
  proxima fase/projeto separado com a Heloisa e o Codex.
