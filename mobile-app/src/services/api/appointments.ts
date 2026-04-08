import { apiClient, USE_MOCK } from './client';
import { Appointment, BookingFlow, PaymentMethod, Service, Professional } from '../../types';
import { MOCK_APPOINTMENTS, BOOKING_FEE } from '../../mocks/data';

export interface CreateAppointmentPayload {
  booking: BookingFlow;
  paymentMethod: PaymentMethod;
}

// ─── Mapper: DB (snake_case) → Mobile (camelCase) ────────────────────────────

function mapService(s: any): Service {
  return {
    id: s.id,
    name: s.name,
    description: s.description ?? '',
    price: s.price,
    durationMinutes: s.duration_minutes ?? 60,
    category: s.category ?? 'outros',
    imageUrl: s.image_url ?? undefined,
    isActive: s.is_active ?? true,
  };
}

function mapProfessional(p: any): Professional {
  return {
    id: p.id,
    name: p.name,
    avatarUrl: p.avatar_url ?? undefined,
    specialties: p.specialties ?? [],
    rating: p.rating ?? 5.0,
    reviewCount: p.review_count ?? 0,
    bio: p.bio ?? undefined,
    isActive: p.is_active ?? true,
  };
}

function mapAppointment(a: any): Appointment {
  return {
    id: a.id,
    userId: a.user_id,
    trinksAppointmentId: a.trinks_appointment_id ?? undefined,
    service: a.service ? mapService(a.service) : {
      id: a.service_id, name: '—', description: '', price: a.service_price,
      durationMinutes: 60, category: 'outros' as const, isActive: true,
    },
    professional: a.professional ? mapProfessional(a.professional) : {
      id: a.professional_id, name: '—', specialties: [],
      rating: 5.0, reviewCount: 0, isActive: true,
    },
    appointmentDate: a.appointment_date,
    appointmentTime: a.appointment_time,
    status: a.status,
    servicePrice: a.service_price,
    bookingFee: a.booking_fee,
    remainingAmount: a.remaining_amount,
    paymentStatus: a.payment_status,
    paymentId: a.payment_id ?? undefined,
    notes: a.notes ?? undefined,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const appointmentsService = {
  async getMyAppointments(): Promise<Appointment[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 600));
      return MOCK_APPOINTMENTS;
    }
    const { data } = await apiClient.get('/appointments/me');
    return (data.data as any[]).map(mapAppointment);
  },

  async getAppointment(appointmentId: string): Promise<Appointment> {
    if (USE_MOCK) {
      const found = MOCK_APPOINTMENTS.find((a) => a.id === appointmentId);
      if (!found) throw new Error('Agendamento não encontrado.');
      return found;
    }
    const { data } = await apiClient.get(`/appointments/${appointmentId}`);
    return mapAppointment(data.data);
  },

  async createAppointment(payload: CreateAppointmentPayload): Promise<Appointment> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 1800));
      const { booking } = payload;
      return {
        id: `apt-${Date.now()}`,
        userId: 'user-1',
        service: booking.selectedService!,
        professional: booking.selectedProfessional!,
        appointmentDate: booking.selectedDate!,
        appointmentTime: booking.selectedTime!,
        status: 'confirmado',
        servicePrice: booking.selectedService!.price,
        bookingFee: BOOKING_FEE,
        remainingAmount: booking.selectedService!.price - BOOKING_FEE,
        paymentStatus: 'aprovado',
        paymentId: `pay-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // 1. Create appointment record
    const { data: apptData } = await apiClient.post('/appointments', {
      serviceId: payload.booking.selectedService?.id,
      professionalId: payload.booking.selectedProfessional?.id,
      appointmentDate: payload.booking.selectedDate,
      appointmentTime: payload.booking.selectedTime,
      couponId: payload.booking.selectedCoupon?.id,
    });
    const appointment = mapAppointment(apptData.data);

    // 2. Pay the R$40 booking fee
    await apiClient.post('/payments/booking-fee', {
      appointmentId: appointment.id,
      method: payload.paymentMethod,
    });

    return { ...appointment, status: 'confirmado', paymentStatus: 'aprovado' };
  },

  async cancelAppointment(appointmentId: string): Promise<void> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 700));
      return;
    }
    await apiClient.patch(`/appointments/${appointmentId}/cancel`);
  },
};
