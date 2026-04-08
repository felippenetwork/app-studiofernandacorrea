import { apiClient, USE_MOCK } from './client';
import { Service, Professional } from '../../types';
import { MOCK_SERVICES, MOCK_PROFESSIONALS, MOCK_TIME_SLOTS } from '../../mocks/data';

function mapService(s: any): Service {
  return {
    id: s.id,
    name: s.name,
    description: s.description ?? '',
    price: s.price,
    durationMinutes: s.duration_minutes ?? s.duration ?? 60,
    category: s.category ?? 'outros',
    imageUrl: s.image_url ?? undefined,
    isActive: s.is_active ?? s.active ?? true,
  };
}

function mapProfessional(p: any): Professional {
  return {
    id: p.id,
    name: p.name,
    avatarUrl: p.avatar_url ?? p.photo ?? undefined,
    specialties: p.specialties ?? p.services ?? [],
    rating: p.rating ?? 5.0,
    reviewCount: p.review_count ?? 0,
    bio: p.bio ?? undefined,
    isActive: p.is_active ?? true,
  };
}

export const servicesService = {
  async getServices(): Promise<Service[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      return MOCK_SERVICES;
    }
    const { data } = await apiClient.get('/trinks/services');
    return (data.data as any[]).map(mapService);
  },

  async getProfessionals(serviceId?: string): Promise<Professional[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      return MOCK_PROFESSIONALS;
    }
    const params = serviceId ? { serviceId } : {};
    const { data } = await apiClient.get('/trinks/professionals', { params });
    return (data.data as any[]).map(mapProfessional);
  },

  async getAvailableSlots(
    professionalId: string,
    serviceId: string,
    date: string
  ): Promise<{ time: string; available: boolean }[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      return MOCK_TIME_SLOTS;
    }
    const { data } = await apiClient.get('/appointments/available-slots', {
      params: { professionalId, serviceId, date },
    });
    return data.data;
  },
};
