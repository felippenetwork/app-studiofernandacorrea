import { apiClient, USE_MOCK } from './client';

const MOCK_SETTINGS = {
  googleReviewLink: 'https://g.page/r/studiofernandacorrea/review',
};

export const settingsService = {
  async getPublicConfig(): Promise<{ googleReviewLink: string | null }> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return MOCK_SETTINGS;
    }

    const { data } = await apiClient.get('/config/public');
    return data.data ?? { googleReviewLink: null };
  },
};
