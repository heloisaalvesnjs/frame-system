# NutriApp — Roadmap Completo
**Atualizado:** 2026-05-24  
**Produto:** Frame System SaaS — Assistente IA para Nutricionistas

---

## Status Atual

| Epic | Descrição | Status |
|------|-----------|--------|
| Epic 1 | WhatsApp + IA (Sofia) | ✅ Concluído |
| Epic 2 | Configuração da IA | 🔴 Não iniciado |
| Epic 3 | Agendamento | 🔴 Não iniciado |
| Epic 4 | Follow-up Automático | 🔴 Não iniciado |
| Epic 5 | Dashboard Completo | 🔴 Não iniciado |
| Epic 6 | Design do Sistema | 🔴 Não iniciado |
| Epic 7 | App do Paciente (PWA) | 🔴 Não iniciado |
| Epic 8 | Monetização e Lançamento | 🔴 Não iniciado |
| Epic 9 | Escala | 🔴 Não iniciado |

---

## 🚀 FASE 1 — Lançamento MVP
> **Meta:** Produto pronto para cobrar das primeiras nutricionistas  
> **Prazo estimado:** 3-4 semanas

---

### ✅ Epic 1 — WhatsApp + IA (CONCLUÍDO)
- Sofia respondendo mensagens via WhatsApp (Z-API)
- IA com fallback: Claude Haiku → Groq Llama
- Histórico de conversa salvo por cliente
- Comando `/new` para resetar conversa
- System prompt com psicologia de vendas
- Webhook recebendo e enviando mensagens

---

### 🔴 Epic 2 — Configuração da IA pela Nutricionista
> *Hoje a configuração é manual. A nutri precisa fazer isso sozinha.*

| Story | Descrição | Prioridade |
|-------|-----------|------------|
| 2.1 | Tela de configuração: nome da assistente, tom, bio | 🔴 Alta |
| 2.2 | Horários de funcionamento (Sofia não responde fora do horário) | 🔴 Alta |
| 2.3 | Valores da consulta e formato (presencial/online) | 🔴 Alta |
| 2.4 | Especialidades da nutri (emagrecimento, esportiva, etc.) | 🔴 Alta |
| 2.5 | Perguntas frequentes customizadas | 🟡 Média |
| 2.6 | Modo férias/ausência com mensagem personalizada | 🟡 Média |
| 2.7 | Upload de PDF com instruções detalhadas | 🟡 Média |
| 2.8 | Preview: nutri testa a Sofia antes de ativar | 🟡 Média |

---

### 🔴 Epic 3 — Sistema de Agendamento
> *Bloqueador principal. Sem isso Sofia não fecha consulta com data real.*

| Story | Descrição | Prioridade |
|-------|-----------|------------|
| 3.1 | Nutri configura dias e horários disponíveis | 🔴 Alta |
| 3.2 | Calendário de feriados (nacional + estadual + municipal) | 🔴 Alta |
| 3.3 | Sofia oferece horários reais e confirma com data/hora | 🔴 Alta |
| 3.4 | Visualização de agendamentos no dashboard | 🔴 Alta |
| 3.5 | Notificação para nutri quando consulta for marcada | 🔴 Alta |
| 3.6 | Paciente pode reagendar via WhatsApp | 🟡 Média |
| 3.7 | Integração com Google Agenda | 🟡 Média |
| 3.8 | Bloqueio automático de horários já ocupados | 🔴 Alta |

---

### 🔴 Epic 4 — Follow-up Automático
> *Sofia reengaja leads frios e cuida do pós-venda.*

| Story | Descrição | Prioridade |
|-------|-----------|------------|
| 4.1 | Follow-up de lead frio (sem resposta há X horas) | 🔴 Alta |
| 4.2 | Lembrete de consulta 24h antes | 🔴 Alta |
| 4.3 | Mensagem pós-consulta pedindo feedback | 🟡 Média |
| 4.4 | Cobrança de retorno (paciente sem agendar há X dias) | 🟡 Média |
| 4.5 | Configuração de intervalos e mensagens pela nutri | 🟡 Média |

---

## 🎨 FASE 2 — Produto Premium
> **Meta:** Experiência que justifica preço mais alto e reduz churn  
> **Prazo estimado:** 4-6 semanas após Fase 1

---

### 🔴 Epic 5 — Dashboard Completo
> *A nutri precisa ver o valor do produto todo dia.*

| Story | Descrição | Prioridade |
|-------|-----------|------------|
| 5.1 | Métricas de conversão (leads → agendamentos → consultas) | 🔴 Alta |
| 5.2 | CRM visual: pipeline kanban dos leads | 🔴 Alta |
| 5.3 | Lista de clientes com histórico | 🟡 Média |
| 5.4 | Perfil do paciente (dados, objetivos, histórico) | 🟡 Média |
| 5.5 | Relatório semanal automático (enviado no WhatsApp da nutri) | 🟡 Média |
| 5.6 | Notificações em tempo real (novo lead, consulta marcada) | 🟡 Média |

---

### 🔴 Epic 6 — Design do Sistema
> *Interface atual é funcional mas não é premium. Design vende.*

