-- Add "manual" type to push_campaigns so campaigns can be resent multiple times.
-- Also extends the status CHECK to allow 'manual' and 'cancelada' values.

ALTER TABLE push_campaigns
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'unico'
    CHECK (type IN ('unico', 'manual'));

-- Extend status to include 'manual' and 'cancelada'
ALTER TABLE push_campaigns
  DROP CONSTRAINT IF EXISTS push_campaigns_status_check;

ALTER TABLE push_campaigns
  ADD CONSTRAINT push_campaigns_status_check
    CHECK (status IN ('rascunho', 'agendada', 'enviada', 'manual', 'cancelada'));
