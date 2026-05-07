import { hasSupabase } from '../../config/env';
import { supabase } from '../../config/supabase';
import { MOCK_APPOINTMENTS } from '../appointments/appointments.mock';

// ─── Mock data ────────────────────────────────────────────────────────────────

export const MOCK_SERVICES = [
  { id: 'svc-1', name: 'Cílios Fio a Fio Clássico', description: 'Aplicação de extensão de cílios fio a fio', price: 150, durationMinutes: 120, category: 'outros', isActive: true, imageUrl: undefined, bookingFeeApplicable: true, bookingFeeType: 'fixed', bookingFeeValue: 40, variations: [
    { id: 'var-1a', name: 'Colocação', price: 150, durationMinutes: 120, description: 'Para quem nunca colocou ou passou dos 20 dias' },
    { id: 'var-1b', name: 'Manutenção', price: 80, durationMinutes: 60, description: 'Para quem colocou entre 14 e 20 dias' },
    { id: 'var-1c', name: 'Remoção', price: 40, durationMinutes: 30 },
  ]},
  { id: 'svc-2', name: 'Coloração', description: 'Coloração completa', price: 120, durationMinutes: 120, category: 'cabelo', isActive: true, imageUrl: undefined, bookingFeeApplicable: true, bookingFeeType: 'fixed', bookingFeeValue: 40, variations: [] },
  { id: 'svc-3', name: 'Mechas', description: 'Mechas e luzes', price: 280, durationMinutes: 180, category: 'cabelo', isActive: true, imageUrl: undefined, bookingFeeApplicable: true, bookingFeeType: 'fixed', bookingFeeValue: 40, variations: [] },
  { id: 'svc-4', name: 'Manicure', description: 'Manicure completa', price: 90, durationMinutes: 60, category: 'unhas', isActive: true, imageUrl: undefined, bookingFeeApplicable: true, bookingFeeType: 'fixed', bookingFeeValue: 40, variations: [] },
];

export const MOCK_PROFESSIONALS = [
  { id: 'pro-1', name: 'Fernanda Correa', avatarUrl: undefined, bio: 'Fundadora do studio', specialties: ['Coloração', 'Mechas'], isActive: true, rating: 5.0, reviewCount: 42 },
  { id: 'pro-2', name: 'Juliana Lima', avatarUrl: undefined, bio: 'Especialista em esmaltação', specialties: ['Manicure', 'Pedicure'], isActive: true, rating: 4.9, reviewCount: 31 },
];

const MOCK_CUSTOMERS = [
  { id: 'user-1', name: 'Ana Paula Santos', email: 'ana@email.com', phone: '11999999001', isVip: true, isBlocked: false, birthDate: '1990-03-15', acceptsMarketing: true, acceptsPush: true, createdAt: '2024-01-10' },
  { id: 'user-2', name: 'Carla Mendes', email: 'carla@email.com', phone: '11999999002', isVip: false, isBlocked: false, birthDate: '1985-07-22', acceptsMarketing: true, acceptsPush: false, createdAt: '2024-02-05' },
  { id: 'user-3', name: 'Bianca Oliveira', email: 'bianca@email.com', phone: '11999999003', isVip: false, isBlocked: false, birthDate: null, acceptsMarketing: false, acceptsPush: true, createdAt: '2024-03-01' },
];

