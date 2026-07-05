-- ============================================================================
-- FRAME SYSTEM — Schema Setup para Supabase
-- ============================================================================
-- Este arquivo contém o schema completo do Frame System para PostgreSQL 14+
-- Executar no Supabase via:
--
--   psql "postgresql://postgres:[SENHA]@db.usbnqjifompfhcpsxrlk.supabase.co:5432/postgres" -f supabase-setup.sql
--
-- Ou copiar/colar no editor SQL do Supabase Dashboard → SQL Editor → New Query
--
-- NOTA: Este arquivo já contém DROP TABLE + CREATE TABLE idempotentes.
--       Seguro rodar múltiplas vezes (não apaga dados existentes se as tabelas já estão criadas).
--
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABELAS PRINCIPAIS
-- ============================================================================

-- Nutricionistas (tenants)
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
  status        TEXT DEFAULT 'pending',      -- pending | active | suspended
  is_master     BOOLEAN DEFAULT false,
  buffer_between_minutes  INT DEFAULT 10,
  min_advance_hours        INT DEFAULT 3,
  max_appointments_per_day INT DEFAULT 8,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Assistentes IA (1 por nutricionista)
CREATE TABLE IF NOT EXISTS assistants (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id     UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  tone                TEXT DEFAULT 'acolhedor',
  greeting_message    TEXT,
  farewell_message    TEXT,
  pdf_path            TEXT,
  pdf_content         TEXT,
  system_prompt       TEXT,
  is_active           BOOLEAN DEFAULT true,
  consultation_price  TEXT,
  consultation_modalities TEXT DEFAULT 'online',
  specialties         TEXT,
  vacation_mode       BOOLEAN DEFAULT false,
  vacation_message    TEXT,
  followup_enabled    BOOLEAN DEFAULT true,
  followup_delay_hours INT DEFAULT 4,
  emoji_level         INT DEFAULT 3,
  followup_message_1  TEXT,
  followup_message_2  TEXT,
  func_prospeccao     BOOLEAN DEFAULT true,
  func_triagem        BOOLEAN DEFAULT true,
  func_agendamento    BOOLEAN DEFAULT true,
  services_message    TEXT,
  services_message_enabled BOOLEAN DEFAULT false,
  services_message_online TEXT,
  services_message_online_enabled BOOLEAN DEFAULT false,
  services_message_presencial TEXT,
  services_message_presencial_enabled BOOLEAN DEFAULT false,
  ai_paused           BOOLEAN DEFAULT false,
  plans_media_path    TEXT,
  plans_media_type    TEXT,
  plans_media_enabled BOOLEAN DEFAULT false,
  plans_media_original_name TEXT,
  plans_media         JSONB DEFAULT '{}',
  service_plans       TEXT,
  nutri_display_name  TEXT,
  training_form       JSONB,
  frases_proibidas    JSONB DEFAULT '[]',
  frases_preferidas   JSONB DEFAULT '[]',
  custom_objections   JSONB DEFAULT '[]',
  conversation_examples JSONB DEFAULT '[]',
  clinical_rules      JSONB DEFAULT '[]',
  retorno_message     TEXT,
  retorno_days        INT DEFAULT 30,
  pos_consulta_message TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nutritionist_id)
);

-- Conexões WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id     UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  instance_name       TEXT UNIQUE NOT NULL,
  phone_number        TEXT,
  status              TEXT DEFAULT 'disconnected',
  qr_code             TEXT,
  connected_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nutritionist_id)
);

-- Horários disponíveis
CREATE TABLE IF NOT EXISTS availability (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id     UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  day_of_week         INT NOT NULL,
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  slot_duration       INT DEFAULT 60,
  is_active           BOOLEAN DEFAULT true,
  break_start         TIME,
  break_end           TIME,
  location_id         UUID,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Clientes (pacientes)
CREATE TABLE IF NOT EXISTS clients (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id     UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  name                TEXT,
  phone               TEXT NOT NULL,
  email               TEXT,
  goal                TEXT,
  notes               TEXT,
  birthdate           DATE,
  gender              TEXT,
  height_cm           NUMERIC(5,1),
  stage               TEXT DEFAULT 'novo_contato',
  source              TEXT,
  estimated_value     NUMERIC(10,2),
  stage_updated_at    TIMESTAMPTZ DEFAULT NOW(),
  ai_memory           JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nutritionist_id, phone)
);

