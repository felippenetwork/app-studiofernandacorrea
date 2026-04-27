import { appointmentsRepository } from './appointments.repository';
import { trinksService } from '../trinks/trinks.service';
import { pushService } from '../../services/push.service';
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
    const servicePrice = await getServicePrice(input.serviceId);
    const bookingFee = BOOKING_FEE;
    const remainingAmount = servicePrice - bookingFee;

    if (!hasSupabase) {
      // Return an in-memory mock appointment for dev without DB
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
      // Notify admin
      adminNotificationsService.create({
        type: 'new_appointment',
        title: 'Novo agendamento',
        message: `Agendamento criado para ${mock.appointment_date} às ${mock.appointment_time}.`,
        entityType: 'appointment',
        entityId: mock.id,
      }).catch(() => {});
      return mock;
    }

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

    // Notify admin (non-blocking)
    adminNotificationsService.create({
      type: 'new_appointment',
      title: 'Novo agendamento',
      message: `Agendamento criado para ${input.appointmentDate} às ${input.appointmentTime}.`,
      entityType: 'appointment',
      entityId: appointment.id,
    }).catch(() => {});

    // Sync to Trinks (non-blocking) — saves trinks_appointment_id for webhook correlation
    trinksService.createAppointment({
      serviceId: input.serviceId,
      professionalId: input.professionalId,
      date: input.appointmentDate,
      time: input.appointmentTime,
    }).then(async (trinksResult: { id?: string }) => {
      if (trinksResult?.id) {
        await appointmentsRepository.updateTrinksId(appointment.id, trinksResult.id);
        console.log(`[appointments] Trinks id saved: ${trinksResult.id} → appointment ${appointment.id}`);
      }
    }).catch((err: Error) => {
      console.warn('[appointments] Trinks sync failed (non-fatal):', err.message);
    });

    return appointment;
  },

  async cancel(id: string, userId: string) {
    if (!hasSupabase) {
      const idx = mockCreated.findIndex((a) => a.id === id);
      if (idx !== -1) {
        mockCreated[idx] = { ...mockCreated[idx], status: 'cancelado', updated_at: new Date().toISOString() };
        return mockCreated[idx];
      }
      const mock = MOCK_APPOINTMENTS.find((a) => a.id === id);
      if (!mock) throw new Error('Agendamento não encontrado.');
      return { ...mock, status: 'cancelado' } as unknown as DbAppointment;
    }

    const appointment = await appointmentsRepository.findById(id, userId);
    if (!appointment) throw new Error('Agendamento não encontrado.');
    if (['concluido', 'cancelado'].includes(appointment.status)) {
      throw new Error('Agendamento não pode ser cancelado neste status.');
    }

    const updated = await appointmentsRepository.updateStatus(id, userId, 'cancelado');

    if (appointment.trinks_appointment_id) {
      trinksService.cancelAppointment(appointment.trinks_appointment_id).catch((err: Error) => {
        console.warn('[appointments] Trinks cancel sync failed:', err.message);
      });
    }

    // Push notification (non-blocking)
    pushService.appointmentCancelled(userId, 'seu agendamento').catch((err: Error) => {
      console.warn('[appointments] Push cancel notification failed:', err.message);
    });

    return updated;
  },
};

// ─── Helper ──────────────────────────────────────────────────────────────────

async function getServicePrice(serviceId: string): Promise<number> {
  if (!hasSupabase) {
    const prices: Record<string, number> = {
      'svc-1': 120, 'svc-2': 280, 'svc-3': 350,
      'svc-4': 90,  'svc-5': 180, 'svc-6': 60,
      'svc-7': 200, 'svc-8': 160,
    };
    return prices[serviceId] ?? 100;
  }

  const { supabase } = await import('../../config/supabase');
  const { data } = await supabase.from('services').select('price').eq('id', serviceId).single();
  if (!data) throw new Error('Serviço não encontrado.');
  return (data as { price: number }).price;
}
