-- Studio Fernanda Correa — Database Schema
-- Compatible with Supabase (PostgreSQL)
-- Run via Supabase SQL editor or psql

-- ─── Extensions ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  phone         VARCHAR(20),
  avatar_url    TEXT,
  password_hash TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ─── Services ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS services (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trinks_service_id VARCHAR(100) UNIQUE,
  name              VARCHAR(255) NOT NULL,
  description       TEXT,
  price             NUMERIC(10,2) NOT NULL,
  duration_minutes  INT NOT NULL,
  category          VARCHAR(50) NOT NULL,
  image_url         TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Professionals ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS professionals (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trinks_employee_id   VARCHAR(100) UNIQUE,
  name                 VARCHAR(255) NOT NULL,
  avatar_url           TEXT,
  specialties          TEXT[] NOT NULL DEFAULT '{}',
  bio                  TEXT,
  rating               NUMERIC(3,2) NOT NULL DEFAULT 5.0,
  review_count         INT NOT NULL DEFAULT 0,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Appointments ────────────────────────────────────────────────────────────

CREATE TYPE appointment_status AS ENUM (
  'pendente_pagamento',
  'confirmado',
  'cancelado',
  'concluido',
  'nao_compareceu'
);

CREATE TYPE payment_status AS ENUM (
  'pendente',
  'aprovado',
  'recusado',
  'reembolsado'
);

CREATE TABLE IF NOT EXISTS appointments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trinks_appointment_id VARCHAR(100) UNIQUE,
  service_id            UUID NOT NULL REFERENCES services(id),
  professional_id       UUID NOT NULL REFERENCES professionals(id),
  appointment_date      DATE NOT NULL,
  appointment_time      TIME NOT NULL,
  status                appointment_status NOT NULL DEFAULT 'pendente_pagamento',
  service_price         NUMERIC(10,2) NOT NULL,
  booking_fee           NUMERIC(10,2) NOT NULL DEFAULT 40.00,
  remaining_amount      NUMERIC(10,2) NOT NULL,
  payment_status        payment_status NOT NULL DEFAULT 'pendente',
  payment_id            UUID,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- ─── Payments ────────────────────────────────────────────────────────────────

CREATE TYPE payment_type AS ENUM ('booking_fee', 'full_payment');
CREATE TYPE payment_method AS ENUM ('pix', 'credit_card', 'debit_card');

CREATE TABLE IF NOT EXISTS payments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id),
  appointment_id      UUID NOT NULL REFERENCES appointments(id),
  amount              NUMERIC(10,2) NOT NULL,
  type                payment_type NOT NULL DEFAULT 'booking_fee',
  method              payment_method,
  status              payment_status NOT NULL DEFAULT 'pendente',
  external_payment_id VARCHAR(255),  -- Mercado Pago payment ID
  mp_preference_id    VARCHAR(255),  -- Mercado Pago preference ID
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_appointment_id ON payments(appointment_id);
CREATE INDEX idx_payments_external_id ON payments(external_payment_id);

-- Add FK from appointments.payment_id to payments
ALTER TABLE appointments
  ADD CONSTRAINT fk_appointments_payment
  FOREIGN KEY (payment_id) REFERENCES payments(id);

-- ─── Coupons ─────────────────────────────────────────────────────────────────

CREATE TYPE discount_type AS ENUM ('percentage', 'fixed');
CREATE TYPE coupon_status AS ENUM ('ativo', 'expirado', 'esgotado');

CREATE TABLE IF NOT EXISTS coupons (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code                 VARCHAR(50) NOT NULL UNIQUE,
  title                VARCHAR(255) NOT NULL,
  description          TEXT,
  discount_type        discount_type NOT NULL,
  discount_value       NUMERIC(10,2) NOT NULL,
  min_order_value      NUMERIC(10,2),
  max_usages           INT,
  used_count           INT NOT NULL DEFAULT 0,
  valid_from           DATE NOT NULL,
  valid_until          DATE NOT NULL,
  status               coupon_status NOT NULL DEFAULT 'ativo',
  rules                TEXT[] NOT NULL DEFAULT '{}',
  image_url            TEXT,
  applicable_services  UUID[],  -- NULL = all services
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_coupons_status ON coupons(status);

-- ─── Coupon Redemptions ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id),
  coupon_id      UUID NOT NULL REFERENCES coupons(id),
  appointment_id UUID REFERENCES appointments(id),
  redeemed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, coupon_id)
);

-- ─── Benefits ────────────────────────────────────────────────────────────────

CREATE TYPE benefit_type AS ENUM ('promocao', 'evento', 'novidade', 'exclusivo');

CREATE TABLE IF NOT EXISTS benefits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  type        benefit_type NOT NULL DEFAULT 'promocao',
  image_url   TEXT,
  cta         VARCHAR(100),
  cta_link    TEXT,
  valid_until DATE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_benefits_active ON benefits(is_active);

-- ─── Push Tokens ─────────────────────────────────────────────────────────────

