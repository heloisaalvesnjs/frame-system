-- ================================
-- FRAME SYSTEM — Schema PostgreSQL
-- ================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------
-- Nutricionistas (tenants)
-- --------------------------------
CREATE TABLE IF NOT EXISTS nutritionists (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  specialty     TEXT,
  bio           TEXT,
  avatar_url    TEXT,
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  plan          TEXT DEFAULT 'trial',        -- trial | active | suspended
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------
-- Assistentes IA (1 por nutricionista)
-- --------------------------------
CREATE TABLE IF NOT EXISTS assistants (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id     UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,          -- ex: "Ana", "Julia"
  tone                TEXT DEFAULT 'acolhedor', -- acolhedor | formal | descontraido
  greeting_message    TEXT,                  -- mensagem de boas-vindas customizada
  pdf_path            TEXT,                  -- caminho do PDF com instruções
  pdf_content         TEXT,                  -- conteúdo extraído do PDF
  system_prompt       TEXT,                  -- prompt compilado (pdf + perfil + regras)
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nutritionist_id)
);

-- --------------------------------
-- Conexões WhatsApp
-- --------------------------------
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id     UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  instance_name       TEXT UNIQUE NOT NULL,   -- nome da instância na Evolution API
  phone_number        TEXT,
  status              TEXT DEFAULT 'disconnected', -- disconnected | connecting | connected
  qr_code             TEXT,
  connected_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nutritionist_id)
);

-- --------------------------------
-- Horários disponíveis
-- --------------------------------
CREATE TABLE IF NOT EXISTS availability (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id     UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  day_of_week         INT NOT NULL,            -- 0=Dom, 1=Seg ... 6=Sab
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  slot_duration       INT DEFAULT 60,          -- duração em minutos
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------
-- Clientes (pacientes)
-- --------------------------------
CREATE TABLE IF NOT EXISTS clients (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id     UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  name                TEXT,
  phone               TEXT NOT NULL,           -- número WhatsApp
  email               TEXT,
  goal                TEXT,                    -- objetivo: emagrecer, ganhar massa, etc.
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nutritionist_id, phone)
);

-- --------------------------------
-- Consultas / Agendamentos
-- --------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id     UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  scheduled_at        TIMESTAMPTZ NOT NULL,
  duration            INT DEFAULT 60,          -- em minutos
  modality            TEXT DEFAULT 'online',   -- online | presencial
  status              TEXT DEFAULT 'scheduled', -- scheduled | confirmed | cancelled | completed
  notes               TEXT,
  created_by          TEXT DEFAULT 'assistant', -- assistant | nutritionist
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------
-- Conversas (agrupador de mensagens)
-- --------------------------------
CREATE TABLE IF NOT EXISTS conversations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id     UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  client_id           UUID REFERENCES clients(id),
  client_phone        TEXT NOT NULL,
  status              TEXT DEFAULT 'active',   -- active | resolved | human_takeover
  context             JSONB DEFAULT '{}',      -- contexto acumulado da conversa
  last_message_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------
-- Mensagens
-- --------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role                TEXT NOT NULL,           -- user | assistant | system
  content             TEXT NOT NULL,
  whatsapp_message_id TEXT,                   -- ID original da mensagem no WhatsApp
  sent_at             TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------
