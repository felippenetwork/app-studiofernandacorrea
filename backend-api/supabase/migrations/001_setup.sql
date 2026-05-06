-- ============================================================
-- Studio Fernanda Correa — Schema Completo
-- Cole e rode no Supabase → SQL Editor → New query → Run
-- ============================================================

-- ─── Tabelas independentes ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT        NOT NULL,
  email                     TEXT        UNIQUE NOT NULL,
  phone                     TEXT,
  avatar_url                TEXT,
  password_hash             TEXT        NOT NULL,
  birth_date                DATE,
  accepts_marketing         BOOLEAN     NOT NULL DEFAULT FALSE,
  accepts_push              BOOLEAN     NOT NULL DEFAULT TRUE,
  is_vip                    BOOLEAN     NOT NULL DEFAULT FALSE,
  is_blocked                BOOLEAN     NOT NULL DEFAULT FALSE,
  internal_notes            TEXT,
  is_active                 BOOLEAN     NOT NULL DEFAULT FALSE,
  email_verification_token  TEXT,
  email_verified_at         TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  email         TEXT        UNIQUE NOT NULL,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'recepcao'
                            CHECK (role IN ('owner','gerente','recepcao','marketing','financeiro')),
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trinks_service_id TEXT,
  name              TEXT        NOT NULL,
  description       TEXT,
  price             NUMERIC(10,2) NOT NULL,
  duration_minutes  INTEGER     NOT NULL DEFAULT 60,
  category          TEXT        NOT NULL DEFAULT 'outros',
  image_url         TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS professionals (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trinks_employee_id  TEXT,
  name                TEXT        NOT NULL,
  avatar_url          TEXT,
  specialties         TEXT[]      NOT NULL DEFAULT '{}',
  bio                 TEXT,
  rating              NUMERIC(3,1) NOT NULL DEFAULT 0,
  review_count        INTEGER     NOT NULL DEFAULT 0,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupons (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  code                TEXT          UNIQUE NOT NULL,
  title               TEXT          NOT NULL,
  description         TEXT,
  discount_type       TEXT          NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value      NUMERIC(10,2) NOT NULL,
  min_order_value     NUMERIC(10,2),
  max_usages          INTEGER,
  used_count          INTEGER       NOT NULL DEFAULT 0,
  valid_from          DATE          NOT NULL,
  valid_until         DATE          NOT NULL,
  status              TEXT          NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','expirado','esgotado')),
  rules               TEXT[]        NOT NULL DEFAULT '{}',
  image_url           TEXT,
  applicable_services UUID[],
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS benefits (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  description TEXT        NOT NULL,
  type        TEXT        NOT NULL CHECK (type IN ('promocao','evento','novidade','exclusivo')),
  image_url   TEXT,
  cta         TEXT,
  cta_link    TEXT,
  valid_until DATE,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT        UNIQUE NOT NULL,
  value      JSONB       NOT NULL DEFAULT '{}',
  updated_by UUID        REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS birthday_settings (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active            BOOLEAN       NOT NULL DEFAULT FALSE,
  coupon_type          TEXT          NOT NULL DEFAULT 'percentage' CHECK (coupon_type IN ('percentage','fixed')),
  coupon_value         NUMERIC(10,2) NOT NULL DEFAULT 10,
  coupon_validity_days INTEGER       NOT NULL DEFAULT 30,
  push_message         TEXT          NOT NULL DEFAULT 'Feliz aniversário! Seu cupom especial chegou.',
  send_hour            INTEGER       NOT NULL DEFAULT 9 CHECK (send_hour >= 0 AND send_hour <= 23),
  updated_by           UUID          REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ─── Tabelas dependentes de users / professionals / services ──────────────────

CREATE TABLE IF NOT EXISTS appointments (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trinks_appointment_id TEXT,
  service_id            UUID          NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  professional_id       UUID          NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
  appointment_date      DATE          NOT NULL,
  appointment_time      TIME          NOT NULL,
  status                TEXT          NOT NULL DEFAULT 'pendente_pagamento'
                                      CHECK (status IN ('pendente_pagamento','confirmado','cancelado','concluido','nao_compareceu')),
  service_price         NUMERIC(10,2) NOT NULL,
  booking_fee           NUMERIC(10,2) NOT NULL DEFAULT 40,
  remaining_amount      NUMERIC(10,2) NOT NULL,
  payment_status        TEXT          NOT NULL DEFAULT 'pendente'
                                      CHECK (payment_status IN ('pendente','aprovado','recusado','reembolsado')),
  payment_id            UUID,
  notes                 TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_id      UUID          NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  amount              NUMERIC(10,2) NOT NULL,
  type                TEXT          NOT NULL CHECK (type IN ('booking_fee','full_payment')),
  method              TEXT          CHECK (method IN ('pix','credit_card','debit_card')),
  status              TEXT          NOT NULL DEFAULT 'pendente'
                                    CHECK (status IN ('pendente','aprovado','recusado','reembolsado')),
  external_payment_id TEXT,
  mp_preference_id    TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  body       TEXT,
  data       JSONB,
  is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL,
  provider   TEXT        NOT NULL DEFAULT 'expo',
  platform   TEXT        CHECK (platform IN ('ios','android')),
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, token)
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coupon_id      UUID        NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  appointment_id UUID        REFERENCES appointments(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, coupon_id)
);

CREATE TABLE IF NOT EXISTS feedback (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating          INTEGER     NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment         TEXT,
  status          TEXT        NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado')),
  professional_id UUID        REFERENCES professionals(id) ON DELETE SET NULL,
  service_id      UUID        REFERENCES services(id) ON DELETE SET NULL,
  moderated_by    UUID        REFERENCES admin_users(id) ON DELETE SET NULL,
  moderated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS birthday_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coupon_id  UUID        NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  year       INTEGER     NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, year)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID        REFERENCES admin_users(id) ON DELETE SET NULL,
  admin_email   TEXT        NOT NULL,
  action        TEXT        NOT NULL,
  entity_type   TEXT,
  entity_id     UUID,
  changes       JSONB,
  ip_address    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_campaigns (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  body         TEXT        NOT NULL,
  segment      TEXT        NOT NULL DEFAULT 'todos' CHECK (segment IN ('todos','vip','marketing')),
  status       TEXT        NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','agendada','enviada')),
  scheduled_at TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ,
  sent_count   INTEGER     NOT NULL DEFAULT 0,
  created_by   UUID        REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trinks_webhook_events (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type            TEXT        NOT NULL,
  trinks_appointment_id TEXT,
  payload               JSONB       NOT NULL DEFAULT '{}',
  processed             BOOLEAN     NOT NULL DEFAULT FALSE,
  processed_at          TIMESTAMPTZ,
  error_message         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Índices de performance ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_email                ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token   ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_birth_date           ON users(birth_date) WHERE birth_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_users_email          ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_appointments_user          ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date          ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status        ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_payments_appointment       ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_payments_user              ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user         ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread       ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_feedback_status            ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user           ON push_tokens(user_id) WHERE is_active = TRUE;

-- ─── Primeiro usuário admin ───────────────────────────────────────────────────
-- Senha padrão: Admin@2026  (troque imediatamente após o primeiro login)

INSERT INTO admin_users (name, email, password_hash, role)
VALUES (
  'Admin Studio',
  'admin@studiofernandacorrea.com.br',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/Lex.RqE0HLTiB/pTe',
  'owner'
)
ON CONFLICT (email) DO NOTHING;

-- ─── Configuração inicial do app ──────────────────────────────────────────────

INSERT INTO app_settings (key, value) VALUES
  ('branding',      '{"studioName":"Studio Fernanda Correa","tagline":"Beleza com sofisticação"}'),
  ('schedule',      '{"monday":{"open":"09:00","close":"19:00","enabled":true},"tuesday":{"open":"09:00","close":"19:00","enabled":true},"wednesday":{"open":"09:00","close":"19:00","enabled":true},"thursday":{"open":"09:00","close":"19:00","enabled":true},"friday":{"open":"09:00","close":"19:00","enabled":true},"saturday":{"open":"09:00","close":"17:00","enabled":true},"sunday":{"open":"09:00","close":"17:00","enabled":false}}'),
  ('booking',       '{"bookingFee":40,"cancellationHours":24}'),
  ('integrations',  '{"googleReviewLink":null,"trinksEnabled":false,"mercadoPagoEnabled":false}')
ON CONFLICT (key) DO NOTHING;

INSERT INTO birthday_settings (is_active, coupon_type, coupon_value, coupon_validity_days, push_message, send_hour)
VALUES (FALSE, 'percentage', 15, 30, 'Feliz aniversário! Use seu cupom especial este mês.', 9)
ON CONFLICT DO NOTHING;
