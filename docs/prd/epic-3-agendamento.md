# Epic 3: Agendamento Online

**Status:** Planned  
**Prioridade:** Média  

## Objetivo

Permitir que pacientes agendem consultas de forma autônoma, via link público ou pelo WhatsApp, reduzindo a carga administrativa do nutricionista.

## Stories

### Story 3.1 — Configuração de Disponibilidade

**Como** nutricionista,  
**Quero** configurar meus horários disponíveis para consultas,  
**Para** que pacientes possam agendar apenas nos horários corretos.

**Critérios de Aceitação:**
- [ ] Configuração de dias da semana com horário de início e fim
- [ ] Duração padrão da consulta (ex: 50 minutos)
- [ ] Intervalo entre consultas (ex: 10 minutos)
- [ ] Exceções: bloquear datas/horários específicos
- [ ] Visualização da grade de disponibilidade

---

### Story 3.2 — Link Público de Agendamento

**Como** paciente,  
**Quero** acessar um link público e escolher um horário disponível,  
**Para** agendar minha consulta sem precisar ligar ou enviar mensagem.

**Critérios de Aceitação:**
- [ ] URL pública: `/agendar/[slug-nutricionista]`
- [ ] Calendário com horários disponíveis
- [ ] Formulário: nome, telefone, e-mail, observações
- [ ] Confirmação por WhatsApp após agendamento
- [ ] E-mail de confirmação (opcional)
- [ ] Agendamento aparece na agenda do nutricionista

---

### Story 3.3 — Agendamento via WhatsApp (IA)

**Como** paciente,  
**Quero** agendar minha consulta pelo WhatsApp conversando com a assistente,  
**Para** agendar de forma natural sem precisar acessar um link.

**Critérios de Aceitação:**
- [ ] Paciente pede para agendar pelo WhatsApp
- [ ] IA pergunta data e horário preferidos
- [ ] IA verifica disponibilidade em tempo real
- [ ] IA confirma o agendamento e registra no sistema
- [ ] Nutricionista recebe notificação do novo agendamento

---

### Story 3.4 — Gestão de Agendamentos pelo Nutricionista

**Como** nutricionista,  
**Quero** confirmar, reagendar ou cancelar consultas direto da agenda,  
**Para** ter controle total sobre minha programação.

**Critérios de Aceitação:**
- [ ] Ações disponíveis: Confirmar | Cancelar | Reagendar
- [ ] Notificação automática ao paciente via WhatsApp ao alterar status
- [ ] Motivo de cancelamento (opcional)
- [ ] Sugestão de novo horário ao cancelar