-- Índices para performance
-- --------------------------------
CREATE INDEX IF NOT EXISTS idx_conversations_nutritionist ON conversations(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(client_phone);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_appointments_nutritionist ON appointments(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(nutritionist_id, phone);

-- --------------------------------
-- Trigger: updated_at automático
-- --------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_nutritionists_updated BEFORE UPDATE ON nutritionists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_assistants_updated BEFORE UPDATE ON assistants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_whatsapp_updated BEFORE UPDATE ON whatsapp_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------
-- Epic 2: Configuração da IA (migration safe)
-- --------------------------------
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS consultation_price TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS consultation_modalities TEXT DEFAULT 'online';
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS specialties TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS vacation_mode BOOLEAN DEFAULT false;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS vacation_message TEXT;
-- Quando true, a IA responde no WhatsApp 24h, ignorando o horário de
-- funcionamento configurado em Disponibilidade (que continua valendo
-- só para a agenda de consultas).
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS ai_24h BOOLEAN DEFAULT false;

-- --------------------------------
-- Epic 3: Agendamento
-- --------------------------------
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

-- --------------------------------
-- Epic 4: Follow-up Automático
-- --------------------------------
ALTER TABLE conversations  ADD COLUMN IF NOT EXISTS last_followup_at TIMESTAMPTZ;
ALTER TABLE assistants     ADD COLUMN IF NOT EXISTS followup_enabled BOOLEAN DEFAULT true;
ALTER TABLE assistants     ADD COLUMN IF NOT EXISTS followup_delay_hours INT DEFAULT 4;

-- --------------------------------
-- Epic 5: Dashboard Completo
-- --------------------------------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birthdate DATE;
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(nutritionist_id, created_at);
CREATE INDEX IF NOT EXISTS idx_appointments_created  ON appointments(nutritionist_id, created_at);

-- --------------------------------
-- Auth completo: mestre, aprovação, convites
-- --------------------------------

-- Status e conta mestre para nutricionistas
ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
  -- 'pending' | 'active' | 'suspended'
ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT false;

-- Contas próprias dos pacientes (email/phone + senha)
CREATE TABLE IF NOT EXISTS patient_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  phone           TEXT NOT NULL,
  email           TEXT,
  password_hash   TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nutritionist_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_patient_accounts_phone ON patient_accounts(phone);

-- Códigos de convite (nutri gera, paciente usa para criar conta)
CREATE TABLE IF NOT EXISTS patient_invite_codes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  code            TEXT UNIQUE NOT NULL,       -- 6 chars alfanumérico maiúsculo
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  used_by         UUID REFERENCES patient_accounts(id) ON DELETE SET NULL,
  used_at         TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,       -- 7 dias
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON patient_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_nutri ON patient_invite_codes(nutritionist_id);

-- --------------------------------
-- Epic 7: App do Paciente
-- --------------------------------

-- Magic-link tokens (one-time, 72h)
CREATE TABLE IF NOT EXISTS patient_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patient_tokens_token ON patient_tokens(token);

-- Registro de peso e medidas
CREATE TABLE IF NOT EXISTS weight_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  weight_kg  NUMERIC(5,2),
  waist_cm   NUMERIC(5,1),
  hip_cm     NUMERIC(5,1),
  notes      TEXT,
  logged_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_weight_logs_client ON weight_logs(client_id, logged_at DESC);

-- Registro de consumo de água (por entrada, não agrupado)
CREATE TABLE IF NOT EXISTS water_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount_ml  INT NOT NULL DEFAULT 250,
  logged_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_water_logs_client ON water_logs(client_id, logged_at DESC);

-- Registro de atividade física
CREATE TABLE IF NOT EXISTS activity_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  activity_type    TEXT NOT NULL,
  duration_minutes INT,
  notes            TEXT,
  logged_at        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_client ON activity_logs(client_id, logged_at DESC);

-- Check-in semanal (1 por semana por paciente)
CREATE TABLE IF NOT EXISTS weekly_checkins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,
  hunger_score  INT CHECK (hunger_score BETWEEN 1 AND 5),
  energy_score  INT CHECK (energy_score BETWEEN 1 AND 5),
  sleep_score   INT CHECK (sleep_score BETWEEN 1 AND 5),
  mood_score    INT CHECK (mood_score BETWEEN 1 AND 5),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, week_start)
);
CREATE INDEX IF NOT EXISTS idx_checkins_client ON weekly_checkins(client_id, week_start DESC);

