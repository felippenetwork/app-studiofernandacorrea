import { commissionsRepository } from './commissions.repository';
import { supabase } from '../../config/supabase';
import { hasSupabase } from '../../config/env';

export const commissionsService = {
  async getRates(professionalId?: string) {
    return commissionsRepository.findAllRates(professionalId);
  },

  async setRate(professionalId: string, serviceId: string, percentage: number) {
    if (percentage < 0 || percentage > 100) throw new Error('Percentual deve ser entre 0 e 100.');
    return commissionsRepository.upsertRate(professionalId, serviceId, percentage);
  },

  async deleteRate(professionalId: string, serviceId: string) {
    return commissionsRepository.deleteRate(professionalId, serviceId);
  },

  // Chamado quando agendamento vai para 'concluido'
  async createForAppointment(appointmentId: string): Promise<void> {
    if (!hasSupabase) return;

    const existing = await commissionsRepository.findRecordByAppointment(appointmentId);
    if (existing) return;

    const { data } = await supabase
      .from('appointments')
      .select('professional_id, service_id, service_price')
      .eq('id', appointmentId)
      .maybeSingle();
    if (!data) return;

    const appt = data as { professional_id: string; service_id: string; service_price: number };
    const rate  = await commissionsRepository.findRate(appt.professional_id, appt.service_id);

    if (!rate) {
      console.log(`[commissions] Sem taxa configurada para profissional ${appt.professional_id} + serviço ${appt.service_id}. Pulando.`);
      return;
    }

    await commissionsRepository.createRecord({
      appointmentId,
      professionalId:       appt.professional_id,
      serviceId:            appt.service_id,
      servicePrice:         Number(appt.service_price),
      commissionPercentage: Number(rate.commission_percentage),
    });

    console.log(`[commissions] Registro criado para agendamento ${appointmentId}`);
  },

  async getRecords(filters: {
    professionalId?: string;
    status?: string;
    from?: string;
    to?: string;
    page: number;
    limit: number;
  }) {
    return commissionsRepository.findRecords(filters);
  },

  async getSummary(from?: string, to?: string) {
    const today      = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + '-01';
    return commissionsRepository.getSummary(from ?? monthStart, to ?? today);
  },

  async markAsPaid(ids: string[], adminId: string, notes?: string) {
    if (!ids.length) throw new Error('Nenhuma comissão selecionada.');
    return commissionsRepository.markAsPaid(ids, adminId, notes);
  },
};
