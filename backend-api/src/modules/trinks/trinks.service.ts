import axios, { AxiosInstance } from 'axios';
import { env, hasTrinks } from '../../config/env';
import {
  TrinksService,
  TrinksProfessional,
  TrinksTimeSlot,
  TrinksCreateAppointmentPayload,
  TrinksAppointment,
  TrinksServicoAPI,
  TrinksProfissionalAPI,
  TrinksHorarioDisponivelAPI,
  TrinksClienteAPI,
  TrinksClient,
} from './trinks.types';

// ─── Mock data (used when TRINKS_API_KEY is not configured) ───────────────────

const MOCK_SERVICES: TrinksService[] = [
  { id: '1', name: 'Corte Feminino', price: 120, duration: 60, category: 'Cabelo', active: true },
  { id: '2', name: 'Coloração', price: 280, duration: 180, category: 'Cabelo', active: true },
  { id: '3', name: 'Mechas / Luzes', price: 350, duration: 210, category: 'Cabelo', active: true },
  { id: '4', name: 'Manicure & Pedicure', price: 90, duration: 90, category: 'Unhas', active: true },
  { id: '5', name: 'Alongamento de Unhas', price: 180, duration: 120, category: 'Unhas', active: true },
  { id: '6', name: 'Design de Sobrancelhas', price: 60, duration: 45, category: 'Sobrancelha', active: true },
  { id: '7', name: 'Maquiagem Social', price: 200, duration: 90, category: 'Maquiagem', active: true },
  { id: '8', name: 'Limpeza de Pele', price: 160, duration: 75, category: 'Estética', active: true },
];

const MOCK_PROFESSIONALS: TrinksProfessional[] = [
  { id: '1', name: 'Fernanda Correa', services: ['1', '2', '3'], active: true },
  { id: '2', name: 'Isabela Matos', services: ['4', '5'], active: true },
  { id: '3', name: 'Camila Souza', services: ['6', '7', '8'], active: true },
];

const MOCK_SLOTS: TrinksTimeSlot[] = [
  { time: '09:00', available: true },
  { time: '09:30', available: false },
  { time: '10:00', available: true },
  { time: '10:30', available: true },
  { time: '11:00', available: false },
  { time: '11:30', available: true },
  { time: '14:00', available: true },
  { time: '14:30', available: true },
  { time: '15:00', available: false },
  { time: '15:30', available: true },
  { time: '16:00', available: true },
  { time: '17:00', available: true },
];

// ─── Response normalizers ─────────────────────────────────────────────────────

function normalizeService(s: TrinksServicoAPI): TrinksService {
  return {
    id: String(s.id),
    name: s.nome,
    description: s.descricao,
    price: Number(s.preco),
    duration: Number(s.duracao),
    category: s.categoria,
    active: s.ativo,
  };
}

function normalizeProfessional(p: TrinksProfissionalAPI): TrinksProfessional {
  return {
    id: String(p.id),
    name: p.nome,
    photo: p.foto,
    services: (p.servicos ?? []).map(String),
    active: p.ativo,
  };
}