-- Consultas / Agendamentos
CREATE TABLE IF NOT EXISTS appointments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id     UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  client_id           UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  scheduled_at        TIMESTAMPTZ NOT NULL,
  duration            INT DEFAULT 50,
  modality            TEXT DEFAULT 'online',
  status              TEXT DEFAULT 'scheduled',
  notes               TEXT,
  created_by          TEXT DEFAULT 'assistant',
  location_id         UUID,
  location_name       TEXT,
  city                TEXT,
  client_phone        TEXT,
  reminder_sent       BOOLEAN DEFAULT false,
  return_message_sent BOOLEAN DEFAULT false,
  pos_consulta_sent   BOOLEAN DEFAULT false,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Conversas (agrupador de mensagens)
CREATE TABLE IF NOT EXISTS conversations (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id     UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  client_id           UUID REFERENCES clients(id),
  client_phone        TEXT NOT NULL,
  status              TEXT DEFAULT 'active',
  context             JSONB DEFAULT '{}',
  last_message_at     TIMESTAMPTZ,
  last_followup_at    TIMESTAMPTZ,
  followup_step       INT DEFAULT 0,
  mode                TEXT DEFAULT 'auto',
  outcome             TEXT,
  outcome_notes       TEXT,
  closed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Mensagens
CREATE TABLE IF NOT EXISTS messages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role                TEXT NOT NULL,
  content             TEXT NOT NULL,
  whatsapp_message_id TEXT,
  pending_send        BOOLEAN DEFAULT false,
  sent_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Serviços do consultório
CREATE TABLE IF NOT EXISTS services (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  category        TEXT DEFAULT 'Consulta',
  price           TEXT,
  description     TEXT,
  modality        TEXT DEFAULT 'presencial',
  is_active       BOOLEAN DEFAULT true,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Locais de atendimento
CREATE TABLE IF NOT EXISTS locations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  city            TEXT,
  address         TEXT,
  color           TEXT DEFAULT '#6366f1',
  price           TEXT,
  payment_info    TEXT,
  deposit_required BOOLEAN DEFAULT false,
  deposit_amount  TEXT,
  confirmation_message TEXT,
  modality        TEXT DEFAULT 'presencial',
  is_active       BOOLEAN DEFAULT true,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Bloqueios de agenda
CREATE TABLE IF NOT EXISTS calendar_blocks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Datas bloqueadas (feriados / dias sem atendimento)
CREATE TABLE IF NOT EXISTS blocked_dates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  blocked_date    DATE NOT NULL,
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (nutritionist_id, blocked_date)
);

-- Local de atendimento por data específica (sobrepõe o padrão semanal)
CREATE TABLE IF NOT EXISTS date_location_overrides (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  location_id     UUID REFERENCES locations(id) ON DELETE SET NULL,
  UNIQUE(nutritionist_id, date)
);

-- ============================================================================
-- TABELAS SECUNDÁRIAS (Pacientes, Documentos, Chat)
-- ============================================================================

-- Contas próprias dos pacientes
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

-- Códigos de convite
CREATE TABLE IF NOT EXISTS patient_invite_codes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  code            TEXT UNIQUE NOT NULL,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  used_by         UUID REFERENCES patient_accounts(id) ON DELETE SET NULL,
  used_at         TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Magic-link tokens
CREATE TABLE IF NOT EXISTS patient_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registro de peso
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

-- Registro de água
CREATE TABLE IF NOT EXISTS water_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id  UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount_ml  INT NOT NULL DEFAULT 250,
  logged_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registro de atividade
CREATE TABLE IF NOT EXISTS activity_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  activity_type    TEXT NOT NULL,
  duration_minutes INT,
  notes            TEXT,
  logged_at        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Check-in semanal
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

-- Plano alimentar
CREATE TABLE IF NOT EXISTS meal_plans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title           TEXT NOT NULL DEFAULT 'Plano Alimentar',
  meals           JSONB NOT NULL DEFAULT '[]',
  notes           TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nutritionist_id, client_id)
);

