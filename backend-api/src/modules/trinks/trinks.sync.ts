/**
 * Trinks Sync — pulls services and professionals from the Trinks API
 * and upserts them into the local Supabase tables so the mobile app
 * always reflects the salon's current catalog.
 *
 * Called by:
 *   - scheduler.ts (cron every 6 h)
 *   - POST /api/trinks/sync (admin manual trigger)
 */

import { trinksService } from './trinks.service';
import { hasTrinks, hasSupabase } from '../../config/env';

export interface SyncResult {
  services: { synced: number; errors: number };
  professionals: { synced: number; errors: number };
  timestamp: string;
}

export const trinksSync = {
  async syncServices(): Promise<{ synced: number; errors: number }> {
    if (!hasTrinks || !hasSupabase) {
      console.log('[trinks-sync] Skipped services sync (Trinks or Supabase not configured)');
      return { synced: 0, errors: 0 };
    }

    const { supabase } = await import('../../config/supabase');
    const services = await trinksService.getServices();

    let synced = 0;
    let errors = 0;

    for (const svc of services) {
      try {
        const { error } = await supabase
          .from('services')
          .upsert(
            {
              trinks_service_id: svc.id,
              name: svc.name,
              description: svc.description ?? null,
              price: svc.price,
              duration_minutes: svc.duration,
              category: svc.category ?? 'Geral',
              is_active: svc.active,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'trinks_service_id', ignoreDuplicates: false }
          );

        if (error) {
          console.error(`[trinks-sync] Service upsert error (id=${svc.id}):`, error.message);
          errors++;
        } else {
          synced++;
        }
      } catch (err) {
        console.error(`[trinks-sync] Service sync failed (id=${svc.id}):`, (err as Error).message);
        errors++;
      }
    }

    console.log(`[trinks-sync] Services: ${synced} synced, ${errors} errors`);
    return { synced, errors };
  },

  async syncProfessionals(): Promise<{ synced: number; errors: number }> {
    if (!hasTrinks || !hasSupabase) {
      console.log('[trinks-sync] Skipped professionals sync (Trinks or Supabase not configured)');
      return { synced: 0, errors: 0 };
    }

    const { supabase } = await import('../../config/supabase');
    const professionals = await trinksService.getProfessionals();

    let synced = 0;
    let errors = 0;

    for (const pro of professionals) {
      try {
        const { error } = await supabase
          .from('professionals')
          .upsert(
            {
              trinks_employee_id: pro.id,
              name: pro.name,
              avatar_url: pro.photo ?? null,
              is_active: pro.active,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'trinks_employee_id', ignoreDuplicates: false }
          );

        if (error) {
          console.error(`[trinks-sync] Professional upsert error (id=${pro.id}):`, error.message);
          errors++;
        } else {
          synced++;
        }
      } catch (err) {
        console.error(`[trinks-sync] Professional sync failed (id=${pro.id}):`, (err as Error).message);
        errors++;
      }
    }

    console.log(`[trinks-sync] Professionals: ${synced} synced, ${errors} errors`);
    return { synced, errors };
  },

  async runFullSync(): Promise<SyncResult> {
    console.log('[trinks-sync] Starting full sync —', new Date().toISOString());
    const [services, professionals] = await Promise.all([
      this.syncServices(),
      this.syncProfessionals(),
    ]);
    const result: SyncResult = {
      services,
      professionals,
      timestamp: new Date().toISOString(),
    };
    console.log('[trinks-sync] Full sync complete:', JSON.stringify(result));
    return result;
  },
};