-- --------------------------------
-- Epic 9: Plano Alimentar, Documentos, Chat direto
-- --------------------------------

-- Plano alimentar (nutri cria, paciente visualiza)
CREATE TABLE IF NOT EXISTS meal_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title           TEXT NOT NULL DEFAULT 'Plano Alimentar',
  meals           JSONB NOT NULL DEFAULT '[]',  -- [{id,name,time,items[],notes}]
  notes           TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nutritionist_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_meal_plans_client ON meal_plans(nutritionist_id, client_id);

-- Documentos enviados pela nutricionista ao paciente
CREATE TABLE IF NOT EXISTS patient_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  filename        TEXT NOT NULL,
  original_name   TEXT NOT NULL,
  mimetype        TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes      INTEGER DEFAULT 0,
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patient_docs_client ON patient_documents(nutritionist_id, client_id);

-- Chat direto nutricionista ↔ paciente (sem IA)
CREATE TABLE IF NOT EXISTS patient_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  from_role       TEXT NOT NULL CHECK (from_role IN ('patient', 'nutritionist')),
  content         TEXT NOT NULL,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patient_messages_chat ON patient_messages(nutritionist_id, client_id, created_at);

-- --------------------------------
-- Epic 10: Treinamento Universal da IA
-- --------------------------------

-- Notas de treinamento globais (aplicadas a todos os consultórios)
CREATE TABLE IF NOT EXISTS ai_training_notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category   TEXT NOT NULL DEFAULT 'geral',  -- geral | abertura | objecoes | agendamento | tom
  content    TEXT NOT NULL,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_training_notes_active ON ai_training_notes(is_active, created_at);

-- --------------------------------
-- Migrations (additive columns)
-- --------------------------------
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birthdate DATE;
ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS is_master BOOLEAN DEFAULT false;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS service_plans TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS nutri_display_name TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS training_form JSONB;
-- Serviços estruturados do consultório
CREATE TABLE IF NOT EXISTS services (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  category        TEXT DEFAULT 'Consulta',
  price           TEXT,
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_services_nutri ON services(nutritionist_id, is_active);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS height_cm NUMERIC(5,1);
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS emoji_level INT DEFAULT 3;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS followup_message_1 TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS followup_message_2 TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS func_prospeccao BOOLEAN DEFAULT true;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS func_triagem BOOLEAN DEFAULT true;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS func_agendamento BOOLEAN DEFAULT true;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS services_message TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS services_message_enabled BOOLEAN DEFAULT false;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS ai_paused BOOLEAN DEFAULT false;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS plans_media_path TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS plans_media_type TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS plans_media_enabled BOOLEAN DEFAULT false;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS plans_media_original_name TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS plans_media JSONB DEFAULT '{}';
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS services_message_online TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS services_message_online_enabled BOOLEAN DEFAULT false;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS services_message_presencial TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS services_message_presencial_enabled BOOLEAN DEFAULT false;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS farewell_message TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS frases_proibidas JSONB DEFAULT '[]';
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS frases_preferidas JSONB DEFAULT '[]';
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS custom_objections JSONB DEFAULT '[]';
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS conversation_examples JSONB DEFAULT '[]';
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS clinical_rules JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS modality TEXT DEFAULT 'presencial';

-- ── Locais de atendimento ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  city            TEXT,
  address         TEXT,
  color           TEXT DEFAULT '#6366f1',
  is_active       BOOLEAN DEFAULT true,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Bloqueios de agenda ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_blocks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS duration INT DEFAULT 50;

-- ── Disponibilidade semanal (garante a tabela com todos os campos) ───────────
ALTER TABLE availability ADD COLUMN IF NOT EXISTS slot_duration INT DEFAULT 60;
ALTER TABLE availability ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- ── Locais de atendimento: campos de confirmação ──────────────────────────
ALTER TABLE locations ADD COLUMN IF NOT EXISTS price TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS payment_info TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS deposit_amount TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS confirmation_message TEXT;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS modality TEXT DEFAULT 'presencial';

-- ── Agendamento: campo de cidade escolhida pela IA ────────────────────────
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS city TEXT;

-- ── Disponibilidade: pausa (almoço etc) ───────────────────────────────────
ALTER TABLE availability ADD COLUMN IF NOT EXISTS break_start TIME;
ALTER TABLE availability ADD COLUMN IF NOT EXISTS break_end   TIME;

-- ── Datas bloqueadas (feriados / dias sem atendimento) ────────────────────
CREATE TABLE IF NOT EXISTS blocked_dates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  blocked_date    DATE NOT NULL,
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (nutritionist_id, blocked_date)
);