export const adminService = {
  // ─── Dashboard ──────────────────────────────────────────────────────────────

  async getDashboardStats() {
    if (!hasSupabase) {
      return {
        totalAppointmentsToday: 4,
        totalAppointmentsMonth: 23,
        pendingPayments: 2,
        approvedPayments: 21,
        newCustomersMonth: 8,
        totalCustomers: 47,
        activeCoupons: 3,
        revenueMonth: 1840,
        revenueToday: 160,
        upcomingToday: MOCK_APPOINTMENTS.slice(0, 3),
        birthdaysToday: [{ id: 'user-1', name: 'Ana Paula Santos' }],
      };
    }

    const today = new Date().toISOString().slice(0, 10);
    const monthStart = today.slice(0, 7) + '-01';
    const todayMMDD = today.slice(5); // MM-DD

    const [apptToday, apptMonth, pendingPay, approvedPay, coupons, customers, newCustomers, revenueRows, upcomingRows, birthdayRows] = await Promise.all([
      supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('appointment_date', today),
      supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('appointment_date', monthStart),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'aprovado'),
      supabase.from('coupons').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
      supabase.from('payments').select('amount').eq('status', 'aprovado').gte('created_at', monthStart),
      supabase.from('appointments').select('id, appointment_time, users(name), services(name), professionals(name)').eq('appointment_date', today).in('status', ['confirmado', 'pendente_pagamento']).order('appointment_time'),
      supabase.from('users').select('id, name').not('birth_date', 'is', null).like('birth_date', `%-${todayMMDD}`),
    ]);

    const revenueMonth = (revenueRows.data ?? []).reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    return {
      totalAppointmentsToday: apptToday.count ?? 0,
      totalAppointmentsMonth: apptMonth.count ?? 0,
      pendingPayments: pendingPay.count ?? 0,
      approvedPayments: approvedPay.count ?? 0,
      activeCoupons: coupons.count ?? 0,
      totalCustomers: customers.count ?? 0,
      newCustomersMonth: newCustomers.count ?? 0,
      revenueMonth,
      upcomingToday: upcomingRows.data ?? [],
      birthdaysToday: birthdayRows.data ?? [],
    };
  },

  // ─── Services ───────────────────────────────────────────────────────────────

  async listServices() {
    if (!hasSupabase) return MOCK_SERVICES;
    // Try with sort_order first; fall back to name-ordering if column not yet migrated
    let { data, error } = await supabase.from('services').select('*').order('sort_order', { ascending: true }).order('name');
    if (error?.message?.includes('sort_order')) {
      ({ data, error } = await supabase.from('services').select('*').order('name'));
    }
    return (data ?? []).map((s: any) => ({
      id: s.id, name: s.name, description: s.description, price: s.price,
      durationMinutes: s.duration_minutes, category: s.category,
      imageUrl: s.image_url, isActive: s.is_active,
      sortOrder: s.sort_order ?? 0,
      bookingFeeType: s.booking_fee_type ?? 'fixed',
      bookingFeeValue: s.booking_fee_value ?? 40,
      variations: s.variations ?? [],
    }));
  },

  async reorderServices(items: { id: string; sortOrder: number }[]) {
    if (!hasSupabase) return;
    const results = await Promise.all(
      items.map(({ id, sortOrder }) =>
        supabase.from('services').update({ sort_order: sortOrder }).eq('id', id)
      )
    );
    const firstErr = results.find((r) => r.error)?.error;
    if (firstErr) {
      if (firstErr.message.includes('sort_order')) {
        throw new Error('Migration pendente: execute 005_add_service_sort_order.sql no Supabase SQL Editor.');
      }
      throw new Error(firstErr.message);
    }
  },

  async createService(input: any) {
    if (!hasSupabase) { return { id: `svc-${Date.now()}`, variations: [], ...input }; }
    const { data, error } = await supabase.from('services').insert({
      name: input.name, description: input.description, price: input.price,
      duration_minutes: input.durationMinutes, category: input.category,
      image_url: input.imageUrl, is_active: input.isActive ?? true,
      booking_fee_type: input.bookingFeeType ?? 'fixed',
      booking_fee_value: input.bookingFeeValue ?? 40,
      variations: input.variations ?? [],
    }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateService(id: string, input: any) {
    if (!hasSupabase) { return { id, variations: [], ...input }; }
    const { data, error } = await supabase.from('services').update({
      name: input.name, description: input.description, price: input.price,
      duration_minutes: input.durationMinutes, category: input.category,
      image_url: input.imageUrl, is_active: input.isActive,
      booking_fee_type: input.bookingFeeType,
      booking_fee_value: input.bookingFeeValue,
      variations: input.variations ?? [],
    }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteService(id: string) {
    if (!hasSupabase) return;
    await supabase.from('services').delete().eq('id', id);
  },

  // ─── Professionals ──────────────────────────────────────────────────────────

  async listProfessionals() {
    if (!hasSupabase) return MOCK_PROFESSIONALS;
    const { data } = await supabase.from('professionals').select('*').order('name');
    return (data ?? []).map((p: any) => ({
      id: p.id, name: p.name, avatarUrl: p.avatar_url, bio: p.bio,
      specialties: p.specialties, isActive: p.is_active,
      rating: p.rating, reviewCount: p.review_count, trinksEmployeeId: p.trinks_employee_id,
    }));
  },

  async createProfessional(input: any) {
    if (!hasSupabase) { return { id: `pro-${Date.now()}`, rating: 5.0, reviewCount: 0, ...input }; }
    const { data, error } = await supabase.from('professionals').insert({
      name: input.name, avatar_url: input.avatarUrl, bio: input.bio,
      specialties: input.specialties ?? [], is_active: input.isActive ?? true,
      trinks_employee_id: input.trinksEmployeeId,
    }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateProfessional(id: string, input: any) {
    if (!hasSupabase) { return { id, ...input }; }
    const { data, error } = await supabase.from('professionals').update({
      name: input.name, avatar_url: input.avatarUrl, bio: input.bio,
      specialties: input.specialties, is_active: input.isActive,
      trinks_employee_id: input.trinksEmployeeId,
    }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteProfessional(id: string) {
    if (!hasSupabase) return;
    await supabase.from('professionals').delete().eq('id', id);
  },

  // ─── Customers ──────────────────────────────────────────────────────────────

  async listCustomers({ search, page, limit }: { search?: string; page: number; limit: number }) {
    if (!hasSupabase) {
      const filtered = search
        ? MOCK_CUSTOMERS.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.includes(search))
        : MOCK_CUSTOMERS;
      return { items: filtered, total: filtered.length, page, limit };
    }

    let query = supabase.from('users').select('id,name,email,phone,is_vip,is_blocked,birth_date,accepts_marketing,accepts_push,created_at', { count: 'exact' });
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    query = query.order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);

    const { data, count } = await query;
    return {
      items: (data ?? []).map((u: any) => ({
        id: u.id, name: u.name, email: u.email, phone: u.phone,
        isVip: u.is_vip, isBlocked: u.is_blocked, birthDate: u.birth_date,
        acceptsMarketing: u.accepts_marketing, acceptsPush: u.accepts_push,
        createdAt: u.created_at,
      })),
      total: count ?? 0,
      page,
      limit,
    };
  },

  async getCustomer(id: string) {
    if (!hasSupabase) {
      const customer = MOCK_CUSTOMERS.find((c) => c.id === id);
      if (!customer) throw new Error('Cliente não encontrado.');
      return { customer, appointments: MOCK_APPOINTMENTS.filter((a) => a.user_id === id) };
    }
    const { data: customer } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    if (!customer) throw new Error('Cliente não encontrado.');
    const { data: appointments } = await supabase.from('appointments').select('*').eq('user_id', id).order('appointment_date', { ascending: false });
    return { customer, appointments: appointments ?? [] };
  },

  async createCustomer(input: any) {
    if (!hasSupabase) {
      return {
        id: `user-${Date.now()}`, name: input.name, email: input.email,
        phone: input.phone ?? null, birthDate: input.birthDate ?? null,
        isVip: false, isBlocked: false,
        acceptsMarketing: input.acceptsMarketing ?? false,
        acceptsPush: input.acceptsPush ?? false,
        createdAt: new Date().toISOString(),
      };
    }
    const { data: existing } = await supabase.from('users').select('id').eq('email', input.email).maybeSingle();
    if (existing) throw new Error('E-mail já cadastrado.');
    const { data, error } = await supabase.from('users').insert({
      name: input.name, email: input.email, phone: input.phone,
      birth_date: input.birthDate, password_hash: '',
      accepts_marketing: input.acceptsMarketing ?? false,
      accepts_push: input.acceptsPush ?? false,
      is_vip: false, is_blocked: false, is_active: true,
      email_verified_at: new Date().toISOString(),
    }).select().single();
    if (error) throw new Error(error.message);
    return {
      id: data.id, name: data.name, email: data.email, phone: data.phone,
      isVip: data.is_vip, isBlocked: data.is_blocked, birthDate: data.birth_date,
      acceptsMarketing: data.accepts_marketing, acceptsPush: data.accepts_push,
      createdAt: data.created_at,
    };
  },

  async updateCustomer(id: string, input: any) {
    if (!hasSupabase) { return { id, ...input }; }
    const { data, error } = await supabase.from('users').update({
      is_vip: input.isVip, is_blocked: input.isBlocked,
      birth_date: input.birthDate, accepts_marketing: input.acceptsMarketing,
      accepts_push: input.acceptsPush, internal_notes: input.internalNotes,
    }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  // ─── Coupons ────────────────────────────────────────────────────────────────

  async listCoupons() {
    if (!hasSupabase) {
      return [
        { id: 'cpn-1', code: 'BOAS_VINDAS', title: 'Boas-vindas', discountType: 'fixed', discountValue: 20, status: 'ativo', validFrom: '2024-01-01', validUntil: '2024-12-31', usedCount: 5, maxUsages: 100 },
        { id: 'cpn-2', code: 'VERAO20', title: 'Verão 20%', discountType: 'percentage', discountValue: 20, status: 'ativo', validFrom: '2024-01-01', validUntil: '2024-03-31', usedCount: 12, maxUsages: 50 },
      ];
    }
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    return (data ?? []).map((c: any) => ({
      id: c.id, code: c.code, title: c.title, description: c.description,
      discountType: c.discount_type, discountValue: c.discount_value,
      status: c.status, validFrom: c.valid_from, validUntil: c.valid_until,
      usedCount: c.used_count, maxUsages: c.max_usages,
    }));
  },

  async createCoupon(input: any) {
    if (!hasSupabase) { return { id: `cpn-${Date.now()}`, usedCount: 0, ...input }; }
    const { data, error } = await supabase.from('coupons').insert({
      code: input.code, title: input.title, description: input.description,
      discount_type: input.discountType, discount_value: input.discountValue,
      min_order_value: input.minOrderValue, max_usages: input.maxUsages,
      valid_from: input.validFrom, valid_until: input.validUntil,
      status: input.status ?? 'ativo', rules: input.rules ?? [],
    }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateCoupon(id: string, input: any) {
    if (!hasSupabase) { return { id, ...input }; }
    const { data, error } = await supabase.from('coupons').update({
      code: input.code, title: input.title, description: input.description,
      discount_type: input.discountType, discount_value: input.discountValue,
      min_order_value: input.minOrderValue, max_usages: input.maxUsages,
      valid_from: input.validFrom, valid_until: input.validUntil,
      status: input.status, rules: input.rules,
    }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteCoupon(id: string) {
    if (!hasSupabase) return;
    await supabase.from('coupons').delete().eq('id', id);
  },

  // ─── Benefits ───────────────────────────────────────────────────────────────

  async listBenefits() {
    if (!hasSupabase) {
      return [
        { id: 'ben-1', title: 'Hidratação Profunda', description: 'Tratamento intensivo', type: 'promocao', isActive: true, validUntil: '2024-12-31', sortOrder: 0 },
      ];
    }
    const { data } = await supabase.from('benefits').select('*').order('sort_order');
    return (data ?? []).map((b: any) => ({
      id: b.id, title: b.title, description: b.description, type: b.type,
      imageUrl: b.image_url, cta: b.cta, ctaLink: b.cta_link,
      validUntil: b.valid_until, isActive: b.is_active, sortOrder: b.sort_order,
    }));
  },

  async createBenefit(input: any) {
    if (!hasSupabase) { return { id: `ben-${Date.now()}`, ...input }; }
    const { data, error } = await supabase.from('benefits').insert({
      title: input.title, description: input.description, type: input.type,
      image_url: input.imageUrl, cta: input.cta, cta_link: input.ctaLink,
      valid_until: input.validUntil, is_active: input.isActive ?? true,
    }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateBenefit(id: string, input: any) {
    if (!hasSupabase) { return { id, ...input }; }
    const { data, error } = await supabase.from('benefits').update({
      title: input.title, description: input.description, type: input.type,
      image_url: input.imageUrl, cta: input.cta, cta_link: input.ctaLink,
      valid_until: input.validUntil, is_active: input.isActive,
    }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteBenefit(id: string) {
    if (!hasSupabase) return;
    await supabase.from('benefits').delete().eq('id', id);
  },

  // ─── Appointments (admin view) ───────────────────────────────────────────────

  async listAppointments({ date, status, page, limit }: { date?: string; status?: string; page: number; limit: number }) {
    if (!hasSupabase) {
      return { items: MOCK_APPOINTMENTS, total: MOCK_APPOINTMENTS.length, page, limit };
    }
    let query = supabase.from('appointments').select('*, user:users(name,email)', { count: 'exact' });
    if (date) query = query.eq('appointment_date', date);
    if (status) query = query.eq('status', status);
    query = query.order('appointment_date', { ascending: false }).range((page - 1) * limit, page * limit - 1);
    const { data, count } = await query;
    return { items: data ?? [], total: count ?? 0, page, limit };
  },

  async createAppointment(input: any) {
    let result: any;

    if (!hasSupabase) {
      result = {
        id: `apt-${Date.now()}`,
        user_id: input.userId, service_id: input.serviceId,
        professional_id: input.professionalId,
        appointment_date: input.appointmentDate, appointment_time: input.appointmentTime,
        status: input.status ?? 'confirmado',
        service_price: input.servicePrice ?? 0, booking_fee: input.bookingFee ?? 0,
        remaining_amount: input.remainingAmount ?? (input.servicePrice ?? 0) - (input.bookingFee ?? 0),
        payment_status: 'pendente', notes: input.notes ?? null,
        created_at: new Date().toISOString(),
      };
    } else {
      const { data, error } = await supabase.from('appointments').insert({
        user_id: input.userId, service_id: input.serviceId,
        professional_id: input.professionalId,
        appointment_date: input.appointmentDate, appointment_time: input.appointmentTime,
        status: input.status ?? 'confirmado',
        service_price: input.servicePrice ?? 0, booking_fee: input.bookingFee ?? 0,
        remaining_amount: input.remainingAmount ?? (input.servicePrice ?? 0) - (input.bookingFee ?? 0),
        payment_status: 'pendente', notes: input.notes,
      }).select().single();
      if (error) throw new Error(error.message);
      result = data;
    }

    // Non-blocking sync to Trinks (works even in mock/no-DB mode)
    setImmediate(() => _syncAdminApptToTrinks(result.id, input));

    return result;
  },

  // ─── Payments (admin view) ───────────────────────────────────────────────────

  async listPayments({ status, from, to, page, limit }: { status?: string; from?: string; to?: string; page: number; limit: number }) {
    if (!hasSupabase) {
      return {
        items: [
          { id: 'pay-1', amount: 40, status: 'aprovado', method: 'pix', createdAt: new Date().toISOString(), userName: 'Ana Paula' },
          { id: 'pay-2', amount: 40, status: 'pendente', method: 'pix', createdAt: new Date().toISOString(), userName: 'Carla Mendes' },
        ],
        total: 2, page, limit,
      };
    }
    let query = supabase.from('payments').select('*, user:users(name)', { count: 'exact' });
    if (status) query = query.eq('status', status);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);
    query = query.order('created_at', { ascending: false }).range((page - 1) * limit, page * limit - 1);
    const { data, count } = await query;
    return { items: data ?? [], total: count ?? 0, page, limit };
  },

  // ─── App Settings ────────────────────────────────────────────────────────────

  async getSetting(key: string) {
    const defaults: Record<string, any> = {
      branding: { primaryColor: '#C9A4A0', accentColor: '#C9A87C', backgroundColor: '#F8F5F2', logoUrl: null, bannerUrl: null, tagline: 'Beleza que transforma.' },
      schedule: { bookingFee: 40, cancelPolicy: '24h', noShowFee: 0, slotIntervalMinutes: 30, blockedDates: [], businessHours: {} },
      integrations: { trinksEnabled: false, mercadoPagoEnabled: false, googleReviewLink: '', pushEnabled: true },
    };
    if (!hasSupabase) return defaults[key] ?? null;
    const { data } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
    return (data as any)?.value ?? defaults[key] ?? null;
  },

  async setSetting(key: string, value: any, adminId: string) {
    if (!hasSupabase) return value;
    await supabase.from('app_settings').upsert({ key, value, updated_by: adminId, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    return value;
  },

  // ─── Admin Users ─────────────────────────────────────────────────────────────

  async listAdminUsers() {
    if (!hasSupabase) {
      return [{ id: 'admin-1', name: 'Admin Studio', email: 'admin@studiofernandacorrea.com.br', role: 'owner', isActive: true, lastLoginAt: new Date().toISOString() }];
    }
    const { data } = await supabase.from('admin_users').select('id,name,email,role,is_active,last_login_at').order('name');
    return (data ?? []).map((u: any) => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      isActive: u.is_active, lastLoginAt: u.last_login_at,
    }));
  },

  async updateAdminUser(id: string, input: any) {
    if (!hasSupabase) { return { id, ...input }; }
    const { data, error } = await supabase.from('admin_users').update({
      name: input.name, role: input.role, is_active: input.isActive,
    }).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  // ─── Audit Logs ──────────────────────────────────────────────────────────────

  async listAuditLogs({ page, limit }: { page: number; limit: number }) {
    if (!hasSupabase) { return { items: [], total: 0, page, limit }; }
    const { data, count } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);
    return { items: data ?? [], total: count ?? 0, page, limit };
  },

  async createAuditLog(data: { adminUserId: string; adminEmail: string; action: string; entityType?: string; entityId?: string; changes?: any; ipAddress?: string }) {
    if (!hasSupabase) { console.log('[audit]', data); return; }
    await supabase.from('audit_logs').insert({
      admin_user_id: data.adminUserId,
      admin_email: data.adminEmail,
      action: data.action,
      entity_type: data.entityType,
      entity_id: data.entityId,
      changes: data.changes,
      ip_address: data.ipAddress,
    });
  },

  // ─── Push Campaigns ──────────────────────────────────────────────────────────

  async listPushCampaigns() {
    if (!hasSupabase) {
      return [
        { id: 'camp-1', title: 'Volta das aulas', body: 'Cuide do seu cabelo neste começo de ano!', segment: 'todos', status: 'enviada', sentAt: new Date().toISOString(), sentCount: 45 },
      ];
    }
    const { data } = await supabase.from('push_campaigns').select('*').order('created_at', { ascending: false });
    return data ?? [];
  },

  async createPushCampaign(input: any, adminId: string) {
    if (!hasSupabase) { return { id: `camp-${Date.now()}`, sentCount: 0, ...input }; }
    const { data, error } = await supabase.from('push_campaigns').insert({
      title: input.title, body: input.body, segment: input.segment ?? 'todos',
      status: input.scheduledAt ? 'agendada' : 'rascunho',
      scheduled_at: input.scheduledAt, created_by: adminId,
    }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  async sendPushCampaign(campaignId: string) {
    // Import push service dynamically to avoid circular deps
    const { pushService } = await import('../../services/push.service');

    if (!hasSupabase) {
      // Mock: simulate sending to all mock users
      const mockCount = 3;
      console.log(`[push-campaigns] Mock send: campaign ${campaignId}, ${mockCount} tokens`);
      return { sent: mockCount, failed: 0 };
    }

    const { data: campaign, error: ce } = await supabase
      .from('push_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (ce || !campaign) throw new Error('Campanha não encontrada.');
    if (campaign.status === 'enviada') throw new Error('Campanha já foi enviada.');

    // Fetch active push tokens based on segment
    let query = supabase.from('push_tokens').select('user_id, token').eq('is_active', true);
    if (campaign.segment === 'vip') {
      const { data: vipUsers } = await supabase.from('users').select('id').eq('is_vip', true);
      const vipIds = (vipUsers ?? []).map((u: any) => u.id);
      if (vipIds.length > 0) query = query.in('user_id', vipIds);
    } else if (campaign.segment === 'marketing') {
      const { data: mktUsers } = await supabase.from('users').select('id').eq('accepts_marketing', true);
      const mktIds = (mktUsers ?? []).map((u: any) => u.id);
      if (mktIds.length > 0) query = query.in('user_id', mktIds);
    }

    const { data: tokens } = await query;
    const tokenList: string[] = (tokens ?? []).map((t: any) => t.token);

    let sent = 0;
    let failed = 0;

    if (tokenList.length > 0) {
      const results = await pushService.sendBulk(tokenList, {
        title: campaign.title,
        body: campaign.body,
        data: { type: 'campanha', campaignId },
      });
      sent = results.sent;
      failed = results.failed;
    }

    // Update campaign status
    await supabase
      .from('push_campaigns')
      .update({ status: 'enviada', sent_count: sent, sent_at: new Date().toISOString() })
      .eq('id', campaignId);

    return { sent, failed };
  },

  // ─── Feedback ────────────────────────────────────────────────────────────────

  MOCK_FEEDBACK: [
    { id: 'fb-1', user_name: 'Ana Silva', user_email: 'ana@email.com', rating: 5, comment: 'Atendimento excelente! A Fernanda é incrível.', professional_name: 'Fernanda Correa', service_name: 'Coloração', status: 'pendente', created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: 'fb-2', user_name: 'Carla Mendes', user_email: 'carla@email.com', rating: 4, comment: 'Muito boa experiência, voltarei com certeza.', professional_name: 'Juliana Santos', service_name: 'Corte Feminino', status: 'aprovado', created_at: new Date(Date.now() - 2*86400000).toISOString() },
    { id: 'fb-3', user_name: 'Bianca Costa', user_email: 'bianca@email.com', rating: 2, comment: 'Esperei muito tempo, não gostei do resultado.', professional_name: 'Fernanda Correa', service_name: 'Hidratação', status: 'pendente', created_at: new Date(Date.now() - 3*86400000).toISOString() },
    { id: 'fb-4', user_name: 'Mariana Lima', user_email: 'mariana@email.com', rating: 5, comment: 'Perfeito! Super recomendo!', professional_name: 'Juliana Santos', service_name: 'Manicure', status: 'aprovado', created_at: new Date(Date.now() - 4*86400000).toISOString() },
  ] as any[],

  async listFeedback(params: { status?: string; page: number; limit: number }) {
    const { page, limit, status } = params;
    const offset = (page - 1) * limit;

    if (!hasSupabase) {
      let items = [...adminService.MOCK_FEEDBACK];
      if (status) items = items.filter((f) => f.status === status);
      return { items: items.slice(offset, offset + limit), total: items.length, page, limit };
    }

    let query = supabase
      .from('feedback')
      .select('*, users(name, email)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message);
    return { items: data ?? [], total: count ?? 0, page, limit };
  },

  async updateFeedbackStatus(id: string, status: 'aprovado' | 'rejeitado', adminId: string) {
    if (!hasSupabase) {
      const fb = adminService.MOCK_FEEDBACK.find((f) => f.id === id);
      if (fb) fb.status = status;
      return fb ?? { id, status };
    }
    const { data, error } = await supabase
      .from('feedback')
      .update({ status, moderated_by: adminId, moderated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  // ─── Reviews Summary ──────────────────────────────────────────────────────────

  async getReviewsSummary() {
    if (!hasSupabase) {
      return {
        averageRating: 4.8,
        totalReviews: 127,
        breakdown: { '5': 98, '4': 18, '3': 7, '2': 2, '1': 2 },
        recentReviews: adminService.MOCK_FEEDBACK
          .filter((f) => f.status === 'aprovado')
          .map((f) => ({
            id: f.id,
            userName: f.user_name,
            rating: f.rating,
            comment: f.comment,
            source: 'app' as const,
            createdAt: f.created_at,
          })),
      };
    }

    const { data: reviews } = await supabase
      .from('feedback')
      .select('rating, comment, status, created_at, users(name)')
      .eq('status', 'aprovado')
      .order('created_at', { ascending: false });

    const items = reviews ?? [];
    const total = items.length;
    const breakdown: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let sum = 0;
    for (const r of items) {
      sum += r.rating;
      breakdown[String(r.rating)] = (breakdown[String(r.rating)] ?? 0) + 1;
    }
    const averageRating = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

    return {
      averageRating,
      totalReviews: total,
      breakdown,
      recentReviews: items.slice(0, 10).map((r: any) => ({
        id: r.id ?? Math.random().toString(),
        userName: r.users?.name ?? 'Cliente',
        rating: r.rating,
        comment: r.comment,
        source: 'app' as const,
        createdAt: r.created_at,
      })),
    };
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function _syncAdminApptToTrinks(appointmentId: string, input: any): Promise<void> {
  try {
    const { trinksService } = await import('../trinks/trinks.service');

    let clientName: string | undefined;
    let clientEmail: string | undefined;
    let clientPhone: string | undefined;

    if (hasSupabase && input.userId) {
      const { supabase: db } = await import('../../config/supabase');
      const { data: user } = await db.from('users').select('name,email,phone').eq('id', input.userId).maybeSingle();
      if (user) { clientName = user.name; clientEmail = user.email; clientPhone = user.phone; }
    }

    const trinksResult = await trinksService.createAppointment({
      serviceId: input.serviceId,
      professionalId: input.professionalId,
      date: input.appointmentDate,
      time: input.appointmentTime,
      clientName,
      clientEmail,
      clientPhone,
      notes: input.notes,
    });

    if (trinksResult.id && hasSupabase) {
      const { supabase: db } = await import('../../config/supabase');
      await db.from('appointments').update({ trinks_appointment_id: trinksResult.id }).eq('id', appointmentId);
    }

    console.log(`[admin-appointment] Trinks sync ok: ${trinksResult.id ?? 'mock'}`);
  } catch (err) {
    console.error('[admin-appointment] Trinks sync failed:', (err as Error).message);
  }
}
