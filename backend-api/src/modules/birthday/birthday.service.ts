import { hasSupabase } from '../../config/env';
import { supabase } from '../../config/supabase';
import { pushService } from '../../services/push.service';

export interface BirthdaySettings {
  isActive: boolean;
  couponType: 'percentage' | 'fixed';
  couponValue: number;
  couponValidityDays: number;
  pushMessage: string;
  sendHour: number;
}

const defaultSettings: BirthdaySettings = {
  isActive: false,
  couponType: 'fixed',
  couponValue: 20,
  couponValidityDays: 30,
  pushMessage: 'Feliz aniversário! Temos um presente especial para você. 🎂',
  sendHour: 8,
};

export const birthdayService = {
  async getSettings(): Promise<BirthdaySettings> {
    if (!hasSupabase) return defaultSettings;

    const { data } = await supabase
      .from('birthday_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (!data) return defaultSettings;

    return {
      isActive: (data as any).is_active,
      couponType: (data as any).coupon_type,
      couponValue: Number((data as any).coupon_value),
      couponValidityDays: (data as any).coupon_validity_days,
      pushMessage: (data as any).push_message,
      sendHour: (data as any).send_hour,
    };
  },

  async updateSettings(settings: Partial<BirthdaySettings>): Promise<BirthdaySettings> {
    if (!hasSupabase) {
      Object.assign(defaultSettings, settings);
      return defaultSettings;
    }

    const updates: Record<string, any> = {};
    if (settings.isActive !== undefined)          updates.is_active = settings.isActive;
    if (settings.couponType !== undefined)         updates.coupon_type = settings.couponType;
    if (settings.couponValue !== undefined)        updates.coupon_value = settings.couponValue;
    if (settings.couponValidityDays !== undefined) updates.coupon_validity_days = settings.couponValidityDays;
    if (settings.pushMessage !== undefined)        updates.push_message = settings.pushMessage;
    if (settings.sendHour !== undefined)           updates.send_hour = settings.sendHour;

    await supabase.from('birthday_settings').update(updates).not('id', 'is', null);
    return this.getSettings();
  },

  // Returns { day: [name, name, ...] } for all users born in the given month
  async getCalendar(month: number): Promise<Record<number, string[]>> {
    if (!hasSupabase) {
      return { 5: ['Ana Paula Santos'], 12: ['Carla Mendes'], 20: ['Bianca Oliveira', 'Fernanda Lima'], 28: ['Julia Costa'] };
    }

    // Fetch ALL users with birth_date set and filter by month in JS.
    // Avoids using LIKE on a DATE column — PostgreSQL requires an explicit
    // ::text cast for LIKE on DATE types, which Supabase JS does not expose.
    const { data } = await supabase
      .from('users')
      .select('name, birth_date')
      .not('birth_date', 'is', null);

    const result: Record<number, string[]> = {};
    for (const user of (data ?? []) as { name: string; birth_date: string }[]) {
      const parts = user.birth_date.split('T')[0].split('-'); // handle "YYYY-MM-DDT..." too
      const userMonth = parseInt(parts[1], 10);
      if (userMonth !== month) continue;
      const day = parseInt(parts[2], 10);
      if (!result[day]) result[day] = [];
      result[day].push(user.name);
    }
    return result;
  },

  async runBirthdayAutomation(): Promise<{ processed: number; skipped: number }> {
    const settings = await this.getSettings();
    if (!settings.isActive && hasSupabase) {
      return { processed: 0, skipped: 0 };
    }

    if (!hasSupabase) {
      console.log('[birthday] Mock run: automation not executed without Supabase.');
      return { processed: 0, skipped: 0 };
    }

    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const year = today.getFullYear();

    // Fetch all users with birth_date and filter in JS — LIKE on DATE columns
    // fails silently in PostgreSQL without an explicit ::text cast.
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, name, email, birth_date')
      .not('birth_date', 'is', null);

    const users = (allUsers ?? []).filter((u: any) => {
      const parts = (u.birth_date as string).split('T')[0].split('-');
      return parseInt(parts[1], 10) === month && parseInt(parts[2], 10) === day;
    });

    if (!users.length) return { processed: 0, skipped: 0 };

    let processed = 0;
    let skipped = 0;

    for (const user of users as any[]) {
      const ok = await this._processUserBirthday(user, settings, year);
      if (ok) processed++; else skipped++;
    }

    console.log(`[birthday] Automation ran: ${processed} processed, ${skipped} skipped.`);
    return { processed, skipped };
  },

  // Sends birthday coupon + push for a single user. Returns true if processed,
  // false if already sent this year or on error.
  async _processUserBirthday(
    user: { id: string; name: string; email: string },
    settings: BirthdaySettings,
    year: number
  ): Promise<boolean> {
    const { data: existing } = await supabase
      .from('birthday_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('year', year)
      .maybeSingle();

    if (existing) return false;

    const code = `ANIV${year}${user.id.slice(0, 6).toUpperCase()}`;
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + settings.couponValidityDays);

    const { data: coupon, error: couponError } = await supabase
      .from('coupons')
      .insert({
        code,
        title: `Cupom de Aniversário — ${user.name.split(' ')[0]}`,
        description: 'Presente especial de aniversário do Studio Fernanda Correa.',
        discount_type: settings.couponType,
        discount_value: settings.couponValue,
        max_usages: 1,
        valid_from: validFrom.toISOString().slice(0, 10),
        valid_until: validUntil.toISOString().slice(0, 10),
        status: 'ativo',
        rules: ['Válido para um agendamento', 'Intransferível'],
      })
      .select()
      .single();

    if (couponError) {
      console.error('[birthday] Coupon creation error:', couponError);
      return false;
    }

    await supabase.from('birthday_logs').insert({ user_id: user.id, coupon_id: (coupon as any).id, year });
    await pushService.newCoupon(user.id, `Feliz Aniversário! 🎂`, code).catch(() => {});

    return true;
  },

  // Called when a user registers or updates their birth_date.
  // If today is their birthday and automation is active, processes immediately.
  async onUserBirthdateChanged(userId: string, name: string, birthDate: string | null): Promise<void> {
    if (!hasSupabase || !birthDate) return;

    const settings = await this.getSettings();
    if (!settings.isActive) return;

    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const year = today.getFullYear();

    const parts = birthDate.split('T')[0].split('-');
    const userMonth = parseInt(parts[1], 10);
    const userDay = parseInt(parts[2], 10);

    if (userMonth !== month || userDay !== day) return;

    // It's their birthday today — fetch full record and process
    const { data: user } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', userId)
      .maybeSingle();

    if (!user) return;

    const processed = await this._processUserBirthday(user as any, settings, year);
    if (processed) {
      console.log(`[birthday] Birthday processed on registration/update: ${name}`);
    }
  },

  // Daily audit: counts all users with birth_date and logs a summary.
  async auditCalendar(): Promise<{ total: number; thisMonth: number; today: number }> {
    if (!hasSupabase) return { total: 0, thisMonth: 0, today: 0 };

    const { data: allUsers } = await supabase
      .from('users')
      .select('id, birth_date')
      .not('birth_date', 'is', null);

    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    let thisMonth = 0;
    let today = 0;

    for (const u of (allUsers ?? []) as { id: string; birth_date: string }[]) {
      const parts = u.birth_date.split('T')[0].split('-');
      const uMonth = parseInt(parts[1], 10);
      const uDay = parseInt(parts[2], 10);
      if (uMonth === month) thisMonth++;
      if (uMonth === month && uDay === day) today++;
    }

    const total = (allUsers ?? []).length;
    console.log(`[birthday] Audit: ${total} clientes com aniversário cadastrado — ${thisMonth} neste mês, ${today} hoje.`);
    return { total, thisMonth, today };
  },
};
