import { apiClient, USE_MOCK } from './client';
import { Appointment, BookingFlow, PaymentMethod } from '../../types';
import { MOCK_APPOINTMENTS, BOOKING_FEE } from '../../mocks/data';

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

    // 1. Create appointment in the system
    const { data: apptData } = await apiClient.post('/appointments', {
      serviceId: payload.booking.selectedService?.id,
      professionalId: payload.booking.selectedProfessional?.id,
      date: payload.booking.selectedDate,
      time: payload.booking.selectedTime,
      couponId: payload.booking.selectedCoupon?.id,
    });
    const appointment: Appointment = apptData.data;

    // 2. Pay the R$40 booking fee
    await apiClient.post('/payments/booking-fee', {
      appointmentId: appointment.id,
      method: payload.paymentMethod,
    });

    return appointment;
  },

  async cancelAppointment(appointmentId: string): Promise<void> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 600));
      return;
    }
    await apiClient.patch(`/appointments/${appointmentId}/cancel`);
  },

  async getAppointment(appointmentId: string): Promise<Appointment> {
    if (USE_MOCK) {
      const found = MOCK_APPOINTMENTS.find((a) => a.id === appointmentId);
      if (!found) throw new Error('Agendamento não encontrado.');
      return found;
    }
    const { data } = await apiClient.get(`/appointments/${appointmentId}`);
    return data.data;
  },
};
