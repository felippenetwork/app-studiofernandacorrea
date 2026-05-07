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
