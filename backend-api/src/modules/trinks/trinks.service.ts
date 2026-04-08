import axios from 'axios';

/**
 * TrinksService — all Trinks API calls go through here.
 * The mobile app NEVER calls Trinks directly — only this service does.
 *
 * TODO ETAPA 2: implement each method using the real Trinks API endpoints.
 */
export class TrinksService {
  private readonly client = axios.create({
    baseURL: process.env.TRINKS_API_URL,
    headers: {
      'Authorization': `Bearer ${process.env.TRINKS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

  async getServices(): Promise<unknown[]> {
    // TODO ETAPA 2: GET /services
    return [];
  }

  async getProfessionals(): Promise<unknown[]> {
    // TODO ETAPA 2: GET /employees
    return [];
  }

  async getAvailableSlots(
    _employeeId: string,
    _serviceId: string,
    _date: string
  ): Promise<unknown[]> {
    // TODO ETAPA 2: GET /schedules/available
    return [];
  }

  async createAppointment(_payload: unknown): Promise<unknown> {
    // TODO ETAPA 2: POST /appointments
    return {};
  }

  async cancelAppointment(_trinksAppointmentId: string): Promise<void> {
    // TODO ETAPA 2: DELETE /appointments/:id
  }

  async getAppointment(_trinksAppointmentId: string): Promise<unknown> {
    // TODO ETAPA 2: GET /appointments/:id
    return {};
  }
}

export const trinksService = new TrinksService();