-- ── Tokens de recuperação de senha ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── n8n: sequência de follow-up configurável por nutri ───────────────────────
-- Substitui os campos fixos followup_message_1/2 — permite N etapas com delay próprio
CREATE TABLE IF NOT EXISTS followup_sequences (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  step_order      INT NOT NULL DEFAULT 1,      -- ordem: 1, 2, 3...
  delay_hours     NUMERIC(5,1) NOT NULL DEFAULT 4, -- horas após a última mensagem do cliente
  message         TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (nutritionist_id, step_order)
);
CREATE INDEX IF NOT EXISTS idx_followup_seq_nutri ON followup_sequences(nutritionist_id, step_order);

-- Campos de retorno e pós-consulta no assistente
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS retorno_message TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS retorno_days    INT DEFAULT 30;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS pos_consulta_message TEXT;

-- Rastreamento de envios automáticos em appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_phone        TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS return_message_sent BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS pos_consulta_sent   BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS completed_at        TIMESTAMPTZ;

-- Rastreamento de qual etapa de follow-up foi enviada na conversa
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS followup_step INT DEFAULT 0;

-- webhook_integrations mantida apenas para compatibilidade (não usada pelo n8n interno)
CREATE TABLE IF NOT EXISTS webhook_integrations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'n8n',
  webhook_url     TEXT NOT NULL,
  secret          TEXT,
  events          TEXT[] NOT NULL DEFAULT '{}',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Memória estruturada por paciente (C.11) ──
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_memory JSONB DEFAULT '{}';

-- ── Modo copiloto (C.12) ──
-- mode: 'auto' (IA responde direto) | 'copilot' (IA gera rascunho para aprovação da nutri)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'auto';
-- pending_send: true quando a mensagem é um rascunho da IA aguardando aprovação (modo copiloto)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS pending_send BOOLEAN DEFAULT false;

-- ── Avaliação/outcome de conversas (C.13) ──
-- outcome: resultado da conversa: 'agendou' | 'comprou' | 'nao_avancou' | 'sem_resposta' | 'outro'
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS outcome_notes TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Google Calendar integration
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id   UUID UNIQUE REFERENCES nutritionists(id) ON DELETE CASCADE,
  access_token      TEXT NOT NULL,
  refresh_token     TEXT NOT NULL,
  token_expiry      TIMESTAMP,
  calendar_id       TEXT DEFAULT 'primary',
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- ── Funil de oportunidades (pipeline comercial) ──
-- stage: etapa do funil de cada cliente/lead
--   novo_contato | em_atendimento | qualificado | avaliando |
--   agendamento_pendente | consulta_marcada | perdido
ALTER TABLE clients ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'novo_contato';
-- source: origem do contato (ex: 'Site', 'Instagram', 'Indicação', 'WhatsApp')
ALTER TABLE clients ADD COLUMN IF NOT EXISTS source TEXT;
-- estimated_value: valor estimado da oportunidade (preenchido a partir do serviço de interesse)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(10,2);
-- stage_updated_at: quando a etapa mudou pela última vez (usado para "há X min/h" no Kanban)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS stage_updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_clients_stage ON clients(nutritionist_id, stage);

