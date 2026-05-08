-- Add recurring campaign support to push_campaigns.

ALTER TABLE push_campaigns
  ADD COLUMN IF NOT EXISTS recurrence_type     TEXT    CHECK (recurrence_type IN ('weekly', 'interval')),
  ADD COLUMN IF NOT EXISTS recurrence_days     INTEGER[],   -- [1,5] = Mon,Fri (0=Sun…6=Sat, BRT)
  ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER,     -- days between sends
  ADD COLUMN IF NOT EXISTS recurrence_hour     INTEGER DEFAULT 9, -- BRT hour (0-23)
  ADD COLUMN IF NOT EXISTS recurrence_next_send TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recurrence_active   BOOLEAN DEFAULT true;

-- Extend type and status CHECKs to include 'recorrente'
ALTER TABLE push_campaigns DROP CONSTRAINT IF EXISTS push_campaigns_type_check;
ALTER TABLE push_campaigns ADD CONSTRAINT push_campaigns_type_check
  CHECK (type IN ('unico', 'manual', 'recorrente'));

ALTER TABLE push_campaigns DROP CONSTRAINT IF EXISTS push_campaigns_status_check;
ALTER TABLE push_campaigns ADD CONSTRAINT push_campaigns_status_check
  CHECK (status IN ('rascunho', 'agendada', 'enviada', 'manual', 'cancelada', 'recorrente'));

-- Index for the cron query
CREATE INDEX IF NOT EXISTS idx_push_campaigns_recurrence
  ON push_campaigns (type, status, recurrence_active, recurrence_next_send)
  WHERE type = 'recorrente';