CREATE TYPE push_provider AS ENUM ('expo', 'fcm', 'apns');

CREATE TABLE IF NOT EXISTS push_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  provider   push_provider NOT NULL DEFAULT 'expo',
  platform   VARCHAR(10),  -- 'ios' | 'android'
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);

-- ─── Trinks Webhook Events ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trinks_webhook_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type  VARCHAR(100) NOT NULL,
  payload     JSONB NOT NULL,
  processed   BOOLEAN NOT NULL DEFAULT FALSE,
  error       TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── In-app Notifications ────────────────────────────────────────────────────

CREATE TYPE notification_type AS ENUM (
  'agendamento_confirmado',
  'lembrete_horario',
  'agendamento_cancelado',
  'novo_cupom',
  'geral'
);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       notification_type NOT NULL DEFAULT 'geral',
  title      VARCHAR(255) NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- ─── Users — additional profile fields ───────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS birth_date       DATE,
  ADD COLUMN IF NOT EXISTS accepts_marketing BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS accepts_push      BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_vip            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_blocked        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS internal_notes    TEXT;

-- ─── Admin Users ─────────────────────────────────────────────────────────────

CREATE TYPE admin_role AS ENUM ('owner', 'gerente', 'recepcao', 'marketing', 'financeiro');

CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          admin_role NOT NULL DEFAULT 'recepcao',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_users_email ON admin_users(email);

-- ─── Admin Notifications ──────────────────────────────────────────────────────

CREATE TYPE admin_notification_type AS ENUM (
  'new_appointment',
  'appointment_cancelled',
  'payment_approved',
  'payment_pending',
  'new_feedback',
  'new_customer',
  'no_show'
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type         admin_notification_type NOT NULL,
  title        VARCHAR(255) NOT NULL,
  message      TEXT NOT NULL,
  entity_type  VARCHAR(50),
  entity_id    UUID,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_notifications_read ON admin_notifications(is_read);
CREATE INDEX idx_admin_notifications_created ON admin_notifications(created_at DESC);

-- ─── Audit Logs ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id  UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  admin_email    VARCHAR(255),
  action         VARCHAR(100) NOT NULL,
  entity_type    VARCHAR(50),
  entity_id      UUID,
  changes        JSONB,
  ip_address     VARCHAR(45),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin_user ON audit_logs(admin_user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ─── App Settings (branding, schedule config, integrations) ─────────────────

CREATE TABLE IF NOT EXISTS app_settings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key           VARCHAR(100) NOT NULL UNIQUE,
  value         JSONB NOT NULL,
  updated_by    UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Birthday Automation Settings ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS birthday_settings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  is_active           BOOLEAN NOT NULL DEFAULT FALSE,
  coupon_type         discount_type NOT NULL DEFAULT 'fixed',
  coupon_value        NUMERIC(10,2) NOT NULL DEFAULT 20.00,
  coupon_validity_days INT NOT NULL DEFAULT 30,
  push_message        TEXT NOT NULL DEFAULT 'Feliz aniversário! Temos um presente especial para você.',
  send_hour           INT NOT NULL DEFAULT 8,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default birthday settings
INSERT INTO birthday_settings (is_active, coupon_type, coupon_value, coupon_validity_days, send_hour)
VALUES (false, 'fixed', 20.00, 30, 8)
ON CONFLICT DO NOTHING;

-- ─── Birthday Logs ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS birthday_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coupon_id  UUID REFERENCES coupons(id),
  year       INT NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, year)
);

CREATE INDEX idx_birthday_logs_user ON birthday_logs(user_id);

-- ─── Push Campaigns ──────────────────────────────────────────────────────────

CREATE TYPE campaign_status AS ENUM ('rascunho', 'agendada', 'enviada', 'cancelada');
CREATE TYPE campaign_segment AS ENUM ('todos', 'vip', 'ativos', 'inativos');

CREATE TABLE IF NOT EXISTS push_campaigns (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  segment     campaign_segment NOT NULL DEFAULT 'todos',
  status      campaign_status NOT NULL DEFAULT 'rascunho',
  scheduled_at TIMESTAMPTZ,
  sent_at     TIMESTAMPTZ,
  sent_count  INT NOT NULL DEFAULT 0,
  created_by  UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Updated-at trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at           BEFORE UPDATE ON users           FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_services_updated_at        BEFORE UPDATE ON services        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_professionals_updated_at   BEFORE UPDATE ON professionals   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at    BEFORE UPDATE ON appointments    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at        BEFORE UPDATE ON payments        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_coupons_updated_at         BEFORE UPDATE ON coupons         FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_benefits_updated_at        BEFORE UPDATE ON benefits        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_tokens_updated_at     BEFORE UPDATE ON push_tokens     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_users_updated_at     BEFORE UPDATE ON admin_users     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at    BEFORE UPDATE ON app_settings    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_birthday_settings_updated_at BEFORE UPDATE ON birthday_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_campaigns_updated_at  BEFORE UPDATE ON push_campaigns  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
