import { apiClient, USE_MOCK } from './client';

export interface LoyaltyInfo {
  pointsActive: boolean;
  visitRewardActive: boolean;
  tier: 'bronze' | 'prata' | 'ouro';
  balance: number;
  lifetimePoints: number;
  redemptionThreshold: number;
  nextTierPoints: number | null;
  visitCount: number;
  visitRewardCount: number;
  visitRewardDiscountType: 'percentage' | 'fixed';
  visitRewardDiscountValue: number;
}

export const loyaltyService = {
  async getMyLoyalty(): Promise<LoyaltyInfo | null> {
    if (USE_MOCK) return null;
    const { data } = await apiClient.get('/users/loyalty');
    return data.data as LoyaltyInfo | null;
  },
};