| Story | Descrição | Prioridade |
|-------|-----------|------------|
| 6.1 | Redesign completo do dashboard (identidade premium) | 🔴 Alta |
| 6.2 | Design system: cores, tipografia, componentes | 🔴 Alta |
| 6.3 | Mobile responsivo (nutri usa no celular) | 🟡 Média |
| 6.4 | Onboarding guiado (nutri configura tudo em 15 min sozinha) | 🔴 Alta |
| 6.5 | Dark mode | 🟢 Baixa |

---

## 📱 FASE 3 — App do Paciente (PWA)
> **Meta:** Entregar valor contínuo ao paciente entre consultas  
> **Prazo estimado:** 6-8 semanas após Fase 2

---

### 🔴 Epic 7 — App do Paciente
> *PWA — acessa pelo celular sem precisar instalar da loja.*

**7A — Infraestrutura**
| Story | Descrição | Prioridade |
|-------|-----------|------------|
| 7.1 | Autenticação por link mágico (sem senha) | 🔴 Alta |
| 7.2 | PWA: manifest, service worker, instalável | 🔴 Alta |
| 7.3 | Banco TACO importado (600+ alimentos brasileiros) | 🔴 Alta |

**7B — Alimentação**
| Story | Descrição | Prioridade |
|-------|-----------|------------|
| 7.4 | Plano alimentar: visualizar dieta por dia/refeição | 🔴 Alta |
| 7.5 | Substituição de alimentos com equivalência calórica | 🔴 Alta |
| 7.6 | Registro do que comeu no dia | 🟡 Média |
| 7.7 | Lista de compras gerada automaticamente | 🟡 Média |
| 7.8 | Receitas compatíveis com o plano | 🟢 Baixa |

**7C — Acompanhamento**
| Story | Descrição | Prioridade |
|-------|-----------|------------|
| 7.9 | Registro de peso e medidas (gráfico de evolução) | 🔴 Alta |
| 7.10 | Check-in semanal (energia, fome, humor, sono) | 🔴 Alta |
| 7.11 | Contador de água com meta diária | 🟡 Média |

**7D — Consultas e Comunicação**
| Story | Descrição | Prioridade |
|-------|-----------|------------|
| 7.12 | Histórico de consultas | 🟡 Média |
| 7.13 | Agendamento de retorno pelo app | 🟡 Média |
| 7.14 | Documentos enviados pela nutri (PDFs, materiais) | 🟡 Média |
| 7.15 | Push notifications (lembretes de refeição e check-in) | 🟡 Média |

---

## 💳 FASE 4 — Monetização e Escala
> **Meta:** Produto que cresce sozinho  
> **Prazo estimado:** Paralelo às outras fases

---

### 🔴 Epic 8 — Monetização e Lançamento

| Story | Descrição | Prioridade |
|-------|-----------|------------|
| 8.1 | Landing page de captação de nutricionistas | 🔴 Alta |
| 8.2 | Planos de assinatura (Basic, Pro, Premium) | 🔴 Alta |
| 8.3 | Integração de pagamento (Stripe ou Pagar.me) | 🔴 Alta |
| 8.4 | Trial de 7 dias automático | 🟡 Média |
| 8.5 | E-mail de onboarding automático | 🟡 Média |
| 8.6 | Página de preços | 🔴 Alta |

---

### 🔴 Epic 9 — Escala Técnica

| Story | Descrição | Prioridade |
|-------|-----------|------------|
| 9.1 | Migração para Meta WhatsApp API oficial | 🟡 Média (fase 2+) |
| 9.2 | Multi-assistente por nutricionista | 🟢 Baixa |
| 9.3 | Plano de IA robusto (Groq Dev + Claude pago) | 🟡 Média |
| 9.4 | Rate limiting e proteção anti-spam | 🟡 Média |
| 9.5 | Logs e monitoramento de erros (Sentry) | 🟡 Média |
| 9.6 | Backups automáticos do banco | 🔴 Alta |

---

## 📊 Visão Geral por Fase

```
FASE 1 — Lançamento MVP          FASE 2 — Premium
─────────────────────            ────────────────
Epic 2: Config da IA      ──→    Epic 5: Dashboard
Epic 3: Agendamento       ──→    Epic 6: Design
Epic 4: Follow-up         ──→    Epic 8: Monetização

FASE 3 — App Paciente            FASE 4 — Escala
─────────────────────            ───────────────
Epic 7: PWA completo      ──→    Epic 9: Infra
                          ──→    Wellts substituído
```

---

## 🎯 Critério de Lançamento (Definition of Done - MVP)

Para cobrar da primeira nutricionista, precisa estar pronto:

- [ ] Epic 2: Nutri configura a Sofia sozinha (horários, valores, especialidade)
- [ ] Epic 3: Sofia agenda com data e hora reais (sem inventar)
- [ ] Epic 4: Follow-up básico (lead frio + lembrete de consulta)
- [ ] Epic 8: Página de vendas + pagamento funcionando
- [ ] Epic 6: Design digno de produto premium

---

## 💡 Diferenciais Competitivos por Fase

| Fase | Diferencial vs Concorrência |
|------|-----------------------------|
| MVP | Sofia no número da nutri + vendedora com psicologia de vendas |
| Fase 2 | Dashboard de conversão que prova ROI todo dia |
| Fase 3 | App do paciente com substituição TACO — nenhum concorrente tem |
| Fase 4 | Stack completo: capta → agenda → acompanha → retém |
