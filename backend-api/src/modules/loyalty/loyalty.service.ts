import { createClient } from '@supabase/supabase-js';
import { env, hasSupabase } from '../../config/env';
import { pushService } from '../../services/push.service';

const supabase = hasSupabase
  ? createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_KEY!)
  : null as any;

export interface LoyaltySettings {
  isActive: boolean;
  pointsPerReal: number;
  silverThreshold: number;
  goldThreshold: number;
  redemptionThreshold: number;
  bronzeDiscount: number;
  silverDiscount: number;
  goldDiscount: number;
  couponValidityDays: number;
}

export type LoyaltyTier = 'bronze' | 'prata' | 'ouro';

const defaultSettings: LoyaltySettings = {
  isActive: false,
  pointsPerReal: 1,
  silverThreshold: 500,
  goldThreshold: 2000,
  redemptionThreshold: 200,
  bronzeDiscount: 5,
  silverDiscount: 10,
  goldDiscount: 15,
  couponValidityDays: 30,
};

function getTier(lifetimePoints: number, s: LoyaltySettings): LoyaltyTier {
  if (lifetimePoints >= s.goldThreshold) return 'ouro';
  if (lifetimePoints >= s.silverThreshold) return 'prata';
  return 'bronze';
}

function mapSettings(d: any): LoyaltySettings {
  return {
    isActive:            d.is_active,
    pointsPerReal:       Number(d.points_per_real),
    silverThreshold:     d.silver_threshold,
    goldThreshold:       d.gold_threshold,
    redemptionThreshold: d.redemption_threshold,
    bronzeDiscount:      Number(d.bronze_discount),
    silverDiscount:      Number(d.silver_discount),
    goldDiscount:        Number(d.gold_discount),
    couponValidityDays:  d.coupon_validity_days,
  };
}