-- --------------------------------
-- Local de atendimento por dia da semana
-- --------------------------------
ALTER TABLE availability ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id) ON DELETE SET NULL;

-- --------------------------------
-- Local de atendimento por data específica (sobrepõe o padrão semanal)
CREATE TABLE IF NOT EXISTS date_location_overrides (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  location_id     UUID REFERENCES locations(id) ON DELETE SET NULL,
  UNIQUE(nutritionist_id, date)
);
CREATE INDEX IF NOT EXISTS idx_date_loc_overrides ON date_location_overrides(nutritionist_id, date);

-- (2026-07-06) Horário por dia específico. A config semanal de `availability`
-- deixou de fazer sentido pro David (horário muda de local pra local, dia a
-- dia) — agora o nutri define local E horário no mesmo clique no calendário.
-- NULL nesses campos = usa o horário padrão (08:00-18:00, 30min) como fallback.
ALTER TABLE date_location_overrides ADD COLUMN IF NOT EXISTS start_time    TIME;
ALTER TABLE date_location_overrides ADD COLUMN IF NOT EXISTS end_time      TIME;
ALTER TABLE date_location_overrides ADD COLUMN IF NOT EXISTS slot_duration INT;
-- (2026-07-10) Pausa de almoço no presencial (o online já tinha online_break_*)
ALTER TABLE date_location_overrides ADD COLUMN IF NOT EXISTS break_start   TIME;
ALTER TABLE date_location_overrides ADD COLUMN IF NOT EXISTS break_end     TIME;

-- ── Membros de equipe (assistentes, recepcionistas, viewers) ──────────────────
-- CREATE TABLE precisa vir antes dos ALTER TABLE team_members abaixo.
CREATE TABLE IF NOT EXISTS team_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  name            TEXT,
  email           TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'receptionist',   -- admin | receptionist | viewer
  status          TEXT NOT NULL DEFAULT 'pending',        -- pending | active
  invite_token    TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  password_hash   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nutritionist_id, email)
);
CREATE INDEX IF NOT EXISTS idx_team_members_nutri ON team_members(nutritionist_id);

DO $$ BEGIN
  CREATE TRIGGER trg_team_members_updated BEFORE UPDATE ON team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Reset de senha para membros de equipe
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMPTZ;

