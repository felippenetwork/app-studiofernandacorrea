// Trinks API response types
// Adapt these to match the real Trinks API documentation when available

export interface TrinksService {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number; // minutes
  category?: string;
  active: boolean;
}

export interface TrinksProfessional {
  id: string;
  name: string;
  photo?: string;
  services: string[];
  active: boolean;
}

export interface TrinksTimeSlot {
  time: string; // "HH:MM"
  available: boolean;
}

export interface TrinksCreateAppointmentPayload {
  serviceId: string;
  professionalId: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  notes?: string;
}

export interface TrinksAppointment {
  id: string;
  serviceId: string;
  professionalId: string;
  date: string;
  time: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  clientName?: string;
  clientPhone?: string;
}

export interface TrinksWebhookEvent {
  type: 'appointment.created' | 'appointment.updated' | 'appointment.cancelled';
  payload: TrinksAppointment;
  companyId: string;
  timestamp: string;
}
