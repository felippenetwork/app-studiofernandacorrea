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

  console.log('   Cron jobs   : ✓ birthday @ 08:00 BRT (America/Sao_Paulo)');
}
