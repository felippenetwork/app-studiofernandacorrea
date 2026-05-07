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
    const { price: servicePrice, bookingFeeType, bookingFeeValue } = await getServiceData(input.serviceId, input.variationId);
    const bookingFee = calcBookingFee(servicePrice, bookingFeeType, bookingFeeValue);
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ServiceData {
  price: number;
  bookingFeeType: string;
  bookingFeeValue: number;
}

async function getServiceData(serviceId: string, variationId?: string): Promise<ServiceData> {
  if (!hasSupabase) {
    const prices: Record<string, number> = {
      'svc-1': 150, 'svc-2': 120, 'svc-3': 280, 'svc-4': 90,
    };
    return { price: prices[serviceId] ?? 100, bookingFeeType: 'fixed', bookingFeeValue: BOOKING_FEE };
  }

  const { supabase } = await import('../../config/supabase');
  const { data } = await supabase.from('services')
    .select('price, variations, booking_fee_type, booking_fee_value')
    .eq('id', serviceId).single();
  if (!data) throw new Error('Serviço não encontrado.');
  const row = data as {
    price: number;
    variations: { id: string; price: number }[];
    booking_fee_type: string;
    booking_fee_value: number;
  };

  let price = row.price;
  if (variationId && Array.isArray(row.variations)) {
    const variation = row.variations.find((v) => v.id === variationId);
    if (variation) price = variation.price;
  }

  return {
    price,
    bookingFeeType: row.booking_fee_type ?? 'fixed',
    bookingFeeValue: row.booking_fee_value ?? BOOKING_FEE,
  };
}

function calcBookingFee(servicePrice: number, feeType: string, feeValue: number): number {
  if (feeType === 'percentage') {
    return Math.round(servicePrice * feeValue) / 100;
  }
  return feeValue;
}