export const loyaltyService = {
  async getSettings(): Promise<LoyaltySettings> {
    if (!hasSupabase) return defaultSettings;
    const { data } = await supabase.from('loyalty_settings').select('*').limit(1).maybeSingle();
    return data ? mapSettings(data) : defaultSettings;
  },

  async updateSettings(input: Partial<LoyaltySettings>): Promise<LoyaltySettings> {
    if (!hasSupabase) { Object.assign(defaultSettings, input); return defaultSettings; }
    const { data: existing } = await supabase.from('loyalty_settings').select('id').limit(1).maybeSingle();

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (input.isActive            !== undefined) updates.is_active            = input.isActive;
    if (input.pointsPerReal       !== undefined) updates.points_per_real      = input.pointsPerReal;
    if (input.silverThreshold     !== undefined) updates.silver_threshold     = input.silverThreshold;
    if (input.goldThreshold       !== undefined) updates.gold_threshold       = input.goldThreshold;
    if (input.redemptionThreshold !== undefined) updates.redemption_threshold = input.redemptionThreshold;
    if (input.bronzeDiscount      !== undefined) updates.bronze_discount      = input.bronzeDiscount;
    if (input.silverDiscount      !== undefined) updates.silver_discount      = input.silverDiscount;
    if (input.goldDiscount        !== undefined) updates.gold_discount        = input.goldDiscount;
    if (input.couponValidityDays  !== undefined) updates.coupon_validity_days = input.couponValidityDays;

    if (existing?.id) {
      await supabase.from('loyalty_settings').update(updates).eq('id', existing.id);
    } else {
      await supabase.from('loyalty_settings').insert({ is_active: false, ...updates });
    }
    return this.getSettings();
  },

  // ─── Award points when appointment is concluded ───────────────────────────
  async awardPoints(userId: string, appointmentId: string, amountPaid: number): Promise<void> {
    if (!hasSupabase) return;

    const settings = await this.getSettings();
    if (!settings.isActive) return;

    // Idempotency: skip if already awarded for this appointment
    const { data: existing } = await supabase
      .from('loyalty_points')
      .select('id')
      .eq('appointment_id', appointmentId)
      .gt('points', 0)
      .maybeSingle();
    if (existing) return;

    const pointsEarned = Math.floor(amountPaid * settings.pointsPerReal);
    if (pointsEarned <= 0) return;

    // Current balance
    const { data: txs } = await supabase.from('loyalty_points').select('points').eq('user_id', userId);
    const currentBalance = (txs ?? []).reduce((s: number, r: any) => s + Number(r.points), 0);
    const newBalance = currentBalance + pointsEarned;

    await supabase.from('loyalty_points').insert({
      user_id:        userId,
      appointment_id: appointmentId,
      points:         pointsEarned,
      balance_after:  newBalance,
      description:    `Atendimento concluído — +${pointsEarned} pts`,
    });

    // Check auto-redemption
    if (newBalance >= settings.redemptionThreshold) {
      await this._autoRedeem(userId, newBalance, settings).catch((e) =>
        console.error('[loyalty] auto-redeem error:', e)
      );
    }
  },

  async _autoRedeem(userId: string, balance: number, settings: LoyaltySettings): Promise<void> {
    const { data: user } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', userId)
      .maybeSingle();
    if (!user) return;

    // Lifetime points for tier calculation
    const { data: earnedTxs } = await supabase
      .from('loyalty_points')
      .select('points')
      .eq('user_id', userId)
      .gt('points', 0);
    const lifetimePoints = (earnedTxs ?? []).reduce((s: number, r: any) => s + Number(r.points), 0);
    const tier = getTier(lifetimePoints, settings);

    const discountMap: Record<LoyaltyTier, number> = {
      bronze: settings.bronzeDiscount,
      prata:  settings.silverDiscount,
      ouro:   settings.goldDiscount,
    };
    const tierLabel: Record<LoyaltyTier, string> = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro' };
    const discountValue = discountMap[tier];
    const firstName = (user.name as string)?.split(' ')[0] ?? 'Cliente';

    const code = `FIEL${tier.toUpperCase()}${userId.slice(0, 5).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + settings.couponValidityDays);

    const { data: coupon, error } = await supabase.from('coupons').insert({
      code,
      title:          `Fidelidade ${tierLabel[tier]} — ${firstName}`,
      description:    `Resgate de pontos — Nível ${tierLabel[tier]} do Programa de Fidelidade.`,
      discount_type:  'percentage',
      discount_value: discountValue,
      max_usages:     1,
      valid_from:     new Date().toISOString().slice(0, 10),
      valid_until:    validUntil.toISOString().slice(0, 10),
      status:         'ativo',
      rules:          [`Válido para um agendamento`, `Exclusivo para ${firstName}`, 'Intransferível'],
    }).select('id').single();

    if (error) { console.error('[loyalty] coupon insert error:', error); return; }

    const newBalance = balance - settings.redemptionThreshold;
    await supabase.from('loyalty_points').insert({
      user_id:       userId,
      points:        -settings.redemptionThreshold,
      balance_after: newBalance,
      description:   `Resgate automático — cupom ${code} (-${settings.redemptionThreshold} pts)`,
    });

    await supabase.from('loyalty_redemptions').insert({
      user_id:     userId,
      coupon_id:   coupon.id,
      points_used: settings.redemptionThreshold,
      coupon_code: code,
    });

    await pushService.newCoupon(
      userId,
      `Parabéns! Você ganhou um cupom de fidelidade ${tierLabel[tier]}! 🎉`,
      code,
    ).catch(() => {});

    console.log(`[loyalty] Auto-redeem: user=${userId} tier=${tier} coupon=${code}`);
  },

  // ─── Ranking for admin ────────────────────────────────────────────────────
  async getCustomersRanking(limit = 100) {
    if (!hasSupabase) return [];

    const settings = await this.getSettings();

    const { data: txs } = await supabase
      .from('loyalty_points')
      .select('user_id, points')
      .order('created_at', { ascending: true });

    if (!txs?.length) return [];

    const userMap = new Map<string, { balance: number; lifetime: number }>();
    for (const r of txs as any[]) {
      const cur = userMap.get(r.user_id) ?? { balance: 0, lifetime: 0 };
      const pts = Number(r.points);
      cur.balance += pts;
      if (pts > 0) cur.lifetime += pts;
      userMap.set(r.user_id, cur);
    }

    const userIds = [...userMap.keys()];
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email, phone')
      .in('id', userIds);

    return (users ?? [])
      .map((u: any) => {
        const pts = userMap.get(u.id) ?? { balance: 0, lifetime: 0 };
        return {
          userId:        u.id,
          name:          u.name ?? '—',
          email:         u.email ?? '—',
          balance:       pts.balance,
          lifetimePoints: pts.lifetime,
          tier:          getTier(pts.lifetime, settings),
        };
      })
      .filter((u: any) => u.lifetimePoints > 0)
      .sort((a: any, b: any) => b.lifetimePoints - a.lifetimePoints)
      .slice(0, limit);
  },

  // ─── Points history for a user ────────────────────────────────────────────
  async getUserHistory(userId: string) {
    if (!hasSupabase) return [];
    const { data } = await supabase
      .from('loyalty_points')
      .select('id, points, balance_after, description, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    return data ?? [];
  },
};
