-- 007: Sistema de agenda própria e comissões por profissional

-- ─── Horários semanais recorrentes por profissional ───────────────────────────

CREATE TABLE IF NOT EXISTS professional_schedules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Dom, 6=Sáb
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(professional_id, day_of_week)
);

CREATE INDEX idx_professional_schedules_pro ON professional_schedules(professional_id);

-- ─── Bloqueios pontuais (folga, férias, intervalo específico) ─────────────────

CREATE TABLE IF NOT EXISTS professional_schedule_blocks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  block_date      DATE NOT NULL,
  start_time      TIME,        -- NULL = bloqueio dia inteiro
  end_time        TIME,        -- NULL = bloqueio dia inteiro
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_schedule_blocks_pro_date ON professional_schedule_blocks(professional_id, block_date);

-- ─── Taxas de comissão por profissional + serviço ─────────────────────────────

CREATE TABLE IF NOT EXISTS professional_service_commissions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  professional_id       UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id            UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  commission_percentage NUMERIC(5,2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(professional_id, service_id)
);

CREATE INDEX idx_pro_service_commissions_pro ON professional_service_commissions(professional_id);
CREATE INDEX idx_pro_service_commissions_svc ON professional_service_commissions(service_id);

-- ─── Registros de comissão (gerado quando agendamento → concluido) ────────────

CREATE TABLE IF NOT EXISTS commission_records (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id        UUID NOT NULL REFERENCES appointments(id) ON DELETE RESTRICT,
  professional_id       UUID NOT NULL REFERENCES professionals(id) ON DELETE RESTRICT,
  service_id            UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  service_price         NUMERIC(10,2) NOT NULL,
  commission_percentage NUMERIC(5,2) NOT NULL,
  commission_amount     NUMERIC(10,2) NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
  paid_at               TIMESTAMPTZ,
  paid_by_admin_id      UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(appointment_id)
);

CREATE INDEX idx_commission_records_pro    ON commission_records(professional_id);
CREATE INDEX idx_commission_records_status ON commission_records(status);
CREATE INDEX idx_commission_records_date   ON commission_records(created_at DESC);

-- ─── Triggers de updated_at ───────────────────────────────────────────────────

CREATE TRIGGER update_professional_schedules_updated_at
  BEFORE UPDATE ON professional_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pro_service_commissions_updated_at
  BEFORE UPDATE ON professional_service_commissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commission_records_updated_at
  BEFORE UPDATE ON commission_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