function normalizeSlot(h: TrinksHorarioDisponivelAPI): TrinksTimeSlot {
  return { time: h.horario, available: h.disponivel };
}

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
          'X-Api-Key': env.TRINKS_API_KEY ?? '',
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        // estabelecimentoId sent as default query param on every request
        params: env.TRINKS_COMPANY_ID ? { estabelecimentoId: env.TRINKS_COMPANY_ID } : {},
        timeout: 10_000,
      });

      this.client.interceptors.response.use(
        (r) => r,
        (err) => {
          const status = err?.response?.status;
          const msg = err?.response?.data?.message ?? err.message;
          console.error(`[trinks] HTTP ${status ?? '???'}: ${msg}`);
          return Promise.reject(err);
        }
      );
    }
    return this.client;
  }

  // ─── Services ──────────────────────────────────────────────────────────────

  async getServices(): Promise<TrinksService[]> {
    if (!hasTrinks) {
      console.log('[trinks] mock mode — returning mock services');
      return MOCK_SERVICES;
    }
    const { data } = await this.getClient().get<TrinksServicoAPI[]>('/v1/servicos');
    return (Array.isArray(data) ? data : []).map(normalizeService).filter((s) => s.active);
  }

  // ─── Professionals ─────────────────────────────────────────────────────────

  async getProfessionals(serviceId?: string): Promise<TrinksProfessional[]> {
    if (!hasTrinks) {
      const list = serviceId
        ? MOCK_PROFESSIONALS.filter((p) => p.services.includes(serviceId))
        : MOCK_PROFESSIONALS;
      return list;
    }
    const params = serviceId ? { servicoId: serviceId } : {};
    const { data } = await this.getClient().get<TrinksProfissionalAPI[]>('/v1/profissionais', { params });
    return (Array.isArray(data) ? data : []).map(normalizeProfessional).filter((p) => p.active);
  }

  // ─── Available Slots ───────────────────────────────────────────────────────
  // Endpoint: GET /v1/agendamentos/disponibilidade
  // Params: profissionalId, servicoId, data (YYYY-MM-DD)
  // Response: { horarios: [{ horario: "HH:MM", disponivel: bool }] }
  // NOTE: Confirm exact endpoint/params with Trinks docs at trinks.readme.io

  async getAvailableSlots(
    professionalId: string,
    serviceId: string,
    date: string,
  ): Promise<TrinksTimeSlot[]> {
    if (!hasTrinks) return MOCK_SLOTS;

    const { data } = await this.getClient().get('/v1/agendamentos/disponibilidade', {
      params: { profissionalId: professionalId, servicoId: serviceId, data: date },
    });

    // Handle both { horarios: [...] } and plain array responses
    const horarios: TrinksHorarioDisponivelAPI[] = Array.isArray(data)
      ? data
      : (data?.horarios ?? []);

    return horarios.map(normalizeSlot);
  }

  // ─── Create Appointment ────────────────────────────────────────────────────
  // Endpoint: POST /v1/agendamentos
  // NOTE: Confirm request body field names with Trinks docs at trinks.readme.io

  async createAppointment(payload: TrinksCreateAppointmentPayload): Promise<{ id?: string }> {
    if (!hasTrinks) {
      const mockId = `mock-${Date.now()}`;
      console.log('[trinks] mock create appointment:', mockId);
      return { id: mockId };
    }
    const { data } = await this.getClient().post('/v1/agendamentos', {
      servicoId: Number(payload.serviceId),
      profissionalId: Number(payload.professionalId),
      data: payload.date,
      horario: payload.time,
      clienteNome: payload.clientName,
      clienteTelefone: payload.clientPhone,
      clienteEmail: payload.clientEmail,
      observacoes: payload.notes,
    });
    // Trinks may return { id } or { agendamento: { id } }
    const id = data?.id ?? data?.agendamento?.id;
    return { id: id != null ? String(id) : undefined };
  }

  // ─── Clients ───────────────────────────────────────────────────────────────
  // Endpoint: GET /v1/clientes
  // Returns all clients registered in Trinks for this company.

  async getClients(): Promise<TrinksClient[]> {
    if (!hasTrinks) return [];
    try {
      const { data } = await this.getClient().get<TrinksClienteAPI[] | { clientes?: TrinksClienteAPI[]; items?: TrinksClienteAPI[] }>('/v1/clientes');
      const list: TrinksClienteAPI[] = Array.isArray(data)
        ? data
        : (data as any)?.clientes ?? (data as any)?.items ?? [];
      return list.map((c) => ({
        id: String(c.id),
        name: c.nome,
        phone: c.telefone,
        email: c.email,
      }));
    } catch (err) {
      console.error('[trinks] getClients error:', (err as Error).message);
      return [];
    }
  }

  // ─── Cancel Appointment ────────────────────────────────────────────────────
  // Endpoint: PATCH /v1/agendamentos/{id}/status/cancelado

  async cancelAppointment(trinksAppointmentId: string): Promise<void> {
    if (!hasTrinks) {
      console.log('[trinks] mock cancel appointment:', trinksAppointmentId);
      return;
    }
    await this.getClient().patch(`/v1/agendamentos/${trinksAppointmentId}/status/cancelado`);
  }

  // ─── Get Appointment ───────────────────────────────────────────────────────

  async getAppointment(trinksAppointmentId: string): Promise<TrinksAppointment | null> {
    if (!hasTrinks) return null;
    const { data } = await this.getClient().get(`/v1/agendamentos/${trinksAppointmentId}`);
    if (!data) return null;
    return {
      id: String(data.id ?? trinksAppointmentId),
      serviceId: String(data.servicoId ?? data.serviceId ?? ''),
      professionalId: String(data.profissionalId ?? data.professionalId ?? ''),
      date: data.data ?? data.date ?? '',
      time: data.horario ?? data.time ?? '',
      status: mapTrinksStatus(data.status),
      clientName: data.clienteNome ?? data.clientName,
      clientPhone: data.clienteTelefone ?? data.clientPhone,
    };
  }
}

// ─── Status mapping ───────────────────────────────────────────────────────────

export function mapTrinksStatus(
  status: string,
): TrinksAppointment['status'] {
  const map: Record<string, TrinksAppointment['status']> = {
    agendado: 'scheduled',
    confirmado: 'confirmed',
    cancelado: 'cancelled',
    concluido: 'completed',
    nao_compareceu: 'no_show',
    // English keys as fallback
    scheduled: 'scheduled',
    confirmed: 'confirmed',
    cancelled: 'cancelled',
    completed: 'completed',
    no_show: 'no_show',
  };
  return map[status?.toLowerCase()] ?? 'scheduled';
}

export const trinksService = new TrinksService_();
export { MOCK_SERVICES, MOCK_PROFESSIONALS };
