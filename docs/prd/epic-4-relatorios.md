# Epic 4: Relatórios e Analytics

**Status:** Planned  
**Prioridade:** Baixa  

## Objetivo

Fornecer ao nutricionista visibilidade sobre o desempenho do consultório, engajamento dos pacientes e efetividade da assistente virtual.

## Stories

### Story 4.1 — Dashboard de Métricas

**Como** nutricionista,  
**Quero** ver métricas do meu consultório na página inicial,  
**Para** entender rapidamente como está meu negócio.

**Critérios de Aceitação:**
- [ ] Cards: Total de pacientes | Consultas este mês | Taxa de confirmação | Mensagens respondidas pela IA
- [ ] Gráfico de consultas por semana (últimas 4 semanas)
- [ ] Próximas consultas do dia na home
- [ ] Atualização em tempo real (polling 30s)

---

### Story 4.2 — Relatório de Consultas

**Como** nutricionista,  
**Quero** exportar um relatório das minhas consultas em PDF ou CSV,  
**Para** usar em declarações de renda ou análise de desempenho.

**Critérios de Aceitação:**
- [ ] Filtro por período (data início / data fim)
- [ ] Filtro por status (realizadas, canceladas, agendadas)
- [ ] Exportar em CSV com colunas: data, paciente, telefone, status, duração
- [ ] Exportar em PDF formatado

---

### Story 4.3 — Analytics de Engajamento WhatsApp

**Como** nutricionista,  
**Quero** ver estatísticas de uso do WhatsApp e da assistente IA,  
**Para** entender se os pacientes estão sendo bem atendidos.

**Critérios de Aceitação:**
- [ ] Total de mensagens recebidas por período
- [ ] Taxa de resposta da IA (% respondidas automaticamente)
- [ ] Horários de pico de mensagens
- [ ] Pacientes mais ativos
- [ ] Tempo médio de resposta da IA
