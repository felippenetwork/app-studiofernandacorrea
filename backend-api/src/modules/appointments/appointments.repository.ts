import { supabase } from '../../config/supabase';
import { hasSupabase } from '../../config/env';
import { DbAppointment, AppointmentStatus } from '../../types';

export const appointmentsRepository = {
  async findByUserId(userId: string): Promise<DbAppointment[]> {
    if (!hasSupabase) return [];

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        service:services(*),
        professional:professionals(*)
      `)
      .eq('user_id', userId)
      .order('appointment_date', { ascending: false });

    if (error) throw new Error('Erro ao buscar agendamentos.');
    return (data ?? []) as unknown as DbAppointment[];
  },

  async findById(id: string, userId: string): Promise<DbAppointment | null> {
    if (!hasSupabase) return null;

    const { data } = await supabase
      .from('appointments')
      .select(`
        *,
        service:services(*),
        professional:professionals(*)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    return data as unknown as DbAppointment | null;
  },

  async create(payload: Omit<DbAppointment, 'id' | 'created_at' | 'updated_at'>): Promise<DbAppointment> {
    if (!hasSupabase) {
      throw new Error('Banco de dados não configurado. Configure SUPABASE_URL e SUPABASE_SERVICE_KEY.');
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert(payload)
      .select(`
        *,
        service:services(*),
        professional:professionals(*)
      `)
      .single();

    if (error || !data) {
      console.error('[appointments] create error:', error);
      throw new Error('Erro ao criar agendamento.');
    }

    return data as unknown as DbAppointment;
  },

  async updateStatus(
    id: string,
    userId: string,
    status: AppointmentStatus,
    paymentStatus?: DbAppointment['payment_status']
  ): Promise<DbAppointment> {
    if (!hasSupabase) throw new Error('Banco de dados não configurado.');

    const updates: Partial<DbAppointment> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (paymentStatus) updates.payment_status = paymentStatus;

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) throw new Error('Erro ao atualizar agendamento.');
    return data as DbAppointment;
  },

  async confirmPayment(id: string, paymentId: string): Promise<DbAppointment> {
    if (!hasSupabase) throw new Error('Banco de dados não configurado.');

    const { data, error } = await supabase
      .from('appointments')
      .update({
        status: 'confirmado',
        payment_status: 'aprovado',
        payment_id: paymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new Error('Erro ao confirmar agendamento.');
    return data as DbAppointment;
  },
};
