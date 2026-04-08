import { supabase } from '../../config/supabase';
import { hasSupabase } from '../../config/env';
import { DbCoupon } from '../../types';

const MOCK_COUPONS: DbCoupon[] = [
  {
    id: 'cup-1', code: 'BEM-VINDA20', title: 'Boas-vindas ao App!',
    description: '20% de desconto no seu primeiro agendamento pelo app.',
    discount_type: 'percentage', discount_value: 20, min_order_value: 80,
    max_usages: null, used_count: 0, valid_from: '2025-01-01', valid_until: '2025-12-31',
    status: 'ativo', rules: ['Válido apenas para o primeiro agendamento', 'Não acumulativo'],
    image_url: null, applicable_services: null,
    created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'cup-2', code: 'ANIVERSARIO', title: 'Cupom de Aniversário',
    description: 'R$ 50,00 de desconto no mês do seu aniversário.',
    discount_type: 'fixed', discount_value: 50, min_order_value: 100,
    max_usages: null, used_count: 0, valid_from: '2025-04-01', valid_until: '2025-04-30',
    status: 'ativo', rules: ['Válido apenas no mês do aniversário'],
    image_url: null, applicable_services: null,
    created_at: '2025-04-01T00:00:00Z', updated_at: '2025-04-01T00:00:00Z',
  },
  {
    id: 'cup-3', code: 'CABELO10', title: '10% em Serviços de Cabelo',
    description: 'Desconto especial em todos os serviços de cabelo.',
    discount_type: 'percentage', discount_value: 10, min_order_value: null,
    max_usages: null, used_count: 0, valid_from: '2025-04-01', valid_until: '2025-04-15',
    status: 'ativo', rules: ['Válido apenas para serviços de cabelo'],
    image_url: null, applicable_services: ['svc-1', 'svc-2', 'svc-3'],
    created_at: '2025-04-01T00:00:00Z', updated_at: '2025-04-01T00:00:00Z',
  },
];

export const couponsRepository = {
  async findAll(): Promise<DbCoupon[]> {
    if (!hasSupabase) return MOCK_COUPONS;

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .eq('status', 'ativo')
      .lte('valid_from', today)
      .gte('valid_until', today)
      .order('created_at', { ascending: false });

    return (data ?? []) as DbCoupon[];
  },

  async findById(id: string): Promise<DbCoupon | null> {
    if (!hasSupabase) return MOCK_COUPONS.find((c) => c.id === id) ?? null;

    const { data } = await supabase.from('coupons').select('*').eq('id', id).maybeSingle();
    return data as DbCoupon | null;
  },

  async findByCode(code: string): Promise<DbCoupon | null> {
    if (!hasSupabase) {
      return MOCK_COUPONS.find((c) => c.code.toLowerCase() === code.toLowerCase()) ?? null;
    }

    const { data } = await supabase
      .from('coupons')
      .select('*')
      .ilike('code', code)
      .maybeSingle();

    return data as DbCoupon | null;
  },

  async hasUserRedeemed(userId: string, couponId: string): Promise<boolean> {
    if (!hasSupabase) return false;

    const { data } = await supabase
      .from('coupon_redemptions')
      .select('id')
      .eq('user_id', userId)
      .eq('coupon_id', couponId)
      .maybeSingle();

    return !!data;
  },

  async redeem(userId: string, couponId: string, appointmentId?: string): Promise<void> {
    if (!hasSupabase) return;

    await supabase.from('coupon_redemptions').insert({
      user_id: userId,
      coupon_id: couponId,
      appointment_id: appointmentId ?? null,
    });

    // Increment used_count
    await supabase.rpc('increment_coupon_usage', { coupon_id: couponId });
  },
};
