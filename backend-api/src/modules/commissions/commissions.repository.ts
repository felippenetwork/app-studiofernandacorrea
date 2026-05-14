import { supabase } from '../../config/supabase';
import { hasSupabase } from '../../config/env';

export interface DbCommissionRate {
  id: string;
  professional_id: string;
  service_id: string;
  commission_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface DbCommissionRecord {
  id: string;
  appointment_id: string;
  professional_id: string;
  service_id: string;
  service_price: number;
  commission_percentage: number;
  commission_amount: number;
  status: 'pendente' | 'pago';
  paid_at: string | null;
  paid_by_admin_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const commissionsRepository = {
  async findRate(professionalId: string, serviceId: string): Promise<DbCommissionRate | null> {
    if (!hasSupabase) return null;
    const { data } = await supabase
      .from('professional_service_commissions')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('service_id', serviceId)
      .maybeSingle();
    return data as DbCommissionRate | null;
  },

  async findAllRates(professionalId?: string): Promise<any[]> {
    if (!hasSupabase) return [];
    let query = supabase
      .from('professional_service_commissions')
      .select('*, professional:professionals(id,name), service:services(id,name,category)');
    if (professionalId) query = query.eq('professional_id', professionalId);
    const { data, error } = await query.order('professional_id').order('service_id');
    if (error) throw new Error('Erro ao buscar taxas de comissão.');
    return data ?? [];
  },

  async upsertRate(professionalId: string, serviceId: string, percentage: number): Promise<DbCommissionRate> {
    if (!hasSupabase) throw new Error('Banco de dados não configurado.');
    const { data, error } = await supabase
      .from('professional_service_commissions')
      .upsert(
        { professional_id: professionalId, service_id: serviceId, commission_percentage: percentage },
        { onConflict: 'professional_id,service_id' },
      )
      .select()
      .single();
    if (error || !data) throw new Error('Erro ao salvar taxa de comissão.');
    return data as DbCommissionRate;
  },

  async deleteRate(professionalId: string, serviceId: string): Promise<void> {
    if (!hasSupabase) return;
    await supabase
      .from('professional_service_commissions')
      .delete()
      .eq('professional_id', professionalId)
      .eq('service_id', serviceId);
  },

  async findRecordByAppointment(appointmentId: string): Promise<DbCommissionRecord | null> {
    if (!hasSupabase) return null;
    const { data } = await supabase
      .from('commission_records')
      .select('*')
      .eq('appointment_id', appointmentId)
      .maybeSingle();
    return data as DbCommissionRecord | null;
  },

  async createRecord(input: {
    appointmentId: string;
    professionalId: string;
    serviceId: string;
    servicePrice: number;
    commissionPercentage: number;
  }): Promise<DbCommissionRecord> {
    if (!hasSupabase) throw new Error('Banco de dados não configurado.');
    const commissionAmount = Math.round(input.servicePrice * input.commissionPercentage) / 100;
    const { data, error } = await supabase
      .from('commission_records')
      .insert({
        appointment_id:        input.appointmentId,
        professional_id:       input.professionalId,
        service_id:            input.serviceId,
        service_price:         input.servicePrice,
        commission_percentage: input.commissionPercentage,
        commission_amount:     commissionAmount,
        status:                'pendente',
      })
      .select()
      .single();
    if (error || !data) throw new Error('Erro ao criar registro de comissão.');
    return data as DbCommissionRecord;
  },

  async findRecords(filters: {
    professionalId?: string;
    status?: string;
    from?: string;
    to?: string;
    page: number;
    limit: number;
  }): Promise<{ items: any[]; total: number }> {
    if (!hasSupabase) return { items: [], total: 0 };

    let query = supabase
      .from('commission_records')
      .select(
        '*, professional:professionals(id,name), service:services(id,name), appointment:appointments(appointment_date,appointment_time)',
        { count: 'exact' },
      );

    if (filters.professionalId) query = query.eq('professional_id', filters.professionalId);
    if (filters.status)         query = query.eq('status', filters.status);
    if (filters.from)           query = query.gte('created_at', filters.from);
    if (filters.to)             query = query.lte('created_at', filters.to + 'T23:59:59');

    const from = (filters.page - 1) * filters.limit;
    const to   = filters.page * filters.limit - 1;
    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await query;
    if (error) throw new Error('Erro ao buscar registros de comissão.');
    return { items: data ?? [], total: count ?? 0 };
  },

  async markAsPaid(ids: string[], adminId: string, notes?: string): Promise<void> {
    if (!hasSupabase) throw new Error('Banco de dados não configurado.');
    const { error } = await supabase
      .from('commission_records')
      .update({ status: 'pago', paid_at: new Date().toISOString(), paid_by_admin_id: adminId, notes: notes ?? null })
      .in('id', ids)
      .eq('status', 'pendente');
    if (error) throw new Error('Erro ao registrar repasse.');
  },

  async findReportRecords(professionalId: string, from: string, to: string): Promise<any[]> {
    if (!hasSupabase) return [];

    // Step 1: appointment IDs for the professional in the date range
    const { data: appts } = await supabase
      .from('appointments')
      .select('id, user_id')
      .eq('professional_id', professionalId)
      .gte('appointment_date', from)
      .lte('appointment_date', to);

    const apptIds = (appts ?? []).map((a: any) => a.id);
    if (!apptIds.length) return [];

    const userIdByAppt: Record<string, string> = {};
    for (const a of (appts ?? []) as any[]) { userIdByAppt[a.id] = a.user_id; }

    // Step 2: commission records with appointment and service
    const { data: records, error } = await supabase
      .from('commission_records')
      .select('*, service:services(id,name), appointment:appointments(id,appointment_date,appointment_time)')
      .eq('professional_id', professionalId)
      .in('appointment_id', apptIds)
      .order('appointment_id');

    if (error) throw new Error('Erro ao gerar relatório.');
    if (!records?.length) return [];

    // Step 3: user names
    const userIds = [...new Set(Object.values(userIdByAppt))].filter(Boolean);
    const userNameById: Record<string, string> = {};
    if (userIds.length) {
      const { data: users } = await supabase.from('users').select('id,name').in('id', userIds);
      for (const u of (users ?? []) as any[]) { userNameById[u.id] = u.name; }
    }

    // Step 4: payment methods
    const paymentByAppt: Record<string, string> = {};
    const { data: payments } = await supabase
      .from('payments')
      .select('appointment_id,method,status')
      .in('appointment_id', apptIds);
    for (const p of (payments ?? []) as any[]) {
      if (!paymentByAppt[p.appointment_id] && p.method) {
        paymentByAppt[p.appointment_id] = p.method;
      }
    }

    // Merge
    return (records as any[]).map((rec) => ({
      ...rec,
      appointment: {
        ...rec.appointment,
        client_name: userNameById[userIdByAppt[rec.appointment_id]] ?? '—',
        payment_method: paymentByAppt[rec.appointment_id] ?? null,
      },
    }));
  },

  async getSummary(from: string, to: string): Promise<any[]> {
    if (!hasSupabase) return [];
    const { data, error } = await supabase
      .from('commission_records')
      .select('professional_id, professional:professionals(id,name,avatar_url), commission_amount, status')
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59');
    if (error) throw new Error('Erro ao gerar resumo.');

    const byPro: Record<string, any> = {};
    for (const row of (data ?? []) as any[]) {
      const id = row.professional_id;
      if (!byPro[id]) {
        byPro[id] = {
          professional_id:   id,
          professional_name: row.professional?.name ?? 'Desconhecido',
          professional_avatar: row.professional?.avatar_url ?? null,
          total_pendente:    0,
          total_pago:        0,
          count_pendente:    0,
          count_pago:        0,
        };
      }
      if (row.status === 'pendente') {
        byPro[id].total_pendente += Number(row.commission_amount);
        byPro[id].count_pendente += 1;
      } else {
        byPro[id].total_pago += Number(row.commission_amount);
        byPro[id].count_pago += 1;
      }
    }
    return Object.values(byPro).sort((a, b) => b.total_pendente - a.total_pendente);
  },
};
