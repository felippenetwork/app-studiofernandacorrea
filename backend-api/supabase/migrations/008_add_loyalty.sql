-- ─── Loyalty Program ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS loyalty_settings (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  is_active            boolean DEFAULT false,
  points_per_real      numeric(5,2) DEFAULT 1.0,
  silver_threshold     int DEFAULT 500,
  gold_threshold       int DEFAULT 2000,
  redemption_threshold int DEFAULT 200,
  bronze_discount      numeric(5,2) DEFAULT 5,
  silver_discount      numeric(5,2) DEFAULT 10,
  gold_discount        numeric(5,2) DEFAULT 15,
  coupon_validity_days int DEFAULT 30,
  updated_at           timestamptz DEFAULT now()
);

-- Seed default row
INSERT INTO loyalty_settings (is_active) VALUES (false)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS loyalty_points (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  points         int NOT NULL,
  balance_after  int NOT NULL DEFAULT 0,
  description    text NOT NULL DEFAULT '',
  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_points_user ON loyalty_points(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_appt ON loyalty_points(appointment_id);

CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coupon_id   uuid,
  points_used int NOT NULL,
  coupon_code text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_user ON loyalty_redemptions(user_id);
