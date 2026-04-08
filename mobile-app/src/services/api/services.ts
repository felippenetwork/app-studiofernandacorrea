import { apiClient } from './client';
import { Service, Professional } from '../../types';
import { MOCK_SERVICES, MOCK_PROFESSIONALS } from '../../mocks/data';

const USE_MOCK = true;

export const servicesService = {
  async getServices(): Promise<Service[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      return MOCK_SERVICES;
    }
    const { data } = await apiClient.get('/services');
    return data.data;
  },

  async getProfessionals(serviceId?: string): Promise<Professional[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 500));
      return MOCK_PROFESSIONALS;
    }
    const { data } = await apiClient.get('/professionals', {
      params: { serviceId },
    });
    return data.data;
  },

  async getAvailableSlots(
    professionalId: string,
    date: string
  ): Promise<{ time: string; available: boolean }[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 400));
      const { MOCK_TIME_SLOTS } = await import('../../mocks/data');
      return MOCK_TIME_SLOTS;
    }
    const { data } = await apiClient.get('/appointments/available-slots', {
      params: { professionalId, date },
    });
    return data.data;
  },
};
