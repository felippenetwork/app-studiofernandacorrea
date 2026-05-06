-- Add sort_order column to services for drag-and-drop reordering
ALTER TABLE services ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Initialize sort_order based on existing insertion order
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) - 1 AS rn
  FROM services
)
UPDATE services SET sort_order = ranked.rn FROM ranked WHERE services.id = ranked.id;
