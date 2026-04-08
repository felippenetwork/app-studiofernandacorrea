import { apiClient } from './client';
import { Appointment, BookingFlow, PaymentMethod } from '../../types';
import { MOCK_APPOINTMENTS, BOOKING_FEE } from '../../mocks/data';

const USE_MOCK = true;

export interface CreateAppointmentPayload {
  booking: BookingFlow;
  paymentMethod: PaymentMethod;
}

export const appointmentsService = {
  async getMyAppointments(): Promise<Appointment[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 600));
      return MOCK_APPOINTMENTS;
    }
    const { data } = await apiClient.get('/appointments/me');
    return data.data;
  },

  async createAppointment(payload: CreateAppointmentPayload): Promise<Appointment> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 1500));
      const { booking } = payload;
      const newAppt: Appointment = {
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
      return newAppt;
    }
    const { data } = await apiClient.post('/appointments', payload);
    return data.data;
  },

  async cancelAppointment(appointmentId: string): Promise<void> {
    if (!USE_MOCK) {
      await apiClient.patch(`/appointments/${appointmentId}/cancel`);
    }
  },
};
