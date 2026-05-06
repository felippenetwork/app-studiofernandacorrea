'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Plus, Loader2, X, Clock, User, Scissors, ChevronLeft, ChevronRight } from 'lucide-react';
import { appointmentsAdminApi, servicesApi, professionalsApi, customersApi } from '@/lib/api';
import { Appointment, Paginated, Service, Professional, Customer } from '@/types';
import { getErrorMessage } from '@/lib/utils';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmado:          { label: 'Confirmado',        color: 'bg-green-100 text-green-700' },
  pendente_pagamento:  { label: 'Pend. Pagamento',   color: 'bg-amber-100 text-amber-700' },
  cancelado:           { label: 'Cancelado',          color: 'bg-red-100 text-red-700' },
  concluido:           { label: 'Concluído',          color: 'bg-blue-100 text-blue-700' },
  nao_compareceu:      { label: 'Não compareceu',     color: 'bg-gray-100 text-gray-600' },
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

interface NewAppointmentForm {
  userId: string;
  serviceId: string;
  professionalId: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'confirmado' | 'pendente_pagamento';
  notes: string;
}

function NewAppointmentModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState<NewAppointmentForm>({
    userId: '', serviceId: '', professionalId: '',
    appointmentDate: today(), appointmentTime: '09:00',
    status: 'confirmado', notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  const { data: customers = [] } = useQuery<Paginated<Customer>>({
    queryKey: ['admin-customers-modal'],
    queryFn: () => customersApi.list({ limit: 200 }),
    select: (d) => d,
  });
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['admin-services'],
    queryFn: servicesApi.list,
  });
  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ['admin-professionals'],
    queryFn: professionalsApi.list,
  });

  const selectedService = services.find((s) => s.id === form.serviceId);

  const mutation = useMutation({
    mutationFn: () => appointmentsAdminApi.create({
      userId: form.userId,
      serviceId: form.serviceId,
      professionalId: form.professionalId,
      appointmentDate: form.appointmentDate,
      appointmentTime: form.appointmentTime,
      status: form.status,
      servicePrice: selectedService?.price,
      notes: form.notes || undefined,
    }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  function set<K extends keyof NewAppointmentForm>(field: K, value: NewAppointmentForm[K]) {
    setForm((p) => ({ ...p, [field]: value }));
    setError(null);
  }

  const customerList = (customers as any)?.items ?? [];
  const isValid = form.userId && form.serviceId && form.professionalId && form.appointmentDate && form.appointmentTime;

  const timeSlots = Array.from({ length: 22 }, (_, i) => {
    const h = Math.floor(i / 2) + 8;
    const m = i % 2 === 0 ? '00' : '30';
    return `${String(h).padStart(2, '0')}:${m}`;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Novo Agendamento</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>
          )}

          {/* Cliente */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Cliente *</label>
            <select
              value={form.userId}
              onChange={(e) => set('userId', e.target.value)}
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] bg-white"
            >
              <option value="">Selecione a cliente…</option>
              {customerList.map((c: Customer) => (
                <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
              ))}
            </select>
          </div>

          {/* Serviço */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Serviço *</label>
            <select
              value={form.serviceId}
              onChange={(e) => set('serviceId', e.target.value)}
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] bg-white"
            >
              <option value="">Selecione o serviço…</option>
              {services.filter((s) => s.isActive).map((s) => (
                <option key={s.id} value={s.id}>{s.name} — R$ {s.price.toFixed(2)}</option>
              ))}
            </select>
          </div>

          {/* Profissional */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Profissional *</label>
            <select
              value={form.professionalId}
              onChange={(e) => set('professionalId', e.target.value)}
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] bg-white"
            >
              <option value="">Selecione a profissional…</option>
              {professionals.filter((p) => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Data e Horário */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Data *</label>
              <input
                type="date"
                value={form.appointmentDate}
                onChange={(e) => set('appointmentDate', e.target.value)}
                min={today()}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Horário *</label>
              <select
                value={form.appointmentTime}
                onChange={(e) => set('appointmentTime', e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] bg-white"
              >
                {timeSlots.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as 'confirmado' | 'pendente_pagamento')}
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] bg-white"
            >
              <option value="confirmado">Confirmado</option>
              <option value="pendente_pagamento">Pendente de pagamento</option>
            </select>
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Informações adicionais…"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 h-9 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !isValid}
            className="flex-1 h-9 bg-[#C9A4A0] hover:bg-[#b8918d] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Criar Agendamento
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDateTime(date: string, time: string) {
  try {
    const d = new Date(`${date}T${time}`);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' às ' + time;
  } catch {
    return `${date} ${time}`;
  }
}

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading } = useQuery<Paginated<Appointment>>({
    queryKey: ['admin-appointments', dateFilter, statusFilter, page],
    queryFn: () => appointmentsAdminApi.list({
      date: dateFilter || undefined,
      status: statusFilter || undefined,
      page,
      limit: 20,
    }),
  });

  const appointments = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      {showNew && (
        <NewAppointmentModal
          onClose={() => setShowNew(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-appointments'] })}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Agendamentos ({total})</h2>
          <p className="text-sm text-gray-500">Visualize e gerencie todos os agendamentos.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 h-9 px-4 bg-[#C9A4A0] hover:bg-[#b8918d] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Agendamento
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 h-9 px-3 border border-gray-200 rounded-lg bg-white">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
            className="text-sm text-gray-700 focus:outline-none bg-transparent"
          />
          {dateFilter && (
            <button onClick={() => setDateFilter('')} className="text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 px-3 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none bg-white"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0] mx-auto" /></div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum agendamento encontrado.</p>
            <button onClick={() => setShowNew(true)} className="mt-3 text-sm text-[#C9A4A0] hover:underline">
              Criar o primeiro agendamento
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data / Hora</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Serviço</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {appointments.map((a) => {
                const date = a.appointmentDate ?? (a as any).appointment_date ?? '';
                const time = a.appointmentTime ?? (a as any).appointment_time ?? '';
                const price = a.servicePrice ?? (a as any).service_price ?? 0;
                const status = STATUS_LABELS[a.status] ?? { label: a.status, color: 'bg-gray-100 text-gray-600' };

                return (
                  <tr key={a.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="font-medium">{formatDateTime(date, time)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">{a.user?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Scissors className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="text-gray-700">{(a as any).service?.name ?? (a as any).services?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-700 font-medium">
                      {price > 0 ? `R$ ${Number(price).toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/60">
            <p className="text-xs text-gray-500">{total} agendamentos</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 w-7 flex items-center justify-center border border-gray-200 rounded text-xs disabled:opacity-40 hover:bg-gray-100">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="h-7 px-3 flex items-center text-xs text-gray-600">{page}/{totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-7 w-7 flex items-center justify-center border border-gray-200 rounded text-xs disabled:opacity-40 hover:bg-gray-100">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
