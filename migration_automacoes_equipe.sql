-- ── Automações (novos campos na tabela assistants) ──────────────────
ALTER TABLE assistants
  ADD COLUMN IF NOT EXISTS auto_feedback_enabled      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_feedback_delay_hours  INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS auto_feedback_message      TEXT,
  ADD COLUMN IF NOT EXISTS auto_reminder_enabled      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_reminder_hours_before INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS auto_reminder_message      TEXT,
  ADD COLUMN IF NOT EXISTS auto_return_enabled        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_return_days           INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS auto_return_message        TEXT;

-- ── Equipe (nova tabela) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nutritionist_id  UUID NOT NULL REFERENCES nutritionists(id) ON DELETE CASCADE,
  name             TEXT,
  email            TEXT NOT NULL,
  role             TEXT NOT NULL DEFAULT 'receptionist',
  invite_token     TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  status           TEXT NOT NULL DEFAULT 'pending',
  password_hash    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(nutritionist_id, email)
);
