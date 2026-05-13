-- ─── Visit-based reward columns ───────────────────────────────────────────────

ALTER TABLE loyalty_settings
  ADD COLUMN IF NOT EXISTS visit_reward_active        boolean       DEFAULT false,
  ADD COLUMN IF NOT EXISTS visit_reward_count         int           DEFAULT 10,
  ADD COLUMN IF NOT EXISTS visit_reward_discount_type text          DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS visit_reward_discount_value numeric(5,2) DEFAULT 100,
  ADD COLUMN IF NOT EXISTS visit_reward_validity_days int           DEFAULT 30;

-- Track which reward cycle each user has already received
CREATE TABLE IF NOT EXISTS loyalty_visit_log (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_cycle          int  NOT NULL,   -- 1 = first N visits, 2 = second N visits, ...
  coupon_code           text NOT NULL,
  total_visits_at_reward int,
  created_at            timestamptz DEFAULT now(),
  UNIQUE (user_id, reward_cycle)
);

CREATE INDEX IF NOT EXISTS idx_loyalty_visit_log_user ON loyalty_visit_log(user_id);
