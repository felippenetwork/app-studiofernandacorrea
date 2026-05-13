import { schedulesRepository } from './schedules.repository';
import { supabase } from '../../config/supabase';
import { hasSupabase } from '../../config/env';

function toMin(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export const schedulesService = {
  async getSchedule(professionalId: string) {
    return schedulesRepository.findByProfessional(professionalId);
  },

  async getAllSchedules() {
    return schedulesRepository.findAllWithProfessional();
  },

  async setDaySchedule(
    professionalId: string,
    dayOfWeek: number,
    data: { startTime: string; endTime: string; isActive: boolean },
  ) {
    if (dayOfWeek < 0 || dayOfWeek > 6) throw new Error('Dia da semana inválido (0=Dom, 6=Sáb).');
    if (toMin(data.startTime) >= toMin(data.endTime)) throw new Error('Início deve ser antes do término.');
    return schedulesRepository.upsertDay(professionalId, dayOfWeek, data.startTime, data.endTime, data.isActive);
  },

  async getBlocks(professionalId: string, from: string, to: string) {
    return schedulesRepository.findBlocks(professionalId, from, to);
  },

  async createBlock(professionalId: string, input: {
    blockDate: string;
    startTime?: string;
    endTime?: string;
    reason?: string;
  }) {
    if (input.startTime && input.endTime && toMin(input.startTime) >= toMin(input.endTime)) {
      throw new Error('Início do bloqueio deve ser antes do término.');
    }
    return schedulesRepository.createBlock({ professionalId, ...input });
  },

  async deleteBlock(id: string) {
    return schedulesRepository.deleteBlock(id);
  },

  async getAvailableSlots(
    professionalId: string,
    serviceId: string,
    date: string,
  ): Promise<{ time: string; available: boolean }[]> {
    // Fetch service duration
    let durationMin = 60;
    if (hasSupabase) {
      const { data } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', serviceId)
        .maybeSingle();
      if (data) durationMin = (data as any).duration_minutes as number;
    }

    // Day of week (JS: 0=Sun … 6=Sat), use noon to avoid DST issues
    const dayOfWeek = new Date(date + 'T12:00:00').getDay();
    const schedule = await schedulesRepository.findForDay(professionalId, dayOfWeek);
    if (!schedule) return [];

    const [occupied, blocks] = await Promise.all([
      schedulesRepository.findOccupiedSlots(professionalId, date),
      schedulesRepository.findBlocks(professionalId, date, date),
    ]);

    const schedStart = toMin(schedule.start_time);
    const schedEnd   = toMin(schedule.end_time);
    const slots: { time: string; available: boolean }[] = [];

    for (let start = schedStart; start + durationMin <= schedEnd; start += 30) {
      const end = start + durationMin;
      let ok = true;

      for (const appt of occupied) {
        const aStart = toMin(appt.appointment_time);
        const aEnd   = aStart + appt.duration_minutes;
        if (start < aEnd && end > aStart) { ok = false; break; }
      }

      if (ok) {
        for (const blk of blocks) {
          if (!blk.start_time || !blk.end_time) { ok = false; break; }
          const bStart = toMin(blk.start_time);
          const bEnd   = toMin(blk.end_time);
          if (start < bEnd && end > bStart) { ok = false; break; }
        }
      }

      slots.push({ time: toTime(start), available: ok });
    }

    return slots;
  },
};
