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
