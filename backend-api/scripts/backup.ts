/**
 * Script de backup manual — exporta todas as tabelas para JSON
 * Uso: npx ts-node scripts/backup.ts
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const TABLES = [
  'users', 'admin_users', 'services', 'professionals',
  'appointments', 'payments', 'coupons', 'coupon_redemptions',
  'benefits', 'notifications', 'admin_notifications',
  'push_tokens', 'push_campaigns', 'feedback',
  'audit_logs', 'birthday_settings', 'birthday_logs',
  'app_settings', 'trinks_webhook_events',
];

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.join(__dirname, '..', 'backups');

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const result: Record<string, any[]> = {};
  let totalRows = 0;

  console.log(`\n📦 Backup iniciado — ${new Date().toLocaleString('pt-BR')}\n`);

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.log(`  ⚠️  ${table}: ${error.message}`);
      result[table] = [];
    } else {
      result[table] = data ?? [];
      totalRows += data?.length ?? 0;
      console.log(`  ✓  ${table}: ${data?.length ?? 0} registros`);
    }
  }

  const filename = path.join(dir, `backup-${timestamp}.json`);
  fs.writeFileSync(filename, JSON.stringify({ exportedAt: new Date().toISOString(), tables: result }, null, 2));

  console.log(`\n✅ Backup salvo em: ${filename}`);
  console.log(`   Total de registros: ${totalRows}\n`);
}

backup().catch(console.error);
