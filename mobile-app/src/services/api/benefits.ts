import { apiClient, USE_MOCK } from './client';
import { Benefit } from '../../types';
import { MOCK_BENEFITS } from '../../mocks/data';

export const benefitsService = {
  async getBenefits(): Promise<Benefit[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      return MOCK_BENEFITS;
    }

    const { data } = await apiClient.get('/benefits');
    return (data.data as any[]).map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      type: b.type,
      imageUrl: b.image_url ?? undefined,
      cta: b.cta ?? undefined,
      ctaLink: b.cta_link ?? undefined,
      validUntil: b.valid_until ?? undefined,
      isActive: b.is_active,
    }));
  },
};