-- Regras de agendamento (por nutricionista)
-- --------------------------------
-- Formulários de onboarding
CREATE TABLE IF NOT EXISTS onboarding_forms (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug         TEXT NOT NULL,
  data         JSONB NOT NULL DEFAULT '{}',
  processed    BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS buffer_between_minutes  INT DEFAULT 10;
ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS min_advance_hours        INT DEFAULT 3;
ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS max_appointments_per_day INT DEFAULT 8;

-- ── Atendimento online: agenda propria (2026-07-05) ─────────────────────────
-- O presencial e definido por data+cidade (date_location_overrides). O online
-- precisava de config propria: quais dias da semana e horario o nutri atende
-- online, independente do presencial. online_weekdays: array de 0-6 (0=domingo).
ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS online_enabled       BOOLEAN DEFAULT true;
ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS online_weekdays      INT[]   DEFAULT '{1,2,3,4,5}';
ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS online_start         TIME    DEFAULT '08:00';
ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS online_end           TIME    DEFAULT '18:00';
ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS online_slot_duration INT     DEFAULT 30;
ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS online_break_start   TIME;
ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS online_break_end     TIME;

-- ── Migração Evolution API → uazapi (2026-07-01) ────────────────────────────
-- instance_token: token de autenticação por instância (header `token` na uazapi)
-- instance_id:    ID único da instância retornado na criação; identifica a instância
--                 nos webhooks recebidos (campo `instance` do payload uazapi)
ALTER TABLE whatsapp_connections ADD COLUMN IF NOT EXISTS instance_token TEXT;
ALTER TABLE whatsapp_connections ADD COLUMN IF NOT EXISTS instance_id    TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_wc_instance_id ON whatsapp_connections(instance_id) WHERE instance_id IS NOT NULL;

-- ── Logs de execução de automações n8n ──────────────────────────────
CREATE TABLE IF NOT EXISTS automation_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id UUID REFERENCES nutritionists(id),
  client_phone    TEXT,
  event_type      TEXT NOT NULL,
  agent_used      TEXT,
  input_summary   TEXT,
  output_summary  TEXT,
  success         BOOLEAN DEFAULT true,
  error           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_automation_logs_nutri ON automation_logs(nutritionist_id, created_at DESC);

-- ── Automação de follow-up (Pós-consulta / Lembrete / Retorno) — alinhamento com frontend `auto_*` ──
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS auto_feedback_enabled       BOOLEAN DEFAULT false;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS auto_feedback_delay_hours  INT DEFAULT 2;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS auto_feedback_message      TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS auto_reminder_enabled      BOOLEAN DEFAULT false;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS auto_reminder_hours_before INT DEFAULT 24;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS auto_reminder_message      TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS auto_return_enabled        BOOLEAN DEFAULT false;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS auto_return_days           INT DEFAULT 30;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS auto_return_message        TEXT;

-- ── Mensagem de transferência para humano, separada da despedida real ──
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS handoff_message      TEXT;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS handoff_enabled      BOOLEAN DEFAULT true;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS handoff_auto_urgent  BOOLEAN DEFAULT true;

-- ── Integração de pagamento Asaas (PIX) ──
ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS asaas_api_key TEXT;

CREATE TABLE IF NOT EXISTS payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id    UUID NOT NULL REFERENCES nutritionists(id),
  appointment_id     UUID REFERENCES appointments(id) ON DELETE SET NULL,
  asaas_payment_id   TEXT UNIQUE,
  external_reference TEXT,
  amount             NUMERIC(10,2) NOT NULL,
  type               TEXT NOT NULL,
  method             TEXT DEFAULT 'PIX',
  status             TEXT NOT NULL DEFAULT 'pending',
  pix_qr_code        TEXT,
  pix_copy_paste     TEXT,
  due_date           DATE,
  paid_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_appointment ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_asaas_id    ON payments(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_nutri       ON payments(nutritionist_id, created_at DESC);

-- ── Memória longa por cliente — resumo textual acumulado pela IA ──────────────
-- ai_summary: texto livre gerado e mantido pelo n8n após cada conversa
--   (ex: "prefere online, mora na Serra, já perguntou sobre plano trimestral")
-- ai_summary_updated_at: quando foi atualizado pela última vez
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_summary            TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS ai_summary_updated_at TIMESTAMPTZ;

-- Opt-out: lead pediu explicitamente para não receber mais mensagens automáticas.
-- Bloqueia follow-up/reativação nos crons; mensagem nova do lead limpa a flag.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS opted_out BOOLEAN DEFAULT false;

-- Data de retorno definida pela nutri (quando o paciente deve voltar).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS return_date DATE;

-- ── Anamnese nutricional por paciente (2026-07-07) ───────────────────────────
-- data: JSONB livre; campos sugeridos documentados em anamnesis.routes.ts
CREATE TABLE IF NOT EXISTS anamneses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  data            JSONB NOT NULL DEFAULT '{}',
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nutritionist_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_anamneses_client ON anamneses(nutritionist_id, client_id);

DO $$ BEGIN
  CREATE TRIGGER trg_anamneses_updated BEFORE UPDATE ON anamneses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Preferências de notificação do nutricionista (2026-07-07) ────────────────
ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS notify_ai_daily_report      BOOLEAN DEFAULT true;
ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS notify_new_lead             BOOLEAN DEFAULT true;
ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS notify_appointment_reminder BOOLEAN DEFAULT true;
ALTER TABLE nutritionists ADD COLUMN IF NOT EXISTS notify_whatsapp_disconnected BOOLEAN DEFAULT true;
