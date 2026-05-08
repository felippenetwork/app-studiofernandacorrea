/**
 * Cron Scheduler — Studio Fernanda Correa API
 *
 * Schedules:
 *   - Birthday automation: hourly check — fires when current BRT hour matches
 *     the sendHour saved in birthday_settings (configurable via admin panel).
 *
 * Timezone: All crons run in America/Sao_Paulo (UTC-3).
 */

import cron from 'node-cron';
import { birthdayService } from './modules/birthday/birthday.service';
import { adminService } from './modules/admin/admin.service';
import { trinksSync } from './modules/trinks/trinks.sync';
import { pushService } from './services/push.service';
import { supabase } from './config/supabase';
import { hasSupabase } from './config/env';

export function startCronJobs(): void {
  // ─── Birthday automation — hourly check, hour read from DB settings ──────────
  // Fires every hour on the minute :00. Inside, reads sendHour from
  // birthday_settings and only runs if the current BRT hour matches.
  // This means any change to sendHour in the admin panel takes effect
  // automatically — no server restart needed.
  cron.schedule(
    '0 * * * *',
    async () => {
      try {
        const settings = await birthdayService.getSettings();
        if (!settings.isActive) return;

        // Determine current hour in BRT regardless of server timezone
        const currentHourBRT = parseInt(
          new Intl.DateTimeFormat('en', {
            timeZone: 'America/Sao_Paulo',
            hour: 'numeric',
            hour12: false,
          }).format(new Date()),
          10
        );

        if (currentHourBRT !== settings.sendHour) return;

        console.log(`[cron] Birthday automation started at ${currentHourBRT}h BRT —`, new Date().toISOString());
        const result = await birthdayService.runBirthdayAutomation();
        console.log(`[cron] Birthday automation complete: ${result.processed} processed, ${result.skipped} skipped.`);
      } catch (err) {
        console.error('[cron] Birthday automation error:', (err as Error).message);
      }
    },
    { timezone: 'America/Sao_Paulo' }
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

  // ─── Trinks can_post sync — daily at 03:00 BRT ────────────────────────────
  cron.schedule(
    '0 3 * * *',
    async () => {
      console.log('[cron] Trinks can_post sync started —', new Date().toISOString());
      try {
        const result = await trinksSync.syncCanPost();
        console.log(`[cron] Trinks can_post sync complete: checked=${result.checked}, granted=${result.granted}`);
      } catch (err) {
        console.error('[cron] Trinks can_post sync error:', (err as Error).message);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );

  // ─── Birthday calendar audit — daily at 00:01 BRT ─────────────────────────
  // Reads all users with birth_date and logs how many are registered,
  // how many have birthdays this month, and how many today.
  // Ensures the calendar is always consistent with the users table.
  cron.schedule(
    '1 0 * * *',
    async () => {
      try {
        await birthdayService.auditCalendar();
      } catch (err) {
        console.error('[cron] Birthday audit error:', (err as Error).message);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );

  // ─── Recurring push campaigns — every 15 min ──────────────────────────────
  // Checks for recurring campaigns whose next_send is in the past and fires them.
  cron.schedule(
    '*/15 * * * *',
    async () => {
      try {
        const result = await adminService.processRecurringCampaigns();
        if (result.processed > 0) {
          console.log(`[cron] Recurring campaigns: ${result.processed} sent.`);
        }
      } catch (err) {
        console.error('[cron] Recurring campaigns error:', (err as Error).message);
      }
    },
    { timezone: 'America/Sao_Paulo' }
  );

  console.log('   Cron jobs   : ✓ birthday @ configurable BRT hour');
  console.log('                 ✓ birthday calendar audit @ 00:01 BRT');
  console.log('                 ✓ trinks sync every 6 h');
  console.log('                 ✓ trinks can_post sync @ 03:00 BRT');
  console.log('                 ✓ review push every 30 min');
  console.log('                 ✓ recurring push campaigns every 15 min');
}
