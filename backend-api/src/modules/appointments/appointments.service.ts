import { appointmentsRepository } from './appointments.repository';
import { trinksService } from '../trinks/trinks.service';
import { CreateAppointmentInput, BOOKING_FEE, DbAppointment } from '../../types';
import { hasSupabase } from '../../config/env';
import { MOCK_APPOINTMENTS } from './appointments.mock';

export const appointmentsService = {
  async getMyAppointments(userId: string) {
    if (!hasSupabase) {
      // Return mock data filtered by a fake user id check
      return MOCK_APPOINTMENTS;
    }
    return appointmentsRepository.findByUserId(userId);
  },

  async getById(id: string, userId: string) {
    if (!hasSupabase) {
      return MOCK_APPOINTMENTS.find((a) => a.id === id) ?? null;
    }
    const appointment = await appointmentsRepository.findById(id, userId);
    if (!appointment) throw new Error('Agendamento não encontrado.');
    return appointment;
  },

  async create(userId: string, input: CreateAppointmentInput): Promise<DbAppointment> {
    const servicePrice = await getServicePrice(input.serviceId);
    const bookingFee = BOOKING_FEE;
    const remainingAmount = servicePrice - bookingFee;

    const payload = {
      user_id: userId,
      trinks_appointment_id: null,
      service_id: input.serviceId,
      professional_id: input.professionalId,
      appointment_date: input.appointmentDate,
      appointment_time: input.appointmentTime,
      status: 'pendente_pagamento' as const,
      service_price: servicePrice,
      booking_fee: bookingFee,
      remaining_amount: remainingAmount,
      payment_status: 'pendente' as const,
      payment_id: null,
      notes: input.notes ?? null,
    };

    const appointment = await appointmentsRepository.create(payload);

    // Sync to Trinks if credentials are available (non-blocking)
    trinksService.createAppointment({
      serviceId: input.serviceId,
      professionalId: input.professionalId,
      date: input.appointmentDate,
      time: input.appointmentTime,
    }).then(async (trinksResult: { id?: string }) => {
      if (trinksResult?.id) {
        await appointmentsRepository.updateStatus(
          appointment.id,
          userId,
          appointment.status
        );
      }
    }).catch((err: Error) => {
      console.warn('[appointments] Trinks sync failed (non-fatal):', err.message);
    });

    return appointment;
  },

  async cancel(id: string, userId: string) {
    const appointment = await appointmentsRepository.findById(id, userId);
    if (!appointment) throw new Error('Agendamento não encontrado.');

    if (['concluido', 'cancelado'].includes(appointment.status)) {
      throw new Error('Agendamento não pode ser cancelado neste status.');
    }

    const updated = await appointmentsRepository.updateStatus(id, userId, 'cancelado');

    // Sync cancellation to Trinks
    if (appointment.trinks_appointment_id) {
      trinksService.cancelAppointment(appointment.trinks_appointment_id).catch((err: Error) => {
        console.warn('[appointments] Trinks cancel sync failed:', err.message);
      });
    }

    return updated;
  },
};

// ─── Helper: resolve service price ───────────────────────────────────────────

async function getServicePrice(serviceId: string): Promise<number> {
  if (!hasSupabase) {
    // Return mock price based on serviceId
    const prices: Record<string, number> = {
      'svc-1': 120, 'svc-2': 280, 'svc-3': 350,
      'svc-4': 90, 'svc-5': 180, 'svc-6': 60,
      'svc-7': 200, 'svc-8': 160,
    };
    return prices[serviceId] ?? 100;
  }

  const { supabase } = await import('../../config/supabase');
  const { data } = await supabase
    .from('services')
    .select('price')
    .eq('id', serviceId)
    .single();

  if (!data) throw new Error('Serviço não encontrado.');
  return (data as { price: number }).price;
}
