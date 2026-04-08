import { apiClient, USE_MOCK } from './client';
import { Service, Professional } from '../../types';
import { MOCK_SERVICES, MOCK_PROFESSIONALS, MOCK_TIME_SLOTS } from '../../mocks/data';

export const servicesService = {
  async getServices(): Promise<Service[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      return MOCK_SERVICES;
    }
    const { data } = await apiClient.get('/trinks/services');
    // Map Trinks response to our Service type
    return (data.data as any[]).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description ?? '',
      price: s.price,
      duration: s.duration,
      category: s.category ?? 'outros',
      image: s.image_url ?? null,
      active: s.active,
    }));
  },

  async getProfessionals(serviceId?: string): Promise<Professional[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      return MOCK_PROFESSIONALS;
    }
    const params = serviceId ? { serviceId } : {};
    const { data } = await apiClient.get('/trinks/professionals', { params });
    return (data.data as any[]).map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.photo ?? null,
      specialties: p.services ?? [],
      bio: p.bio ?? '',
      rating: p.rating ?? 5.0,
      reviewCount: p.review_count ?? 0,
    }));
  },

  async getAvailableSlots(
    professionalId: string,
    serviceId: string,
    date: string
  ): Promise<{ time: string; available: boolean }[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      return MOCK_TIME_SLOTS;
    }
    const { data } = await apiClient.get('/appointments/available-slots', {
      params: { professionalId, serviceId, date },
    });
    return data.data;
  },
};
