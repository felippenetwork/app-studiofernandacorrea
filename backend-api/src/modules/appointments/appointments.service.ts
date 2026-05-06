import { appointmentsRepository } from './appointments.repository';
import { adminNotificationsService } from '../admin-notifications/admin-notifications.service';
import { CreateAppointmentInput, BOOKING_FEE, DbAppointment } from '../../types';
import { hasSupabase } from '../../config/env';
import { MOCK_APPOINTMENTS } from './appointments.mock';

// In-memory store for mock-mode created appointments
const mockCreated: DbAppointment[] = [];

export const appointmentsService = {
  async getMyAppointments(userId: string) {
    if (!hasSupabase) {
      return [...MOCK_APPOINTMENTS, ...mockCreated];
    }
    return appointmentsRepository.findByUserId(userId);
  },

  async getById(id: string, userId: string) {
    if (!hasSupabase) {
      const all = [...MOCK_APPOINTMENTS, ...mockCreated];
      return all.find((a) => a.id === id) ?? null;
    }
    const appointment = await appointmentsRepository.findById(id, userId);
    if (!appointment) throw new Error('Agendamento não encontrado.');
    return appointment;
  },

  async create(userId: string, input: CreateAppointmentInput): Promise<DbAppointment> {
    const servicePrice = await getServicePrice(input.serviceId, input.variationId);
    const bookingFee = BOOKING_FEE;
    const remainingAmount = servicePrice - bookingFee;

    if (!hasSupabase) {
      const mock: DbAppointment = {
        id: `apt-${Date.now()}`,
        user_id: userId,
        trinks_appointment_id: null,
        service_id: input.serviceId,
        professional_id: input.professionalId,
        appointment_date: input.appointmentDate,
        appointment_time: input.appointmentTime,
        status: 'pendente_pagamento',
        service_price: servicePrice,
        booking_fee: bookingFee,
        remaining_amount: remainingAmount,
        payment_status: 'pendente',
        payment_id: null,
        notes: input.notes ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as DbAppointment;
      mockCreated.push(mock);
      console.log(`[appointments] Mock appointment created: ${mock.id}`);
      adminNotificationsService.create({
        type: 'new_appointment',
        title: 'Novo agendamento',
        message: `Agendamento criado para ${mock.appointment_date} às ${mock.appointment_time}.`,
        entityType: 'appointment',
        entityId: mock.id,
      }).catch(() => {});
      return mock;
    }

    const appointment = await appointmentsRepository.create({
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
    });

    adminNotificationsService.create({
      type: 'new_appointment',
      title: 'Novo agendamento',
      message: `Agendamento criado para ${input.appointmentDate} às ${input.appointmentTime}.`,
      entityType: 'appointment',
      entityId: appointment.id,
    }).catch(() => {});

    // Trinks sync runs in payments.service.ts AFTER the booking fee is confirmed.
    // Only paid appointments appear in the professional's Trinks agenda.

    return appointment;
  },
};

// ─── Helper ──────────────────────────────────────────────────────────────────

async function getServicePrice(serviceId: string, variationId?: string): Promise<number> {
  if (!hasSupabase) {
    const prices: Record<string, number> = {
      '1': 120, '2': 280, '3': 350,
      '4': 90,  '5': 180, '6': 60,
      '7': 200, '8': 160,
    };
    return prices[serviceId] ?? 100;
  }

  const { supabase } = await import('../../config/supabase');
  const { data } = await supabase.from('services').select('price, variations').eq('id', serviceId).single();
  if (!data) throw new Error('Serviço não encontrado.');
  const row = data as { price: number; variations: { id: string; price: number }[] };

  if (variationId && Array.isArray(row.variations)) {
    const variation = row.variations.find((v) => v.id === variationId);
    if (variation) return variation.price;
  }

  return row.price;
}
