'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays, Plus, Loader2, X, Clock, User, Scissors,
  ChevronLeft, ChevronRight, AlertCircle,
  Eye, RefreshCw, History, Copy, FileText, Check,
} from 'lucide-react';
import { appointmentsAdminApi, servicesApi, professionalsApi, customersApi } from '@/lib/api';
import { Appointment, Paginated, Service, Professional, Customer } from '@/types';
import { getErrorMessage, cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  aguardando_confirmacao: { label: 'Aguard. Confirmação', color: 'bg-purple-100 text-purple-700' },
  confirmado:             { label: 'Confirmado',          color: 'bg-green-100 text-green-700' },
  pendente_pagamento:     { label: 'Pend. Pagamento',     color: 'bg-amber-100 text-amber-700' },
  cancelado:              { label: 'Cancelado',            color: 'bg-red-100 text-red-700' },
  concluido:              { label: 'Concluído',            color: 'bg-blue-100 text-blue-700' },
  nao_compareceu:         { label: 'Não compareceu',       color: 'bg-gray-100 text-gray-600' },
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(date: string, time: string) {
  try {
    return new Date(`${date}T${time}`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' às ' + time;
  } catch { return `${date} ${time}`; }
}

interface NewApptForm {
  userId: string;
  serviceId: string;
  professionalId: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'aguardando_confirmacao' | 'confirmado' | 'pendente_pagamento';
  notes: string;
}

// ─── Slot Picker ──────────────────────────────────────────────────────────────

function SlotPicker({
  professionalId, serviceId, date,
  selected, onSelect,
}: {
  professionalId: string; serviceId: string; date: string;
  selected: string; onSelect: (time: string) => void;
}) {
  const { data: slots, isLoading, isError } = useQuery({
    queryKey: ['trinks-slots', professionalId, serviceId, date],
    queryFn: () => appointmentsAdminApi.availableSlots(professionalId, serviceId, date),
    enabled: !!(professionalId && serviceId && date),
    staleTime: 60_000,
  });

  if (!professionalId || !serviceId || !date) {
    return (
      <p className="text-xs text-gray-400 italic">Selecione profissional, serviço e data para ver os horários.</p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin text-[#C9A4A0]" />
        Buscando horários disponíveis…
      </div>
    );
  }

  if (isError || !slots?.length) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        Nenhum horário disponível para esta data.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {slots.map((slot) => (
        <button
          key={slot.time}
          type="button"
          disabled={!slot.available}
          onClick={() => slot.available && onSelect(slot.time)}
          className={cn(
            'h-9 rounded-lg text-sm font-medium transition-all',
            !slot.available
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed line-through'
              : selected === slot.time
              ? 'bg-[#C9A4A0] text-white shadow-sm'
              : 'border border-gray-200 text-gray-700 hover:border-[#C9A4A0] hover:text-[#C9A4A0]'
          )}
        >
          {slot.time}
        </button>
      ))}
    </div>
  );
}

// ─── New Appointment Modal ────────────────────────────────────────────────────

function NewAppointmentModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<NewApptForm>({
    userId: '', serviceId: '', professionalId: '',
    appointmentDate: today(), appointmentTime: '',
    status: 'aguardando_confirmacao', notes: '',
  });
  const [error, setError] = useState<string | null>(null);

  const { data: customersPage } = useQuery<Paginated<Customer>>({
    queryKey: ['admin-customers-modal'],
    queryFn: () => customersApi.list({ limit: 200 }),
  });
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['admin-services'],
    queryFn: servicesApi.list,
  });
  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ['admin-professionals'],
    queryFn: professionalsApi.list,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const svc = services.find((s) => s.id === form.serviceId);
      return appointmentsAdminApi.create({
        userId: form.userId,
        serviceId: form.serviceId,
        professionalId: form.professionalId,
        appointmentDate: form.appointmentDate,
        appointmentTime: form.appointmentTime,
        status: form.status,
        servicePrice: svc?.price,
        notes: form.notes || undefined,
      });
    },
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  function set<K extends keyof NewApptForm>(field: K, value: NewApptForm[K]) {
    setForm((p) => {
      const next = { ...p, [field]: value };
      if (['serviceId', 'professionalId', 'appointmentDate'].includes(field as string)) {
        next.appointmentTime = '';
      }
      return next;
    });
    setError(null);
  }

  const customers = customersPage?.items ?? [];
  const activeServices = services.filter((s) => s.isActive);
  const activeProfessionals = professionals.filter((p) => p.isActive);
  const isValid = form.userId && form.serviceId && form.professionalId && form.appointmentDate && form.appointmentTime;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[92vh] flex flex-col">
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

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Cliente *</label>
            <select
              value={form.userId}
              onChange={(e) => set('userId', e.target.value)}
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] bg-white"
            >
              <option value="">Selecione a cliente…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.email}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Serviço *</label>
            <select
              value={form.serviceId}
              onChange={(e) => set('serviceId', e.target.value)}
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] bg-white"
            >
              <option value="">Selecione o serviço…</option>
              {activeServices.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — R$ {s.price.toFixed(2)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Profissional *</label>
            <select
              value={form.professionalId}
              onChange={(e) => set('professionalId', e.target.value)}
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] bg-white"
            >
              <option value="">Selecione a profissional…</option>
              {activeProfessionals.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Data *</label>
            <input
              type="date"
              value={form.appointmentDate}
              min={today()}
              onChange={(e) => set('appointmentDate', e.target.value)}
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">
              Horário * {form.appointmentTime && <span className="text-[#C9A4A0] font-semibold">{form.appointmentTime} selecionado</span>}
            </label>
            <SlotPicker
              professionalId={form.professionalId}
              serviceId={form.serviceId}
              date={form.appointmentDate}
              selected={form.appointmentTime}
              onSelect={(t) => setForm((p) => ({ ...p, appointmentTime: t }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as 'confirmado' | 'pendente_pagamento')}
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] bg-white"
            >
              <option value="aguardando_confirmacao">Aguardando Confirmação</option>
              <option value="confirmado">Confirmado</option>
              <option value="pendente_pagamento">Pendente de pagamento</option>
            </select>
          </div>

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

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const date = (appt as any).appointmentDate ?? (appt as any).appointment_date ?? '';
  const time = (appt as any).appointmentTime ?? (appt as any).appointment_time ?? '';
  const price = (appt as any).servicePrice ?? (appt as any).service_price ?? 0;
  const status = STATUS_LABELS[appt.status] ?? { label: appt.status, color: 'bg-gray-100 text-gray-600' };
  const serviceName = (appt as any).service?.name ?? (appt as any).services?.name ?? '—';
  const professionalName = (appt as any).professional?.name ?? (appt as any).professionals?.name ?? '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Detalhes do Agendamento</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Cliente</p>
              <p className="text-sm font-medium text-gray-800">{appt.user?.name ?? '—'}</p>
              <p className="text-xs text-gray-500">{(appt.user as any)?.email ?? ''}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Status</p>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Serviço</p>
              <p className="text-sm font-medium text-gray-800">{serviceName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Profissional</p>
              <p className="text-sm font-medium text-gray-800">{professionalName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Data / Hora</p>
              <p className="text-sm font-medium text-gray-800">{formatDateTime(date, time)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Valor</p>
              <p className="text-sm font-medium text-gray-800">{price > 0 ? `R$ ${Number(price).toFixed(2)}` : '—'}</p>
            </div>
          </div>
          {(appt as any).notes && (
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Observações</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{(appt as any).notes}</p>
            </div>
          )}
        </div>
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full h-9 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── History Modal ────────────────────────────────────────────────────────────

function HistoryModal({ appt, onClose }: { appt: Appointment; onClose: () => void }) {
  const userId = appt.userId ?? (appt as any).user_id ?? (appt.user as any)?.id ?? '';
  const { data, isLoading } = useQuery({
    queryKey: ['appt-history', userId],
    queryFn: () => appointmentsAdminApi.listByUser(userId),
    enabled: !!userId,
  });
  const items: Appointment[] = data?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Histórico de Agendamentos</h3>
            <p className="text-xs text-gray-500">{appt.user?.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#C9A4A0]" /></div>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhum agendamento encontrado.</p>
          ) : (
            <div className="space-y-2">
              {items.map((a) => {
                const d = (a as any).appointmentDate ?? (a as any).appointment_date ?? '';
                const t = (a as any).appointmentTime ?? (a as any).appointment_time ?? '';
                const s = STATUS_LABELS[a.status] ?? { label: a.status, color: 'bg-gray-100 text-gray-600' };
                return (
                  <div key={a.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{formatDateTime(d, t)}</p>
                      <p className="text-xs text-gray-500">{(a as any).service?.name ?? (a as any).services?.name ?? '—'}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-6 pb-5 border-t border-gray-100 pt-4">
          <button onClick={onClose} className="w-full h-9 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  appointment: Appointment;
}

function ContextMenu({
  menu, onClose, onView, onChangeStatus, onHistory, onCopy,
}: {
  menu: ContextMenuState;
  onClose: () => void;
  onView: (a: Appointment) => void;
  onChangeStatus: (id: string, status: string) => void;
  onHistory: (a: Appointment) => void;
  onCopy: (a: Appointment) => void;
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position so menu never clips outside viewport
  const menuWidth = 210;
  const menuHeight = 280;
  const x = menu.x + menuWidth > window.innerWidth ? menu.x - menuWidth : menu.x;
  const y = menu.y + menuHeight > window.innerHeight ? menu.y - menuHeight : menu.y;

  const currentStatus = menu.appointment.status;

  const statusOptions = Object.entries(STATUS_LABELS).filter(([k]) => k !== currentStatus);

  return (
    <div
      ref={ref}
      style={{ top: y, left: x, position: 'fixed', zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[210px] text-sm select-none"
    >
      {/* Visualizar */}
      <button
        className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 text-gray-700"
        onClick={() => { onView(menu.appointment); onClose(); }}
      >
        <Eye className="w-4 h-4 text-gray-400" />
        Visualizar
      </button>

      {/* Alterar Status */}
      <div className="relative">
        <button
          className="w-full flex items-center justify-between gap-2.5 px-4 py-2 hover:bg-gray-50 text-gray-700"
          onClick={() => setStatusOpen((v) => !v)}
        >
          <span className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-gray-400" />
            Alterar Status
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        </button>
        {statusOpen && (
          <div className="absolute left-full top-0 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[180px]">
            {statusOptions.map(([key, val]) => (
              <button
                key={key}
                className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 text-gray-700"
                onClick={() => { onChangeStatus(menu.appointment.id, key); onClose(); }}
              >
                <span className={`w-2 h-2 rounded-full ${val.color.split(' ')[0]}`} />
                {val.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 my-1" />

      {/* Histórico */}
      <button
        className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 text-gray-700"
        onClick={() => { onHistory(menu.appointment); onClose(); }}
      >
        <History className="w-4 h-4 text-gray-400" />
        Histórico do Cliente
      </button>

      {/* Copiar */}
      <button
        className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 text-gray-700"
        onClick={() => { onCopy(menu.appointment); onClose(); }}
      >
        <Copy className="w-4 h-4 text-gray-400" />
        Copiar informações
      </button>

      <div className="border-t border-gray-100 my-1" />

      {/* Ver Faturamento */}
      <button
        className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 text-gray-700"
        onClick={() => {
          const date = (menu.appointment as any).appointmentDate ?? (menu.appointment as any).appointment_date ?? '';
          const month = date.slice(0, 7);
          window.open(`/faturamento?from=${month}-01&to=${month}-31`, '_blank');
          onClose();
        }}
      >
        <FileText className="w-4 h-4 text-gray-400" />
        Ver Faturamento do Mês
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [historyAppt, setHistoryAppt] = useState<Appointment | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<Paginated<Appointment>>({
    queryKey: ['admin-appointments', dateFilter, statusFilter, page],
    queryFn: () => appointmentsAdminApi.list({
      date: dateFilter || undefined,
      status: statusFilter || undefined,
      page,
      limit: 20,
    }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      appointmentsAdminApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-appointments'] }),
  });

  const handleContextMenu = useCallback((e: React.MouseEvent, appt: Appointment) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, appointment: appt });
  }, []);

  const handleCopy = useCallback((appt: Appointment) => {
    const date = (appt as any).appointmentDate ?? (appt as any).appointment_date ?? '';
    const time = (appt as any).appointmentTime ?? (appt as any).appointment_time ?? '';
    const price = (appt as any).servicePrice ?? (appt as any).service_price ?? 0;
    const svcName = (appt as any).service?.name ?? (appt as any).services?.name ?? '—';
    const text = [
      `Cliente: ${appt.user?.name ?? '—'}`,
      `Serviço: ${svcName}`,
      `Data: ${formatDateTime(date, time)}`,
      `Valor: ${price > 0 ? `R$ ${Number(price).toFixed(2)}` : '—'}`,
      `Status: ${STATUS_LABELS[appt.status]?.label ?? appt.status}`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

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
      {detailAppt && <DetailModal appt={detailAppt} onClose={() => setDetailAppt(null)} />}
      {historyAppt && <HistoryModal appt={historyAppt} onClose={() => setHistoryAppt(null)} />}
      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onView={setDetailAppt}
          onChangeStatus={(id, status) => statusMutation.mutate({ id, status })}
          onHistory={setHistoryAppt}
          onCopy={handleCopy}
        />
      )}

      {/* Toast de cópia */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          <Check className="w-4 h-4 text-green-400" />
          Informações copiadas!
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Agendamentos ({total})</h2>
          <p className="text-sm text-gray-500">Clique com o botão direito em um agendamento para ver as opções.</p>
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
                  <tr
                    key={a.id}
                    className="hover:bg-[#fdf8f7] cursor-context-menu select-none"
                    onContextMenu={(e) => handleContextMenu(e, a)}
                  >
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
