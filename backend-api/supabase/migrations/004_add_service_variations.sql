-- Add variations JSONB column to services table
-- Each variation: { id, name, price, durationMinutes?, description? }
ALTER TABLE services ADD COLUMN IF NOT EXISTS variations JSONB NOT NULL DEFAULT '[]'::jsonb;
