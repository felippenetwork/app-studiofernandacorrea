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
import { pushService } from './services/push.service';
import { supabase } from './config/supabase';
import { hasSupabase } from './config/env';

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

  // ─── Review push — every 30 minutes ──────────────────────────────────────
  // Finds concluido appointments where 2–24h have passed, no review exists,
  // and no review push was sent yet. Sends one push per appointment.
  cron.schedule(
    '*/30 * * * *',
    async () => {
      if (!hasSupabase) return;
      try {
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
        const oneDayAgo   = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

        // Find appointments: concluido, updated 2–24h ago, push not sent yet
        const { data: candidates } = await supabase
          .from('appointments')
          .select('id, user_id, updated_at, service:services(name)')
          .eq('status', 'concluido')
          .is('review_push_sent_at', null)
          .lte('updated_at', twoHoursAgo)
          .gte('updated_at', oneDayAgo)
          .limit(50);

        if (!candidates?.length) return;

        // Filter out appointments that already have a review
        const ids = candidates.map((a: any) => a.id);
        const { data: reviewed } = await supabase
          .from('reviews')
          .select('appointment_id')
          .in('appointment_id', ids);
        const reviewedIds = new Set((reviewed ?? []).map((r: any) => r.appointment_id));

        for (const appt of candidates as any[]) {
          if (reviewedIds.has(appt.id)) continue;
          const serviceName = appt.service?.name ?? 'seu serviço';
          await pushService.reviewRequest(appt.user_id, serviceName).catch(() => {});
          await supabase
            .from('appointments')
            .update({ review_push_sent_at: now.toISOString() })
            .eq('id', appt.id);
          console.log(`[cron] Review push sent → appointment ${appt.id}`);
        }
      } catch (err) {
        console.error('[cron] Review push error:', (err as Error).message);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );

  console.log('   Cron jobs   : ✓ birthday @ 08:00 BRT');
  console.log('                 ✓ trinks sync every 6 h');
  console.log('                 ✓ review push every 30 min');
}
