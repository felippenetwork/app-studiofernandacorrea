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
