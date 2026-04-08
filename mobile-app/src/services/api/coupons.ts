import { apiClient, USE_MOCK } from './client';
import { Coupon } from '../../types';
import { MOCK_COUPONS } from '../../mocks/data';

function mapCoupon(c: any): Coupon {
  return {
    id: c.id,
    code: c.code,
    title: c.title,
    description: c.description,
    discountType: c.discount_type ?? c.discountType,
    discountValue: c.discount_value ?? c.discountValue,
    minOrderValue: c.min_order_value ?? c.minOrderValue,
    maxUsages: c.max_usages ?? c.maxUsages,
    usedCount: c.used_count ?? c.usedCount ?? 0,
    validFrom: c.valid_from ?? c.validFrom,
    validUntil: c.valid_until ?? c.validUntil,
    status: c.status,
    rules: c.rules ?? [],
    imageUrl: c.image_url ?? c.imageUrl,
    applicableServices: c.applicable_services ?? c.applicableServices,
  };
}

export const couponsService = {
  async getCoupons(): Promise<Coupon[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      return MOCK_COUPONS;
    }
    const { data } = await apiClient.get('/coupons');
    return (data.data as any[]).map(mapCoupon);
  },

  async getCouponById(id: string): Promise<Coupon | null> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return MOCK_COUPONS.find((c) => c.id === id) ?? null;
    }
    try {
      const { data } = await apiClient.get(`/coupons/${id}`);
      return mapCoupon(data.data);
    } catch {
      return null;
    }
  },

  async validateCoupon(code: string): Promise<Coupon> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      const coupon = MOCK_COUPONS.find(
        (c) => c.code.toLowerCase() === code.toLowerCase() && c.status === 'ativo'
      );
      if (!coupon) throw new Error('Cupom inválido ou expirado.');
      return coupon;
    }
    const { data } = await apiClient.post('/coupons/validate', { code });
    return mapCoupon(data.data);
  },

  async redeemCoupon(couponId: string, appointmentId: string): Promise<void> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      return;
    }
    await apiClient.post('/coupons/redeem', { couponId, appointmentId });
  },
};
