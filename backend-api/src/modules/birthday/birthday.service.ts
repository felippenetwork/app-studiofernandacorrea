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

    // Find users with birthday today and no coupon sent this year
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email')
      .not('birth_date', 'is', null)
      .filter('birth_date', 'like', `%-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);

    if (!users?.length) return { processed: 0, skipped: 0 };

    let processed = 0;
    let skipped = 0;

    for (const user of users as any[]) {
      // Check if already sent this year
      const { data: existing } = await supabase
        .from('birthday_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('year', year)
        .maybeSingle();

      if (existing) { skipped++; continue; }

      // Generate unique coupon code
      const code = `ANIV${year}${user.id.slice(0, 6).toUpperCase()}`;
      const validFrom = new Date();
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + settings.couponValidityDays);

      // Create coupon
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

      if (couponError) { console.error('[birthday] Coupon creation error:', couponError); continue; }

      // Log
      await supabase.from('birthday_logs').insert({ user_id: user.id, coupon_id: (coupon as any).id, year });

      // Push notification
      await pushService.newCoupon(user.id, `Feliz Aniversário! 🎂`, code).catch(() => {});

      processed++;
    }

    console.log(`[birthday] Automation ran: ${processed} processed, ${skipped} skipped.`);
    return { processed, skipped };
  },
};
