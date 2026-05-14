/**
 * Lightweight auto-migration runner.
 * Runs pending DDL at startup using the Supabase service role key,
 * which has superuser privileges on the database via the pg-meta endpoint.
 */

import { hasSupabase } from '../config/env';

interface Migration {
  name: string;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  {
    name: '004_add_service_variations',
    sql: `ALTER TABLE services ADD COLUMN IF NOT EXISTS variations JSONB NOT NULL DEFAULT '[]'::jsonb`,
  },
  {
    name: '005_add_service_sort_order',
    sql: `ALTER TABLE services ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0`,
  },
  {
    name: '006_add_service_booking_fee_config',
    sql: `ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_fee_type TEXT NOT NULL DEFAULT 'fixed', ADD COLUMN IF NOT EXISTS booking_fee_value NUMERIC NOT NULL DEFAULT 40`,
  },
  {
    name: '007_create_reviews',
    sql: `
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id UUID UNIQUE NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        professional_id UUID,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS review_push_sent_at TIMESTAMPTZ;
    `,
  },
  {
    name: '008_create_posts_feed',
    sql: `
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        media_url TEXT NOT NULL,
        media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video', 'boomerang')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS post_likes (
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (post_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS post_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
      CREATE INDEX IF NOT EXISTS post_likes_post_id_idx ON post_likes(post_id);
      CREATE INDEX IF NOT EXISTS post_comments_post_id_idx ON post_comments(post_id);
    `,
  },
  {
    name: '009_add_can_post_to_users',
    sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS can_post BOOLEAN NOT NULL DEFAULT FALSE`,
  },
  {
    name: '010_create_professional_schedules',
    sql: `
      CREATE TABLE IF NOT EXISTS professional_schedules (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        day_of_week     SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        start_time      TIME NOT NULL,
        end_time        TIME NOT NULL,
        is_active       BOOLEAN NOT NULL DEFAULT TRUE,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(professional_id, day_of_week)
      );
      CREATE INDEX IF NOT EXISTS idx_professional_schedules_pro ON professional_schedules(professional_id);
      DO $$ BEGIN
        CREATE TRIGGER update_professional_schedules_updated_at
          BEFORE UPDATE ON professional_schedules
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `,
  },
  {
    name: '011_create_schedule_blocks',
    sql: `
      CREATE TABLE IF NOT EXISTS professional_schedule_blocks (
        id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        block_date      DATE NOT NULL,
        start_time      TIME,
        end_time        TIME,
        reason          TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_schedule_blocks_pro_date ON professional_schedule_blocks(professional_id, block_date);
    `,
  },
  {
    name: '012_create_commission_rates',
    sql: `
      CREATE TABLE IF NOT EXISTS professional_service_commissions (
        id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        professional_id       UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
        service_id            UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        commission_percentage NUMERIC(5,2) NOT NULL CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
        created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(professional_id, service_id)
      );
      CREATE INDEX IF NOT EXISTS idx_pro_service_commissions_pro ON professional_service_commissions(professional_id);
      CREATE INDEX IF NOT EXISTS idx_pro_service_commissions_svc ON professional_service_commissions(service_id);
      DO $$ BEGIN
        CREATE TRIGGER update_pro_service_commissions_updated_at
          BEFORE UPDATE ON professional_service_commissions
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `,
  },
  {
    name: '013_create_commission_records',
    sql: `
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
      CREATE INDEX IF NOT EXISTS idx_commission_records_pro    ON commission_records(professional_id);
      CREATE INDEX IF NOT EXISTS idx_commission_records_status ON commission_records(status);
      CREATE INDEX IF NOT EXISTS idx_commission_records_date   ON commission_records(created_at DESC);
      DO $$ BEGIN
        CREATE TRIGGER update_commission_records_updated_at
          BEFORE UPDATE ON commission_records
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `,
  },
  {
    name: '014_create_whatsapp',
    sql: `
      CREATE TABLE IF NOT EXISTS whatsapp_config (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider      TEXT NOT NULL DEFAULT 'evolution',
        api_url       TEXT,
        api_key       TEXT,
        instance_name TEXT,
        is_active     BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS whatsapp_templates (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trigger    TEXT NOT NULL UNIQUE,
        name       TEXT NOT NULL,
        message    TEXT NOT NULL,
        is_active  BOOLEAN NOT NULL DEFAULT TRUE,
        delay_days INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS whatsapp_message_log (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        trigger        TEXT,
        recipient_id   UUID,
        recipient_name TEXT,
        phone          TEXT NOT NULL,
        message        TEXT NOT NULL,
        status         TEXT NOT NULL DEFAULT 'sent',
        error          TEXT,
        sent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_wpp_log_sent ON whatsapp_message_log(sent_at DESC);

      INSERT INTO whatsapp_templates (trigger, name, message, delay_days) VALUES
        ('agendamento_confirmado', 'Confirmação de Agendamento',
         'Olá {{nome}}! ✅ Seu agendamento foi confirmado para *{{data}}* às *{{hora}}* com {{profissional}}. Te esperamos! 🌸',
         0),
        ('lembrete_24h', 'Lembrete 24h antes',
         'Olá {{nome}}! 🔔 Lembrando do seu agendamento *amanhã, {{data}}* às *{{hora}}* com {{profissional}}. Até logo! 😊',
         0),
        ('aniversario', 'Feliz Aniversário',
         'Feliz aniversário, {{nome}}! 🎂🎉 Toda a equipe do Studio Fernanda Correa deseja um dia lindo cheio de alegria e saúde!',
         0),
        ('retencao_30', 'Retenção — 30 dias',
         'Olá {{nome}}! 💕 Sentimos sua falta! Faz {{dias}} dias desde sua última visita. Que tal agendar um horário e se mimar? 😍',
         30),
        ('retencao_60', 'Retenção — 60 dias',
         'Oi {{nome}}! 🌸 Já faz {{dias}} dias que não te vemos. Estamos com novidades por aqui! Agende seu horário e volte a se cuidar.',
         60),
        ('retencao_15', 'Retenção — 15 dias',
         'Olá, {{nome}}! 💅 Está chegando a hora de renovar o seu {{servico}}. Que tal já garantir o seu horário? Estamos te esperando! 🌸',
         15),
        ('pos_atendimento', 'Avaliação pós-atendimento',
         'Olá {{nome}}! Esperamos que tenha amado seu atendimento! ⭐ Conta pra gente como foi e deixe sua avaliação no app. 💬',
         0)
      ON CONFLICT (trigger) DO NOTHING;
    `,
  },
];

export async function runMigrations(): Promise<void> {
  if (!hasSupabase) return;

  const { env } = await import('../config/env');
  const url = env.SUPABASE_URL!;
  const key = env.SUPABASE_SERVICE_KEY!;

  // Ensure migrations tracking table exists (best-effort)
  await runSql(url, key, `
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const m of MIGRATIONS) {
    // Check if already ran
    const checkRes = await fetch(`${url}/rest/v1/_migrations?name=eq.${encodeURIComponent(m.name)}&select=name`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    });

    if (checkRes.ok) {
      const rows = await checkRes.json();
      if (Array.isArray(rows) && rows.length > 0) continue; // already ran
    }

    // Run migration
    const ok = await runSql(url, key, m.sql);
    if (ok) {
      // Mark as ran
      await fetch(`${url}/rest/v1/_migrations`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ name: m.name }),
      });
      console.log(`[migrate] ✓ ${m.name}`);
    }
  }
}

async function runSql(url: string, key: string, sql: string): Promise<boolean> {
  // Try pg-meta endpoint (Supabase Studio internal)
  const pgMetaRes = await fetch(`${url}/pg-meta/v1/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'x-connection-encrypted': 'true',
    },
    body: JSON.stringify({ query: sql }),
  }).catch(() => null);

  if (pgMetaRes?.ok) return true;

  // Fallback: try RPC exec_sql (only works if function exists)
  const rpcRes = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ query: sql }),
  }).catch(() => null);

  if (rpcRes?.ok) return true;

  console.warn(`[migrate] Could not run migration via API — run manually in Supabase SQL Editor:\n  ${sql}`);
  return false;
}
