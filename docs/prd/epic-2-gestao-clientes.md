# Epic 2: Gestão de Clientes (Pacientes)

**Status:** Planned  
**Prioridade:** Alta  

## Objetivo

Permitir que o nutricionista cadastre, visualize e gerencie seus pacientes diretamente no dashboard, com acesso ao histórico de consultas e dados relevantes.

## Stories

### Story 2.1 — Listagem e Cadastro de Pacientes

**Como** nutricionista,  
**Quero** visualizar todos os meus pacientes em uma lista e cadastrar novos,  
**Para** ter controle centralizado da minha base de clientes.

**Critérios de Aceitação:**
- [ ] Página `/clientes` com lista de pacientes cadastrados
- [ ] Tabela com: nome, telefone, e-mail, data de cadastro, última consulta
- [ ] Botão "Novo Paciente" abre formulário/modal
- [ ] Formulário: nome*, telefone*, e-mail, data de nascimento, observações
- [ ] Busca por nome ou telefone em tempo real
- [ ] Paginação (20 por página)

**Notas técnicas:**
- `GET /api/clients` — lista paginada com busca
- `POST /api/clients` — cadastrar novo paciente
- Tabela `clients` no banco já deve existir ou será criada

---

### Story 2.2 — Perfil do Paciente

**Como** nutricionista,  
**Quero** visualizar o perfil completo de um paciente,  
**Para** acessar histórico de consultas, dados e evoluções.

**Critérios de Aceitação:**
- [ ] Página `/clientes/[id]` com dados completos do paciente
- [ ] Seções: Dados pessoais | Histórico de consultas | Conversas WhatsApp
- [ ] Editar dados do paciente inline ou via modal
- [ ] Histórico de agendamentos do paciente
- [ ] Botão "Nova Consulta" pré-preenchido com dados do paciente

**Notas técnicas:**
- `GET /api/clients/:id`
- `PUT /api/clients/:id`
- Join com tabela `appointments`

---

### Story 2.3 — Importação de Pacientes via CSV

**Como** nutricionista,  
**Quero** importar minha base de pacientes de uma planilha,  
**Para** não precisar cadastrar um a um manualmente.

**Critérios de Aceitação:**
- [ ] Upload de arquivo CSV com colunas: nome, telefone, e-mail
- [ ] Preview dos dados antes de confirmar importação
- [ ] Validação de formato de telefone e e-mail
- [ ] Relatório de importação: X importados, Y com erro
- [ ] Duplicatas detectadas pelo telefone (opção de atualizar ou pular)
