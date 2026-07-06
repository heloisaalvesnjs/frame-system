# Frame System — Painel novo (`apps/painel`): guia de telas para o Lovable

> Objetivo deste documento: dar contexto pro Lovable sobre o que cada tela faz e com o que ela
> conversa, para que ele **não recrie a lógica de dados/autenticação** — só ajude a melhorar o
> visual. Depois que o Lovable terminar, portamos manualmente só a camada visual de volta pra cá
> (mesma prática já usada da última vez com o Lovable).

## Regra de ouro pro Lovable

Este painel já está conectado de verdade a um backend em produção (Frame API + Supabase). Ele
**não** deve:
- Recriar login/autenticação com o próprio Supabase do Lovable
- Inventar dados fake permanentes nas telas (perde a conexão real)
- Mudar a estrutura de rotas Next.js (App Router, route group `(app)`)

Ele **pode e deve**:
- Melhorar cores, espaçamento, tipografia, microinterações, estados de loading/vazio
- Sugerir componentes visuais novos (cards, badges, ícones)
- Deixar mobile/responsivo melhor

## Identidade visual (não mudar os tokens de cor, só usar melhor)

**Modo escuro (padrão):** fundo `#0A0D14`, cards `#111621`, cor de destaque (primary) `#D7FF5B`
(lima vibrante), texto secundário `#9BA39A`, bordas `#262D26`.
**Modo claro:** fundo `#F4F5F0`, cards `#FFFFFF`, destaque `#2E7D32` (verde), bordas `#E2E5DC`.
Fonte: Inter. Sem roxo/lilás — a paleta é toda derivada do verde/lima da marca.

## Telas (rotas)

### `/login`
Login simples (e-mail + senha) contra `POST /api/auth/login`, guarda JWT no localStorage.

### `/` (Visão geral)
**Ainda é mockup** — números e gráficos são de exemplo do template `@efferd/dashboard-3`, não
vêm da API. Pode melhorar o visual livremente, mas não faz sentido conectar dado real ainda
(vamos substituir por métricas de verdade numa próxima fase).

### `/atendimento` e `/agenda`
**Placeholders** — telas de "em construção" com lista do que vai ter (inbox ao vivo e calendário
de consultas). Só visual de placeholder, sem dado real ainda.

### `/pacientes`
Lista real de pacientes/leads (nome, telefone, objetivo, nº de consultas, último contato), busca
por nome/telefone. Vem de `GET /api/clients`.

### `/pacientes/[id]`
Tela de detalhe do paciente: dados de acompanhamento (objetivo, data de retorno, observações) e
**plano alimentar** — o nutricionista monta refeições e adiciona alimentos da tabela TACO
brasileira (base de dados nutricional real), com um painel lateral (`Sheet`) de troca de
alimentos: busca alimento, categoriza por cor (carboidratos/proteínas/gorduras/frutas/vegetais/
laticínios), e calcula a gramatura da troca proporcional à caloria do alimento original.

### `/assistente` (o mais importante — é um hub com sub-abas via `?tab=`)
Aqui é onde o nutricionista configura a assistente de IA que atende no WhatsApp. Sub-abas:
- **Identidade**: nome/tom de voz da IA, mensagens de saudação/despedida, frases preferidas e
  proibidas, toggle "atender 24h" e "pausar IA", e um chat de teste ao vivo com a IA de verdade.
- **Disponibilidade**: calendário mensal — clicar num dia abre um popup pra escolher o local de
  atendimento presencial **e** o horário daquele dia específico (não existe mais um horário fixo
  pra semana toda, porque o nutricionista muda de cidade dia a dia). Também tem uma sub-aba
  "Online" com dias da semana fixos + horário (esse sim é fixo, faz sentido pro atendimento
  online). Os locais no calendário aparecem como badges coloridos.
- **Integrações**: status da conexão do WhatsApp.
- **Conhecimento** e **Serviços e Preços**: ainda são só "em breve" (placeholder), telas não
  construídas ainda.

### `/configuracoes`
Perfil do nutricionista (nome, telefone, especialidade, bio).

## Componentes-chave (não recriar do zero, só estilizar)

- `SectionGroup` (`src/components/section-group.tsx`) — todo bloco de configuração usa esse
  padrão: ícone + título fora do card, conteúdo dentro de um card sem header próprio. Se o
  Lovable mudar isso, tentar manter a mesma ideia (título fora do card).
- `LocationBadge` (`src/components/location-badge.tsx`) — badge de local no calendário: fundo com
  baixa opacidade da cor + ponto sólido + texto na cor.
- `FoodSwapSheet` (`src/components/food-swap-sheet.tsx`) — o painel lateral de troca de
  alimentos.

## O que preservar ao trazer de volta do Lovable

1. `src/lib/api.ts` (cliente HTTP com JWT) — não trocar por fetch direto ao Supabase.
2. `src/lib/use-auth.ts` + `src/components/auth-guard.tsx` — guarda de autenticação.
3. Todas as chamadas `api.get/post/put/delete(...)` dentro de cada página — são os endpoints
   reais da Frame API, listados acima por tela.
4. Estrutura de rotas (`app/(app)/...`, `app/login`).
