-- ============================================================
-- Studio Fernanda Correa — Migration 002
-- Adiciona colunas de verificação de e-mail na tabela users
-- ============================================================

-- Adiciona colunas novas (seguro rodar mesmo que já existam)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_active                BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_verification_token TEXT,
  ADD COLUMN IF NOT EXISTS email_verified_at        TIMESTAMPTZ;

-- Índice para buscar usuário pelo token no link de confirmação
CREATE INDEX IF NOT EXISTS idx_users_verification_token
  ON users(email_verification_token)
  WHERE email_verification_token IS NOT NULL;

-- Usuários já existentes são considerados ativos (foram criados antes da verificação)
UPDATE users
SET
  is_active           = TRUE,
  email_verified_at   = created_at
WHERE is_active = FALSE
  AND email_verification_token IS NULL;
