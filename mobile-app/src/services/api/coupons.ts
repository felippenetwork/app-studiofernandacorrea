import { apiClient } from './client';
import { Coupon } from '../../types';
import { MOCK_COUPONS } from '../../mocks/data';

const USE_MOCK = true;

export const couponsService = {
  async getCoupons(): Promise<Coupon[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      return MOCK_COUPONS;
    }
    const { data } = await apiClient.get('/coupons');
    return data.data;
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
    return data.data;
  },

  async redeemCoupon(couponId: string, appointmentId: string): Promise<void> {
    if (!USE_MOCK) {
      await apiClient.post('/coupons/redeem', { couponId, appointmentId });
    }
  },
};
