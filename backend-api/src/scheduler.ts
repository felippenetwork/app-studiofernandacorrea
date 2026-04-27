/**
 * Cron Scheduler — Studio Fernanda Correa API
 *
 * Schedules:
 *   - Birthday automation: daily at 08:00 BRT (America/Sao_Paulo)
 *
 * Timezone: All crons run in America/Sao_Paulo (UTC-3).
 * In production, ensure the server timezone or the cron timezone arg is correct.
 *
 * To disable a job without removing code, set the corresponding env var or
 * admin setting to inactive.
 */

import cron from 'node-cron';
import { birthdayService } from './modules/birthday/birthday.service';
import { trinksSync } from './modules/trinks/trinks.sync';

export function startCronJobs(): void {
  // ─── Birthday automation — daily at 08:00 BRT ──────────────────────────────
  // Cron expression: "0 8 * * *"  →  every day at 08:00
  cron.schedule(
    '0 8 * * *',
    async () => {
      console.log('[cron] Birthday automation started —', new Date().toISOString());
      try {
        const result = await birthdayService.runBirthdayAutomation();
        console.log(`[cron] Birthday automation complete: ${result.processed} processed, ${result.skipped} skipped.`);
      } catch (err) {
        console.error('[cron] Birthday automation error:', (err as Error).message);
      }
    },
    {
      timezone: 'America/Sao_Paulo',
    }
  );

  // ─── Trinks sync — every 6 hours ──────────────────────────────────────────
  // Keeps local services and professionals tables in sync with Trinks catalog.
  cron.schedule(
    '0 */6 * * *',
    async () => {
      console.log('[cron] Trinks sync started —', new Date().toISOString());
      try {
        await trinksSync.runFullSync();
      } catch (err) {
        console.error('[cron] Trinks sync error:', (err as Error).message);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );

  console.log('   Cron jobs   : ✓ birthday @ 08:00 BRT');
  console.log('                 ✓ trinks sync every 6 h');
}
