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
  canPost?: { granted: number; checked: number };
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

  /**
   * syncCanPost — diário às 03:00 BRT
   *
   * Busca todos os clientes no Trinks, cruza pelo telefone com os usuários
   * cadastrados no app que ainda não têm can_post = true e libera o acesso.
   */
  async syncCanPost(): Promise<{ granted: number; checked: number }> {
    if (!hasTrinks || !hasSupabase) {
      console.log('[trinks-sync] Skipped can_post sync (Trinks or Supabase not configured)');
      return { granted: 0, checked: 0 };
    }

    const { supabase } = await import('../../config/supabase');

    // Busca usuários do app que ainda não têm can_post
    const { data: appUsers } = await supabase
      .from('users')
      .select('id, phone')
      .eq('can_post', false)
      .not('phone', 'is', null);

    if (!appUsers?.length) {
      console.log('[trinks-sync] can_post sync: no pending users');
      return { granted: 0, checked: 0 };
    }

    // Busca todos os clientes do Trinks
    const trinksClients = await trinksService.getClients();
    if (!trinksClients.length) {
      console.log('[trinks-sync] can_post sync: no clients returned from Trinks');
      return { granted: 0, checked: appUsers.length };
    }

    // Normaliza os telefones do Trinks para comparação
    const trinksPhones = trinksClients
      .filter((c) => c.phone)
      .map((c) => c.phone!.replace(/\D/g, ''));

    let granted = 0;

    for (const user of appUsers) {
      const userPhone = user.phone!.replace(/\D/g, '');
      const len = Math.min(userPhone.length, 10);

      const found = trinksPhones.some((tp) => {
        const cmpLen = Math.min(tp.length, len);
        return cmpLen >= 8 && userPhone.slice(-cmpLen) === tp.slice(-cmpLen);
      });

      if (found) {
        const { error } = await supabase
          .from('users')
          .update({ can_post: true })
          .eq('id', user.id);

        if (!error) {
          granted++;
          console.log(`[trinks-sync] can_post granted → user ${user.id} (phone: ${userPhone})`);
        }
      }
    }

    console.log(`[trinks-sync] can_post sync: checked=${appUsers.length}, granted=${granted}`);
    return { granted, checked: appUsers.length };
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