-- Documentos do paciente
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

-- Chat nutricionista ↔ paciente
CREATE TABLE IF NOT EXISTS patient_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  from_role       TEXT NOT NULL CHECK (from_role IN ('patient', 'nutritionist')),
  content         TEXT NOT NULL,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABELAS DE TREINAMENTO E AUTOMAÇÃO
-- ============================================================================

-- Notas de treinamento globais
CREATE TABLE IF NOT EXISTS ai_training_notes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category   TEXT NOT NULL DEFAULT 'geral',
  content    TEXT NOT NULL,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sequência de follow-up configurável
CREATE TABLE IF NOT EXISTS followup_sequences (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  step_order      INT NOT NULL DEFAULT 1,
  delay_hours     NUMERIC(5,1) NOT NULL DEFAULT 4,
  message         TEXT NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (nutritionist_id, step_order)
);

-- Logs de automação (n8n e Evolution)
CREATE TABLE IF NOT EXISTS automation_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID REFERENCES nutritionists(id) ON DELETE SET NULL,
  client_phone TEXT,
  event_type   TEXT NOT NULL,
  agent_used   TEXT,
  input_summary TEXT,
  output_summary TEXT,
  success      BOOLEAN DEFAULT true,
  error        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook integrations
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

-- Google Calendar integration
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id   UUID UNIQUE REFERENCES nutritionists(id) ON DELETE CASCADE,
  access_token      TEXT NOT NULL,
  refresh_token     TEXT NOT NULL,
  token_expiry      TIMESTAMP,
  calendar_id       TEXT DEFAULT 'primary',
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- TABELAS DE AUTENTICAÇÃO
-- ============================================================================

-- Tokens de reset de senha
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nutritionist_id UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding forms
CREATE TABLE IF NOT EXISTS onboarding_forms (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug         TEXT NOT NULL,
  data         JSONB NOT NULL DEFAULT '{}',
  processed    BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_conversations_nutritionist ON conversations(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(client_phone);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(nutritionist_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_appointments_nutritionist ON appointments(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_created ON appointments(nutritionist_id, created_at);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(nutritionist_id, phone);
CREATE INDEX IF NOT EXISTS idx_clients_stage ON clients(nutritionist_id, stage);
CREATE INDEX IF NOT EXISTS idx_services_nutri ON services(nutritionist_id, is_active);
CREATE INDEX IF NOT EXISTS idx_patient_accounts_phone ON patient_accounts(phone);
CREATE INDEX IF NOT EXISTS idx_patient_invite_code ON patient_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_patient_invite_nutri ON patient_invite_codes(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_patient_tokens_token ON patient_tokens(token);
CREATE INDEX IF NOT EXISTS idx_weight_logs_client ON weight_logs(client_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_water_logs_client ON water_logs(client_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_client ON activity_logs(client_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_client ON weekly_checkins(client_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plans_client ON meal_plans(nutritionist_id, client_id);
CREATE INDEX IF NOT EXISTS idx_patient_docs_client ON patient_documents(nutritionist_id, client_id);
CREATE INDEX IF NOT EXISTS idx_patient_messages_chat ON patient_messages(nutritionist_id, client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_training_notes_active ON ai_training_notes(is_active, created_at);
CREATE INDEX IF NOT EXISTS idx_followup_seq_nutri ON followup_sequences(nutritionist_id, step_order);
CREATE INDEX IF NOT EXISTS idx_date_loc_overrides ON date_location_overrides(nutritionist_id, date);

-- ============================================================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================================================

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

DO $$ BEGIN
  CREATE TRIGGER trg_patient_accounts_updated BEFORE UPDATE ON patient_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_meal_plans_updated BEFORE UPDATE ON meal_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_webhook_integrations_updated BEFORE UPDATE ON webhook_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- OPT-OUT (2026-07-05): lead pediu para não receber mais mensagens automáticas
-- ============================================================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS opted_out BOOLEAN DEFAULT false;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Após rodar este script, verifique com:
-- SELECT * FROM information_schema.tables WHERE table_schema = 'public';
-- Esperado: ~30 tabelas criadas

-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================
