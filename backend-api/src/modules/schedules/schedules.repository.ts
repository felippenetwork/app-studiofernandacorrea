import { supabase } from '../../config/supabase';
import { hasSupabase } from '../../config/env';

export interface DbSchedule {
  id: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbScheduleBlock {
  id: string;
  professional_id: string;
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  created_at: string;
}

export interface DbOccupiedSlot {
  appointment_time: string;
  duration_minutes: number;
}

export const schedulesRepository = {
  async findByProfessional(professionalId: string): Promise<DbSchedule[]> {
    if (!hasSupabase) return [];
    const { data, error } = await supabase
      .from('professional_schedules')
      .select('*')
      .eq('professional_id', professionalId)
      .order('day_of_week');
    if (error) throw new Error('Erro ao buscar horários do profissional.');
    return (data ?? []) as DbSchedule[];
  },

  async findForDay(professionalId: string, dayOfWeek: number): Promise<DbSchedule | null> {
    if (!hasSupabase) return null;
    const { data } = await supabase
      .from('professional_schedules')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .maybeSingle();
    return data as DbSchedule | null;
  },

  async upsertDay(
    professionalId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
    isActive: boolean,
  ): Promise<DbSchedule> {
    if (!hasSupabase) throw new Error('Banco de dados não configurado.');
    const { data, error } = await supabase
      .from('professional_schedules')
      .upsert(
        { professional_id: professionalId, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime, is_active: isActive },
        { onConflict: 'professional_id,day_of_week' },
      )
      .select()
      .single();
    if (error || !data) throw new Error('Erro ao salvar horário.');
    return data as DbSchedule;
  },

  async findBlocks(professionalId: string, from: string, to: string): Promise<DbScheduleBlock[]> {
    if (!hasSupabase) return [];
    const { data, error } = await supabase
      .from('professional_schedule_blocks')
      .select('*')
      .eq('professional_id', professionalId)
      .gte('block_date', from)
      .lte('block_date', to)
      .order('block_date');
    if (error) throw new Error('Erro ao buscar bloqueios.');
    return (data ?? []) as DbScheduleBlock[];
  },

  async createBlock(input: {
    professionalId: string;
    blockDate: string;
    startTime?: string;
    endTime?: string;
    reason?: string;
  }): Promise<DbScheduleBlock> {
    if (!hasSupabase) throw new Error('Banco de dados não configurado.');
    const { data, error } = await supabase
      .from('professional_schedule_blocks')
      .insert({
        professional_id: input.professionalId,
        block_date: input.blockDate,
        start_time: input.startTime ?? null,
        end_time: input.endTime ?? null,
        reason: input.reason ?? null,
      })
      .select()
      .single();
    if (error || !data) throw new Error('Erro ao criar bloqueio.');
    return data as DbScheduleBlock;
  },

  async deleteBlock(id: string): Promise<void> {
    if (!hasSupabase) throw new Error('Banco de dados não configurado.');
    const { error } = await supabase
      .from('professional_schedule_blocks')
      .delete()
      .eq('id', id);
    if (error) throw new Error('Erro ao remover bloqueio.');
  },

  async findOccupiedSlots(professionalId: string, date: string): Promise<DbOccupiedSlot[]> {
    if (!hasSupabase) return [];
    const { data, error } = await supabase
      .from('appointments')
      .select('appointment_time, service:services(duration_minutes)')
      .eq('professional_id', professionalId)
      .eq('appointment_date', date)
      .not('status', 'in', '("cancelado")');
    if (error) throw new Error('Erro ao buscar agendamentos do profissional.');
    return (data ?? []).map((row: any) => ({
      appointment_time: row.appointment_time as string,
      duration_minutes: (row.service?.duration_minutes as number) ?? 60,
    }));
  },

  async findAllWithProfessional(): Promise<any[]> {
    if (!hasSupabase) return [];
    const { data, error } = await supabase
      .from('professional_schedules')
      .select('*, professional:professionals(id,name,avatar_url)')
      .order('professional_id')
      .order('day_of_week');
    if (error) throw new Error('Erro ao buscar horários.');
    return data ?? [];
  },
};
