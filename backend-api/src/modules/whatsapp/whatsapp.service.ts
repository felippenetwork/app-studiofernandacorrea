import { createClient } from '@supabase/supabase-js';
import { env, hasSupabase } from '../../config/env';
import { evolutionGetStatus, evolutionSend } from './evolution.provider';
import { getBaileysStatus, sendBaileysMessage } from './baileys.manager';

const supabase = hasSupabase
  ? createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_KEY!)
  : null as any;

export interface WppConfig {
  id?: string;
  provider: string;
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  isActive: boolean;
}

export interface WppTemplate {
  id: string;
  trigger: string;
  name: string;
  message: string;
  isActive: boolean;
  delayDays: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────
export async function getConfig(): Promise<WppConfig | null> {
  if (!hasSupabase) return null;
  const { data } = await supabase.from('whatsapp_config').select('*').limit(1).maybeSingle();
  if (!data) return null;
  return {
    id:           data.id,
    provider:     data.provider ?? 'evolution',
    apiUrl:       data.api_url ?? '',
    apiKey:       data.api_key ?? '',
    instanceName: data.instance_name ?? '',
    isActive:     data.is_active,
  };
}

export async function saveConfig(input: Omit<WppConfig, 'id' | 'isActive'>): Promise<WppConfig> {
  if (!hasSupabase) throw new Error('Supabase not configured');
  const existing = await getConfig();
  if (existing?.id) {
    const { data } = await supabase
      .from('whatsapp_config')
      .update({
        provider:      input.provider,
        api_url:       input.apiUrl,
        api_key:       input.apiKey,
        instance_name: input.instanceName,
        updated_at:    new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select().single();
    return mapConfig(data);
  }
  const { data } = await supabase
    .from('whatsapp_config')
    .insert({ provider: input.provider, api_url: input.apiUrl, api_key: input.apiKey, instance_name: input.instanceName })
    .select().single();
  return mapConfig(data);
}

function mapConfig(data: any): WppConfig {
  return {
    id:           data.id,
    provider:     data.provider ?? 'evolution',
    apiUrl:       data.api_url ?? '',
    apiKey:       data.api_key ?? '',
    instanceName: data.instance_name ?? '',
    isActive:     data.is_active,
  };
}

export async function setActive(active: boolean): Promise<void> {
  if (!hasSupabase) return;
  await supabase.from('whatsapp_config').update({ is_active: active, updated_at: new Date().toISOString() }).neq('id', '');
}

// ─── Templates ────────────────────────────────────────────────────────────────
export async function getTemplates(): Promise<WppTemplate[]> {
  if (!hasSupabase) return [];
  const { data } = await supabase.from('whatsapp_templates').select('*').order('trigger');
  return (data ?? []).map(mapTemplate);
}

export async function updateTemplate(id: string, input: { message?: string; isActive?: boolean }): Promise<WppTemplate> {
  if (!hasSupabase) throw new Error('Supabase not configured');
  const updates: any = { updated_at: new Date().toISOString() };
  if (input.message  !== undefined) updates.message   = input.message;
  if (input.isActive !== undefined) updates.is_active = input.isActive;
  const { data } = await supabase.from('whatsapp_templates').update(updates).eq('id', id).select().single();
  return mapTemplate(data);
}

function mapTemplate(d: any): WppTemplate {
  return { id: d.id, trigger: d.trigger, name: d.name, message: d.message, isActive: d.is_active, delayDays: d.delay_days };
}

// ─── Status (multi-provider) ──────────────────────────────────────────────────
export async function getStatus(): Promise<{ connected: boolean; qrcode?: string; state?: string }> {
  const cfg = await getConfig();
  if (!cfg) return { connected: false, state: 'not_configured' };

  if (cfg.provider === 'baileys') {
    const s = getBaileysStatus();
    return {
      connected: s.state === 'connected',
      qrcode:    s.qrcode,
      state:     s.state,
    };
  }

  return evolutionGetStatus(cfg);
}

// ─── Send (multi-provider) ────────────────────────────────────────────────────
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  return `55${digits}`;
}

export async function sendMessage(
  phone: string,
  text: string,
  trigger?: string,
  recipientId?: string,
  recipientName?: string,
): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getConfig();
  if (!cfg) return { ok: false, error: 'WhatsApp não configurado' };

  if (cfg.provider !== 'baileys' && !cfg.isActive) {
    return { ok: false, error: 'WhatsApp não configurado ou inativo' };
  }

  const number = formatPhone(phone);
  let result: { ok: boolean; error?: string };

  if (cfg.provider === 'baileys') {
    result = await sendBaileysMessage(number, text);
  } else {
    result = await evolutionSend(cfg, number, text);
  }

  await logMessage({ trigger, recipientId, recipientName, phone: number, message: text, status: result.ok ? 'sent' : 'failed', error: result.ok ? undefined : result.error });
  return result;
}

async function logMessage(entry: {
  trigger?: string; recipientId?: string; recipientName?: string;
  phone: string; message: string; status: string; error?: string;
}) {
  if (!hasSupabase) return;
  await supabase.from('whatsapp_message_log').insert({
    trigger:        entry.trigger ?? null,
    recipient_id:   entry.recipientId ?? null,
    recipient_name: entry.recipientName ?? null,
    phone:          entry.phone,
    message:        entry.message,
    status:         entry.status,
    error:          entry.error ?? null,
  });
}

// ─── Log ──────────────────────────────────────────────────────────────────────
export async function getLog(limit = 50) {
  if (!hasSupabase) return [];
  const { data } = await supabase
    .from('whatsapp_message_log')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(limit);
  return (data ?? []).map((d: any) => ({
    id:            d.id,
    trigger:       d.trigger,
    recipientName: d.recipient_name,
    phone:         d.phone,
    message:       d.message,
    status:        d.status,
    error:         d.error,
    sentAt:        d.sent_at,
  }));
}

// ─── Interpolate template ─────────────────────────────────────────────────────
export function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ─── Automação: aniversário ───────────────────────────────────────────────────
export async function sendBirthdayWhatsApp(user: { id: string; name: string; phone?: string | null }, couponCode?: string): Promise<void> {
  if (!hasSupabase || !user.phone) return;

  const { data: tmpl } = await supabase
    .from('whatsapp_templates')
    .select('message, is_active')
    .eq('trigger', 'aniversario')
    .maybeSingle();

  if (!tmpl?.is_active) return;

  const message = interpolate(tmpl.message, {
    nome:  user.name ?? '',
    cupom: couponCode ?? '',
  });
  await sendMessage(user.phone, message, 'aniversario', user.id, user.name ?? undefined);
}

// ─── Automação: retenção 30 e 60 dias ────────────────────────────────────────
export async function runRetencaoWhatsApp(): Promise<{ sent30: number; sent60: number; skipped: number }> {
  if (!hasSupabase) return { sent30: 0, sent60: 0, skipped: 0 };

  const { data: templates } = await supabase
    .from('whatsapp_templates')
    .select('trigger, message, is_active')
    .in('trigger', ['retencao_30', 'retencao_60', 'retencao_90']);

  const tmpl30 = (templates ?? []).find((t: any) => t.trigger === 'retencao_30');
  const tmpl60 = (templates ?? []).find((t: any) => t.trigger === 'retencao_60');
  const tmpl90 = (templates ?? []).find((t: any) => t.trigger === 'retencao_90');

  if (!tmpl30?.is_active && !tmpl60?.is_active && !tmpl90?.is_active) return { sent30: 0, sent60: 0, skipped: 0 };

  // Busca todos os agendamentos concluídos com dados do cliente
  const { data: appts } = await supabase
    .from('appointments')
    .select('user_id, appointment_date, client:users(id, name, phone)')
    .eq('status', 'concluido')
    .order('appointment_date', { ascending: false });

  if (!appts?.length) return { sent30: 0, sent60: 0, skipped: 0 };

  // Agrupa por usuário — pega apenas a última visita de cada um
  const byUser = new Map<string, { user: any; lastDate: string }>();
  for (const a of appts as any[]) {
    if (!byUser.has(a.user_id)) {
      byUser.set(a.user_id, { user: a.client, lastDate: a.appointment_date });
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  type Candidate = { userId: string; name: string; phone: string; dias: number };
  const candidates30: Candidate[] = [];
  const candidates60: Candidate[] = [];
  const candidates90: Candidate[] = [];

  for (const { user, lastDate } of byUser.values()) {
    if (!user?.phone) continue;
    const last = new Date(lastDate + 'T00:00:00');
    const daysAway = Math.floor((today.getTime() - last.getTime()) / 86_400_000);

    if (tmpl30?.is_active && daysAway >= 29 && daysAway <= 31) {
      candidates30.push({ userId: user.id, name: user.name ?? '', phone: user.phone, dias: daysAway });
    }
    if (tmpl60?.is_active && daysAway >= 59 && daysAway <= 61) {
      candidates60.push({ userId: user.id, name: user.name ?? '', phone: user.phone, dias: daysAway });
    }
    if (tmpl90?.is_active && daysAway >= 89 && daysAway <= 91) {
      candidates90.push({ userId: user.id, name: user.name ?? '', phone: user.phone, dias: daysAway });
    }
  }

  const allUserIds = [...candidates30, ...candidates60, ...candidates90].map((c) => c.userId);
  if (!allUserIds.length) return { sent30: 0, sent60: 0, skipped: 0 };

  // Anti-duplicata: não reenvia para o mesmo usuário nos últimos 20 dias
  const cutoff = new Date(today.getTime() - 20 * 86_400_000).toISOString();
  const { data: recentLogs } = await supabase
    .from('whatsapp_message_log')
    .select('trigger, recipient_id')
    .in('trigger', ['retencao_30', 'retencao_60', 'retencao_90'])
    .in('recipient_id', allUserIds)
    .gte('sent_at', cutoff);

  const alreadySent = new Set(
    (recentLogs ?? []).map((l: any) => `${l.trigger}:${l.recipient_id}`)
  );

  let sent30 = 0, sent60 = 0, skipped = 0;

  for (const c of candidates30) {
    if (alreadySent.has(`retencao_30:${c.userId}`)) { skipped++; continue; }
    const message = interpolate(tmpl30!.message, { nome: c.name, dias: String(c.dias) });
    const result = await sendMessage(c.phone, message, 'retencao_30', c.userId, c.name);
    if (result.ok) sent30++; else skipped++;
  }

  for (const c of candidates60) {
    if (alreadySent.has(`retencao_60:${c.userId}`)) { skipped++; continue; }
    const message = interpolate(tmpl60!.message, { nome: c.name, dias: String(c.dias) });
    const result = await sendMessage(c.phone, message, 'retencao_60', c.userId, c.name);
    if (result.ok) sent60++; else skipped++;
  }

  for (const c of candidates90) {
    if (alreadySent.has(`retencao_90:${c.userId}`)) { skipped++; continue; }
    const message = interpolate(tmpl90!.message, { nome: c.name, dias: String(c.dias) });
    const result = await sendMessage(c.phone, message, 'retencao_90', c.userId, c.name);
    if (result.ok) sent30++; else skipped++;
  }

  return { sent30, sent60, skipped };
}

// ─── Automação: retenção 15 dias (manutenção) ────────────────────────────────
export async function runRetencao15(): Promise<{ sent: number; skipped: number }> {
  if (!hasSupabase) return { sent: 0, skipped: 0 };

  const { data: tmpl } = await supabase
    .from('whatsapp_templates')
    .select('message, is_active')
    .eq('trigger', 'retencao_15')
    .maybeSingle();

  if (!tmpl?.is_active) return { sent: 0, skipped: 0 };

  // Busca todos os agendamentos concluídos com nome do serviço e dados do cliente
  const { data: appts } = await supabase
    .from('appointments')
    .select('user_id, appointment_date, service:services(name), client:users(id, name, phone)')
    .eq('status', 'concluido')
    .order('appointment_date', { ascending: false });

  if (!appts?.length) return { sent: 0, skipped: 0 };

  // Agrupa por usuário — mantém apenas o último agendamento de cada um
  const byUser = new Map<string, { user: any; lastDate: string; serviceName: string }>();
  for (const a of appts as any[]) {
    if (!byUser.has(a.user_id)) {
      byUser.set(a.user_id, {
        user:        a.client,
        lastDate:    a.appointment_date,
        serviceName: (a.service as any)?.name ?? '',
      });
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  type Candidate = { userId: string; name: string; phone: string; serviceName: string };
  const candidates: Candidate[] = [];

  for (const { user, lastDate, serviceName } of byUser.values()) {
    if (!user?.phone) continue;
    const last = new Date(lastDate + 'T00:00:00');
    const daysAgo = Math.floor((today.getTime() - last.getTime()) / 86_400_000);
    if (daysAgo >= 14 && daysAgo <= 16) {
      candidates.push({ userId: user.id, name: user.name ?? '', phone: user.phone, serviceName });
    }
  }

  if (!candidates.length) return { sent: 0, skipped: 0 };

  // Anti-duplicata: não reenvia nos últimos 10 dias
  const cutoff = new Date(today.getTime() - 10 * 86_400_000).toISOString();
  const { data: recentLogs } = await supabase
    .from('whatsapp_message_log')
    .select('recipient_id')
    .eq('trigger', 'retencao_15')
    .in('recipient_id', candidates.map((c) => c.userId))
    .gte('sent_at', cutoff);

  const alreadySent = new Set((recentLogs ?? []).map((l: any) => l.recipient_id));

  let sent = 0;
  let skipped = 0;

  for (const c of candidates) {
    if (alreadySent.has(c.userId)) { skipped++; continue; }
    const message = interpolate(tmpl.message, { nome: c.name, servico: c.serviceName });
    const result = await sendMessage(c.phone, message, 'retencao_15', c.userId, c.name);
    if (result.ok) sent++; else skipped++;
  }

  return { sent, skipped };
}

// ─── Automação: pós-atendimento (2h após concluído) ───────────────────────────
export async function runPosAtendimento(): Promise<{ sent: number; skipped: number }> {
  if (!hasSupabase) return { sent: 0, skipped: 0 };

  const { data: tmpl } = await supabase
    .from('whatsapp_templates')
    .select('message, is_active')
    .eq('trigger', 'pos_atendimento')
    .maybeSingle();

  if (!tmpl?.is_active) return { sent: 0, skipped: 0 };

  const now = new Date();
  const twoHoursAgo  = new Date(now.getTime() - 2  * 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id, user_id, updated_at,
      service:services(name),
      professional:professionals(name),
      client:users(name, phone)
    `)
    .eq('status', 'concluido')
    .lte('updated_at', twoHoursAgo)
    .gte('updated_at', twentyFourHoursAgo)
    .limit(200);

  if (!appointments?.length) return { sent: 0, skipped: 0 };

  const apptIds = appointments.map((a: any) => a.id);
  const { data: alreadySent } = await supabase
    .from('whatsapp_message_log')
    .select('recipient_id')
    .eq('trigger', 'pos_atendimento')
    .in('recipient_id', apptIds);

  const sentSet = new Set((alreadySent ?? []).map((r: any) => r.recipient_id));

  let sent = 0;
  let skipped = 0;

  for (const appt of appointments as any[]) {
    if (sentSet.has(appt.id)) { skipped++; continue; }

    const phone = (appt.client as any)?.phone;
    const name  = (appt.client as any)?.name ?? '';
    if (!phone) { skipped++; continue; }

    const message = interpolate(tmpl.message, {
      nome:         name,
      servico:      (appt.service as any)?.name ?? '',
      profissional: (appt.professional as any)?.name ?? '',
    });

    const result = await sendMessage(phone, message, 'pos_atendimento', appt.id, name);
    if (result.ok) sent++; else skipped++;
  }

  return { sent, skipped };
}

// ─── Automação: lembrete 24h antes ────────────────────────────────────────────
export async function runLembrete24h(): Promise<{ sent: number; skipped: number }> {
  if (!hasSupabase) return { sent: 0, skipped: 0 };

  const { data: tmpl } = await supabase
    .from('whatsapp_templates')
    .select('message, is_active')
    .eq('trigger', 'lembrete_24h')
    .maybeSingle();

  if (!tmpl?.is_active) return { sent: 0, skipped: 0 };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id, user_id, appointment_date, appointment_time,
      service:services(name),
      professional:professionals(name),
      client:users(name, phone)
    `)
    .eq('appointment_date', tomorrowStr)
    .in('status', ['confirmado', 'agendado', 'pendente_pagamento'])
    .limit(200);

  if (!appointments?.length) return { sent: 0, skipped: 0 };

  // Evita duplicatas: checa se já enviou lembrete para cada appointment.id
  const apptIds = appointments.map((a: any) => a.id);
  const { data: alreadySent } = await supabase
    .from('whatsapp_message_log')
    .select('recipient_id')
    .eq('trigger', 'lembrete_24h')
    .in('recipient_id', apptIds);

  const sentSet = new Set((alreadySent ?? []).map((r: any) => r.recipient_id));

  let sent = 0;
  let skipped = 0;

  for (const appt of appointments as any[]) {
    if (sentSet.has(appt.id)) { skipped++; continue; }

    const phone = (appt.client as any)?.phone;
    const name  = (appt.client as any)?.name ?? '';
    if (!phone) { skipped++; continue; }

    const [year, month, day] = (appt.appointment_date as string).split('-');
    const dateFormatted = `${day}/${month}/${year}`;

    const message = interpolate(tmpl.message, {
      nome:         name,
      data:         dateFormatted,
      hora:         appt.appointment_time,
      profissional: (appt.professional as any)?.name ?? '',
      servico:      (appt.service as any)?.name ?? '',
    });

    const result = await sendMessage(phone, message, 'lembrete_24h', appt.id, name);
    if (result.ok) sent++; else skipped++;
  }

  return { sent, skipped };
}

// ─── Automação: agendamento confirmado ────────────────────────────────────────
export async function sendAppointmentConfirmation(params: {
  userId: string;
  serviceId: string;
  professionalId: string;
  appointmentDate: string;
  appointmentTime: string;
}): Promise<void> {
  if (!hasSupabase) return;

  const { data: tmpl } = await supabase
    .from('whatsapp_templates')
    .select('message, is_active')
    .eq('trigger', 'agendamento_confirmado')
    .maybeSingle();

  if (!tmpl?.is_active) return;

  const [{ data: user }, { data: service }, { data: professional }] = await Promise.all([
    supabase.from('users').select('name, phone').eq('id', params.userId).maybeSingle(),
    supabase.from('services').select('name').eq('id', params.serviceId).maybeSingle(),
    supabase.from('professionals').select('name').eq('id', params.professionalId).maybeSingle(),
  ]);

  if (!user?.phone) return;

  const [year, month, day] = params.appointmentDate.split('-');
  const dateFormatted = `${day}/${month}/${year}`;

  const message = interpolate(tmpl.message, {
    nome:         user.name ?? '',
    data:         dateFormatted,
    hora:         params.appointmentTime,
    profissional: professional?.name ?? '',
    servico:      service?.name ?? '',
  });

  await sendMessage(user.phone, message, 'agendamento_confirmado', params.userId, user.name ?? undefined);
}
