import axios, { AxiosInstance } from 'axios';
import { env, hasTrinks } from '../../config/env';
import {
  TrinksService,
  TrinksProfessional,
  TrinksTimeSlot,
  TrinksCreateAppointmentPayload,
  TrinksAppointment,
} from './trinks.types';

// ─── Mock data (used when Trinks credentials are not configured) ──────────────

const MOCK_SERVICES: TrinksService[] = [
  { id: 'svc-1', name: 'Corte Feminino', price: 120, duration: 60, category: 'cabelo', active: true },
  { id: 'svc-2', name: 'Coloração', price: 280, duration: 180, category: 'cabelo', active: true },
  { id: 'svc-3', name: 'Mechas / Luzes', price: 350, duration: 210, category: 'cabelo', active: true },
  { id: 'svc-4', name: 'Manicure & Pedicure', price: 90, duration: 90, category: 'unhas', active: true },
  { id: 'svc-5', name: 'Alongamento de Unhas', price: 180, duration: 120, category: 'unhas', active: true },
  { id: 'svc-6', name: 'Design de Sobrancelhas', price: 60, duration: 45, category: 'sobrancelha', active: true },
  { id: 'svc-7', name: 'Maquiagem Social', price: 200, duration: 90, category: 'maquiagem', active: true },
  { id: 'svc-8', name: 'Limpeza de Pele', price: 160, duration: 75, category: 'estetica', active: true },
];

const MOCK_PROFESSIONALS: TrinksProfessional[] = [
  { id: 'pro-1', name: 'Fernanda Correa', services: ['svc-1', 'svc-2', 'svc-3'], active: true },
  { id: 'pro-2', name: 'Isabela Matos', services: ['svc-4', 'svc-5'], active: true },
  { id: 'pro-3', name: 'Camila Souza', services: ['svc-6', 'svc-7', 'svc-8'], active: true },
];

const MOCK_SLOTS: TrinksTimeSlot[] = [
  { time: '09:00', available: true }, { time: '09:30', available: false },
  { time: '10:00', available: true }, { time: '10:30', available: true },
  { time: '11:00', available: false }, { time: '11:30', available: true },
  { time: '14:00', available: true }, { time: '14:30', available: true },
  { time: '15:00', available: false }, { time: '15:30', available: true },
  { time: '16:00', available: true }, { time: '17:00', available: true },
];

// ─── Trinks HTTP Client ───────────────────────────────────────────────────────

class TrinksService_ {
  private client: AxiosInstance | null = null;

  private getClient(): AxiosInstance {
    if (!hasTrinks) {
      throw new Error('[trinks] API não configurada. Defina TRINKS_API_URL e TRINKS_API_KEY no .env');
    }
    if (!this.client) {
      this.client = axios.create({
        baseURL: env.TRINKS_API_URL,
        headers: {
          Authorization: `Bearer ${env.TRINKS_API_KEY}`,
          'X-Company-Id': env.TRINKS_COMPANY_ID ?? '',
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
    }
    return this.client;
  }

  // ─── Services ──────────────────────────────────────────────────────────────

  async getServices(): Promise<TrinksService[]> {
    if (!hasTrinks) {
      console.log('[trinks] Using mock services (no credentials configured)');
      return MOCK_SERVICES;
    }
    const { data } = await this.getClient().get('/services');
    return data;
  }

  // ─── Professionals ─────────────────────────────────────────────────────────

  async getProfessionals(serviceId?: string): Promise<TrinksProfessional[]> {
    if (!hasTrinks) {
      const filtered = serviceId
        ? MOCK_PROFESSIONALS.filter((p) => p.services.includes(serviceId))
        : MOCK_PROFESSIONALS;
      return filtered;
    }
    const params = serviceId ? { service_id: serviceId } : {};
    const { data } = await this.getClient().get('/employees', { params });
    return data;
  }

  // ─── Available Slots ───────────────────────────────────────────────────────

  async getAvailableSlots(
    professionalId: string,
    serviceId: string,
    date: string
  ): Promise<TrinksTimeSlot[]> {
    if (!hasTrinks) {
      return MOCK_SLOTS;
    }
    const { data } = await this.getClient().get('/schedules/available', {
      params: { employee_id: professionalId, service_id: serviceId, date },
    });
    return data;
  }

  // ─── Create Appointment ────────────────────────────────────────────────────

  async createAppointment(payload: TrinksCreateAppointmentPayload): Promise<{ id?: string }> {
    if (!hasTrinks) {
      console.log('[trinks] Mock create appointment:', payload);
      return { id: `trinks-mock-${Date.now()}` };
    }
    const { data } = await this.getClient().post('/appointments', {
      service_id: payload.serviceId,
      employee_id: payload.professionalId,
      date: payload.date,
      time: payload.time,
      client_name: payload.clientName,
      client_phone: payload.clientPhone,
      client_email: payload.clientEmail,
      notes: payload.notes,
    });
    return data;
  }

  // ─── Cancel Appointment ────────────────────────────────────────────────────

  async cancelAppointment(trinksAppointmentId: string): Promise<void> {
    if (!hasTrinks) {
      console.log('[trinks] Mock cancel appointment:', trinksAppointmentId);
      return;
    }
    await this.getClient().delete(`/appointments/${trinksAppointmentId}`);
  }

  // ─── Get Appointment ───────────────────────────────────────────────────────

  async getAppointment(trinksAppointmentId: string): Promise<TrinksAppointment | null> {
    if (!hasTrinks) return null;
    const { data } = await this.getClient().get(`/appointments/${trinksAppointmentId}`);
    return data;
  }
}

export const trinksService = new TrinksService_();
