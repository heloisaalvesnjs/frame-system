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
