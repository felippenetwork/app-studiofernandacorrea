'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, X, Loader2,
  Trash2, Plus, Settings, Search,
  Eye, RefreshCw, History, Copy, FileText, Check,
} from 'lucide-react';
import {
  schedulesApi, professionalsApi, servicesApi,
  appointmentsAdminApi, appointmentStatusApi, customersApi,
} from '@/lib/api';
import { Professional, ProfessionalSchedule, ScheduleBlock, Service } from '@/types';
import { cn, getErrorMessage } from '@/lib/utils';

// ─── Constants ─────────────────────────────────────────────────────────────────
const START_HOUR  = 8;
const END_HOUR    = 22;
const HOUR_HEIGHT = 64;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const TOTAL_H = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

const DAY_NAMES_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const STATUS: Record<string, { label: string; bg: string; border: string; text: string; badge: string; dot: string; block: string }> = {
  aguardando_confirmacao: { label: 'Aguard. Confirmação', bg: 'bg-purple-50',  border: 'border-l-purple-400', text: 'text-purple-900', badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-400',  block: 'bg-violet-400 border-violet-500' },
  confirmado:             { label: 'Confirmado',          bg: 'bg-emerald-50', border: 'border-l-emerald-500', text: 'text-emerald-900', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', block: 'bg-sky-400 border-sky-500' },
  pendente_pagamento:     { label: 'Pend. Pagamento',     bg: 'bg-amber-50',   border: 'border-l-amber-400',   text: 'text-amber-900',   badge: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-400',   block: 'bg-amber-400 border-amber-500' },
  cancelado:              { label: 'Cancelado',            bg: 'bg-red-50',     border: 'border-l-red-400',     text: 'text-red-900',     badge: 'bg-red-100 text-red-700',        dot: 'bg-red-400',     block: 'bg-red-400 border-red-500' },
  concluido:              { label: 'Concluído',            bg: 'bg-sky-50',     border: 'border-l-sky-400',     text: 'text-sky-900',     badge: 'bg-sky-100 text-sky-700',        dot: 'bg-sky-400',     block: 'bg-blue-500 border-blue-600' },
  nao_compareceu:         { label: 'Não compareceu',       bg: 'bg-gray-100',   border: 'border-l-gray-400',    text: 'text-gray-500',    badge: 'bg-gray-100 text-gray-600',      dot: 'bg-gray-400',    block: 'bg-slate-400 border-slate-500' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10); }
function addDays(d: string, n: number): string {
  const dt = new Date(d + 'T12:00:00');
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}
function formatDateHeader(d: string) {
  const date = new Date(d + 'T12:00:00');
  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
  const rest = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  return { weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1), rest };
}
function timeToMin(time: string): number {
  const [h, m] = String(time).slice(0, 5).split(':').map(Number);
  return h * 60 + m;
}
function minToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}
function topPx(time: string): number {
  return Math.max(0, ((timeToMin(time) - START_HOUR * 60) / 60) * HOUR_HEIGHT);
}
function heightPx(dur: number): number {
  return Math.max(28, (dur / 60) * HOUR_HEIGHT);
}
function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ─── Schedule Config Modal ─────────────────────────────────────────────────────
function ScheduleConfigModal({ professional, onClose }: { professional: Professional; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: schedule = [], isLoading } = useQuery<ProfessionalSchedule[]>({
    queryKey: ['schedule', professional.id],
    queryFn: () => schedulesApi.getByProfessional(professional.id),
  });
  const saveMutation = useMutation({
    mutationFn: ({ day, data }: { day: number; data: { startTime: string; endTime: string; isActive: boolean } }) =>
      schedulesApi.setDay(professional.id, day, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedule', professional.id] }),
  });
  const getDay = (dow: number) => schedule.find((s) => s.day_of_week === dow);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">Horários — {professional.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">Configure os dias e horários de trabalho</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6 space-y-3">
          {isLoading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0]" /></div>}
          {DAY_NAMES_FULL.map((name, dow) => {
            const day = getDay(dow);
            const isActive = day?.is_active ?? false;
            const startTime = day?.start_time?.slice(0, 5) ?? '09:00';
            const endTime   = day?.end_time?.slice(0, 5)   ?? '18:00';
            return (
              <div key={dow} className={cn(
                'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                isActive ? 'border-[#C9A4A0]/40 bg-[#C9A4A0]/5' : 'border-gray-100 bg-gray-50',
              )}>
                <button type="button"
                  onClick={() => saveMutation.mutate({ day: dow, data: { startTime, endTime, isActive: !isActive } })}
                  className={cn('w-10 h-5 rounded-full relative transition-colors flex-shrink-0', isActive ? 'bg-[#C9A4A0]' : 'bg-gray-300')}>
                  <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform', isActive ? 'translate-x-5' : 'translate-x-0.5')} />
                </button>
                <span className={cn('w-20 text-sm font-medium', isActive ? 'text-gray-800' : 'text-gray-400')}>{name}</span>
                {isActive ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input type="time" defaultValue={startTime}
                      onBlur={(e) => saveMutation.mutate({ day: dow, data: { startTime: e.target.value, endTime, isActive } })}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 w-24" />
                    <span className="text-gray-400 text-xs">até</span>
                    <input type="time" defaultValue={endTime}
                      onBlur={(e) => saveMutation.mutate({ day: dow, data: { startTime, endTime: e.target.value, isActive } })}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1 text-gray-700 w-24" />
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">Folga</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Block Modal ───────────────────────────────────────────────────────────────
function BlockModal({ professional, date, onClose }: { professional: Professional; date: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [fullDay, setFullDay] = useState(true);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: () => schedulesApi.createBlock(professional.id, {
      blockDate: date,
      startTime: fullDay ? undefined : startTime,
      endTime:   fullDay ? undefined : endTime,
      reason:    reason || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blocks'] }); onClose(); },
  });

  const { weekday, rest } = formatDateHeader(date);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Adicionar Bloqueio</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-sm text-gray-600 space-y-0.5">
            <p>Profissional: <span className="font-medium text-gray-900">{professional.name}</span></p>
            <p>Data: <span className="font-medium text-gray-900">{weekday}, {rest}</span></p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={fullDay} onChange={(e) => setFullDay(e.target.checked)} className="w-4 h-4 accent-[#C9A4A0]" />
            <span className="text-sm text-gray-700">Bloquear dia inteiro</span>
          </label>
          {!fullDay && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Início</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Fim</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
              </div>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Motivo (opcional)</label>
            <input type="text" placeholder="Ex: Folga, Férias, Consulta…" value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
            <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
              className="flex-1 py-2 text-sm font-medium bg-[#C9A4A0] text-white rounded-xl hover:bg-[#b8918d] disabled:opacity-50">
              {mutation.isPending ? 'Salvando…' : 'Bloquear'}
            </button>
          </div>
          {mutation.isError && <p className="text-xs text-red-600 text-center">{getErrorMessage(mutation.error)}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Appointment Detail Modal ──────────────────────────────────────────────────
function AppointmentDetailModal({
  appt, service, professional, onClose,
}: { appt: any; service?: Service; professional?: Professional; onClose: () => void }) {
  const qc = useQueryClient();
  const s = STATUS[appt.status] ?? STATUS.confirmado;

  const startTime = String(appt.appointment_time ?? '').slice(0, 5);
  const durationMin = service?.durationMinutes ?? 60;
  const endTime = minToTime(timeToMin(startTime) + durationMin);

  const statusMutation = useMutation({
    mutationFn: (status: string) => appointmentStatusApi.updateStatus(appt.id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agenda-appointments'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">{appt.user?.name ?? 'Cliente'}</h2>
            <p className="text-sm text-gray-500">{startTime} – {endTime}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Serviço</p>
              <p className="font-medium text-gray-900">{service?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Profissional</p>
              <p className="font-medium text-gray-900">{professional?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Valor</p>
              <p className="font-medium text-gray-900">R$ {Number(appt.service_price ?? 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-0.5">Status</p>
              <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium', s.badge)}>{s.label}</span>
            </div>
          </div>
          {appt.notes && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-100">{appt.notes}</p>
          )}
          <div className="border-t pt-4">
            <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Atualizar status</p>
            <div className="grid grid-cols-2 gap-2">
              {(['aguardando_confirmacao', 'confirmado', 'concluido', 'cancelado', 'nao_compareceu'] as const).map((st) => {
                const isActive = appt.status === st;
                return (
                  <button key={st} disabled={isActive || statusMutation.isPending}
                    onClick={() => statusMutation.mutate(st)}
                    className={cn(
                      'py-2 rounded-xl text-xs font-medium transition-colors border',
                      isActive
                        ? cn('border-transparent', STATUS[st].badge)
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40',
                    )}>
                    {STATUS[st].label}
                  </button>
                );
              })}
            </div>
            {statusMutation.isError && (
              <p className="text-xs text-red-500 mt-2 text-center">{getErrorMessage(statusMutation.error)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Agenda Context Menu ───────────────────────────────────────────────────────
interface AgendaCtxMenu { x: number; y: number; appt: any; service?: Service; professional?: Professional }

function AgendaContextMenu({
  menu, onClose, onView, onChangeStatus, onHistory, onCopy,
}: {
  menu: AgendaCtxMenu;
  onClose: () => void;
  onView: (a: any, s?: Service, p?: Professional) => void;
  onChangeStatus: (id: string, status: string) => void;
  onHistory: (appt: any) => void;
  onCopy: (appt: any, service?: Service) => void;
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handle); document.removeEventListener('keydown', handleKey); };
  }, [onClose]);

  const menuWidth = 210;
  const menuHeight = 280;
  const x = menu.x + menuWidth > window.innerWidth ? menu.x - menuWidth : menu.x;
  const y = menu.y + menuHeight > window.innerHeight ? menu.y - menuHeight : menu.y;

  const statusOptions = Object.entries(STATUS).filter(([k]) => k !== menu.appt.status);

  return (
    <div ref={ref} style={{ top: y, left: x, position: 'fixed', zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[210px] text-sm select-none">

      <button className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 text-gray-700"
        onClick={() => { onView(menu.appt, menu.service, menu.professional); onClose(); }}>
        <Eye className="w-4 h-4 text-gray-400" /> Visualizar
      </button>

      <div className="relative">
        <button className="w-full flex items-center justify-between gap-2.5 px-4 py-2 hover:bg-gray-50 text-gray-700"
          onClick={() => setStatusOpen((v) => !v)}>
          <span className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 text-gray-400" /> Alterar Status
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        </button>
        {statusOpen && (
          <div className="absolute left-full top-0 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[180px]">
            {statusOptions.map(([key, val]) => (
              <button key={key} className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 text-gray-700"
                onClick={() => { onChangeStatus(menu.appt.id, key); onClose(); }}>
                <span className={`w-2 h-2 rounded-full ${val.dot}`} />
                {val.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 my-1" />

      <button className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 text-gray-700"
        onClick={() => { onHistory(menu.appt); onClose(); }}>
        <History className="w-4 h-4 text-gray-400" /> Histórico do Cliente
      </button>

      <button className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 text-gray-700"
        onClick={() => { onCopy(menu.appt, menu.service); onClose(); }}>
        <Copy className="w-4 h-4 text-gray-400" /> Copiar informações
      </button>

      <div className="border-t border-gray-100 my-1" />

      <button className="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-gray-50 text-gray-700"
        onClick={() => {
          const date = String(menu.appt.appointment_date ?? '').slice(0, 7);
          window.open(`/faturamento?from=${date}-01&to=${date}-31`, '_blank');
          onClose();
        }}>
        <FileText className="w-4 h-4 text-gray-400" /> Ver Faturamento do Mês
      </button>
    </div>
  );
}

// ─── History Modal (Agenda) ────────────────────────────────────────────────────
function AgendaHistoryModal({ appt, onClose }: { appt: any; onClose: () => void }) {
  const userId = appt.user_id ?? appt.userId ?? '';
  const { data, isLoading } = useQuery({
    queryKey: ['agenda-history', userId],
    queryFn: () => appointmentsAdminApi.listByUser(userId),
    enabled: !!userId,
  });
  const items: any[] = (data as any)?.items ?? [];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">Histórico de Agendamentos</h2>
            <p className="text-xs text-gray-500">{appt.user?.name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-[#C9A4A0]" /></div>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Nenhum agendamento encontrado.</p>
          ) : (
            <div className="space-y-2">
              {items.map((a: any) => {
                const s = STATUS[a.status] ?? STATUS.confirmado;
                return (
                  <div key={a.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {String(a.appointment_date ?? '').slice(0, 10)} às {String(a.appointment_time ?? '').slice(0, 5)}
                      </p>
                      <p className="text-xs text-gray-500">{a.service?.name ?? '—'}</p>
                    </div>
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', s.badge)}>
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
          <button onClick={onClose} className="w-full py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Appointment Block (time-grid positioned) ──────────────────────────────────
function AppointmentBlock({ appt, service, onClick, onContextMenu }: {
  appt: any; service?: Service; onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const startTime = String(appt.appointment_time ?? '').slice(0, 5);
  const durationMin = service?.durationMinutes ?? 60;
  const endTime = minToTime(timeToMin(startTime) + durationMin);
  const s = STATUS[appt.status] ?? STATUS.confirmado;
  const top = topPx(startTime);
  const height = heightPx(durationMin);
  const isShort = height < 48;

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={`${appt.user?.name} — ${startTime}`}
      className={cn(
        'absolute left-0 right-0 rounded-md border text-left overflow-hidden',
        'hover:brightness-90 active:brightness-75 transition-all shadow-md cursor-context-menu',
        s.block,
      )}
      style={{ top, height, zIndex: 10 }}
    >
      {/* Status icon bubble */}
      <div className="absolute top-1 left-1.5 w-4 h-4 rounded-full bg-white/25 ring-1 ring-white/40 flex items-center justify-center flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-white" />
      </div>

      <div className="pl-7 pr-2 py-1 h-full flex flex-col justify-center">
        <p className={cn('font-semibold leading-tight truncate text-white', isShort ? 'text-[10px]' : 'text-xs')}>
          {appt.user?.name ?? 'Cliente'}
        </p>
        {!isShort && (
          <>
            <p className="text-[10px] text-white/80 leading-tight">{startTime} – {endTime}</p>
            {height >= 72 && (
              <p className="text-[10px] text-white/70 truncate leading-tight">{service?.name}</p>
            )}
          </>
        )}
        {isShort && (
          <p className="text-[10px] text-white/80 truncate">{startTime} · {service?.name}</p>
        )}
      </div>
    </button>
  );
}

// ─── New Appointment Modal ────────────────────────────────────────────────────
function NewAppointmentModal({
  defaultDate,
  professionals,
  services,
  onClose,
}: {
  defaultDate: string;
  professionals: Professional[];
  services: Service[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [clientSearch,    setClientSearch]    = useState('');
  const [selectedClient,  setSelectedClient]  = useState<any | null>(null);
  const [showClientDrop,  setShowClientDrop]  = useState(false);
  const [professionalId,  setProfessionalId]  = useState('');
  const [serviceId,       setServiceId]       = useState('');
  const [date,            setDate]            = useState(defaultDate);
  const [time,            setTime]            = useState('');
  const [variationId,     setVariationId]     = useState('');
  const [priceOverride,   setPriceOverride]   = useState('');
  const [durOverride,     setDurOverride]     = useState('');
  const [notes,           setNotes]           = useState('');
  const [status,          setStatus]          = useState<'aguardando_confirmacao' | 'confirmado' | 'pendente_pagamento'>('aguardando_confirmacao');

  // Customer search
  const { data: customerResults = [] } = useQuery({
    queryKey: ['customer-search', clientSearch],
    queryFn: () => customersApi.list({ search: clientSearch, limit: 8 }),
    enabled: clientSearch.length >= 2 && !selectedClient,
    staleTime: 10_000,
  });
  const customers: any[] = Array.isArray(customerResults)
    ? customerResults
    : (customerResults as any)?.items ?? [];

  // Derived — no useEffect needed
  const selectedSvc       = services.find((s) => s.id === serviceId) ?? null;
  const hasVariations     = (selectedSvc?.variations?.length ?? 0) > 0;
  const selectedVariation = selectedSvc?.variations?.find((v) => v.id === variationId) ?? null;

  const autoPrice = selectedVariation
    ? String(selectedVariation.price ?? 0)
    : (!hasVariations && selectedSvc)
      ? String(selectedSvc.price ?? 0)
      : '';

  const autoDur = selectedVariation
    ? String(selectedVariation.durationMinutes ?? selectedSvc?.durationMinutes ?? 60)
    : (!hasVariations && selectedSvc)
      ? String(selectedSvc.durationMinutes ?? (selectedSvc as any).duration_minutes ?? 60)
      : '';

  const displayPrice = priceOverride !== '' ? priceOverride : autoPrice;
  const displayDur   = durOverride   !== '' ? durOverride   : autoDur;

  function handleServiceChange(id: string) {
    setServiceId(id);
    setVariationId('');
    setPriceOverride('');
    setDurOverride('');
  }

  const createMutation = useMutation({
    mutationFn: () => appointmentsAdminApi.create({
      userId:          selectedClient!.id,
      serviceId,
      professionalId,
      appointmentDate: date,
      appointmentTime: time,
      status,
      servicePrice:    parseFloat(displayPrice) || 0,
      bookingFee:      0,
      notes:           notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda-appointments'] });
      onClose();
    },
  });

  const variationOk = !hasVariations || !!variationId;
  const canSave = selectedClient && professionalId && serviceId && variationOk && date && time;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-sm font-bold tracking-widest text-[#C9A4A0] uppercase">
            Cadastrar Agendamento
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">

          {/* Cliente */}
          <div className="relative">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Cliente</label>
            {selectedClient ? (
              <div className="flex items-center gap-2 px-3 py-2 border border-[#C9A4A0]/60 rounded-xl bg-[#C9A4A0]/5">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{selectedClient.name}</p>
                  <p className="text-xs text-gray-500">{selectedClient.phone ?? selectedClient.email}</p>
                </div>
                <button onClick={() => { setSelectedClient(null); setClientSearch(''); }}
                  className="p-0.5 text-gray-400 hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Busque por nome, e-mail ou telefone…"
                    value={clientSearch}
                    onChange={(e) => { setClientSearch(e.target.value); setShowClientDrop(true); }}
                    onFocus={() => setShowClientDrop(true)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm pr-8 focus:outline-none focus:border-[#C9A4A0]/60"
                  />
                  <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Busque por nome, e-mail ou telefone (mín. 2 caracteres)</p>

                {/* Dropdown */}
                {showClientDrop && customers.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {customers.map((c: any) => (
                      <button key={c.id} type="button"
                        onMouseDown={() => { setSelectedClient(c); setClientSearch(''); setShowClientDrop(false); }}
                        className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.phone ?? c.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Profissional */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Profissional</label>
            <select value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C9A4A0]/60">
              <option value="">Selecione um profissional</option>
              {professionals.filter((p) => p.isActive).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Serviço */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500 block">Serviço</label>
            <select value={serviceId} onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#C9A4A0]/60">
              <option value="">Selecione um serviço</option>
              {services.filter((s) => s.isActive).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {/* Variações — aparece só quando o serviço tem variações */}
            {hasVariations && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Selecione a variação
                </p>
                <div className="flex flex-col gap-1.5">
                  {selectedSvc!.variations.map((v) => {
                    const isSelected = variationId === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => { setVariationId(v.id); setPriceOverride(''); setDurOverride(''); }}
                        className={cn(
                          'flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors text-left',
                          isSelected
                            ? 'bg-[#C9A4A0] border-[#C9A4A0] text-white'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-[#C9A4A0]/50',
                        )}
                      >
                        <span className="font-medium">{v.name}</span>
                        <span className={cn('text-xs', isSelected ? 'text-white/80' : 'text-gray-400')}>
                          {v.durationMinutes ? `${v.durationMinutes} min · ` : ''}
                          R$ {Number(v.price ?? 0).toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!variationId && (
                  <p className="text-[10px] text-amber-600">Escolha uma variação para preencher o valor</p>
                )}
              </div>
            )}
          </div>

          {/* Data + Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Data</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A4A0]/60" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Hora</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A4A0]/60" />
            </div>
          </div>

          {/* Duração + Valor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Duração (min)</label>
              <input type="number" value={displayDur} onChange={(e) => setDurOverride(e.target.value)}
                placeholder="60"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A4A0]/60" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Valor (R$)</label>
              <input type="number" step="0.01" value={displayPrice} onChange={(e) => setPriceOverride(e.target.value)}
                placeholder="0,00"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#C9A4A0]/60" />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
            <div className="flex gap-2">
              {([
                ['aguardando_confirmacao', 'Aguard. Confirmação'],
                ['confirmado',            'Confirmado'],
                ['pendente_pagamento',    'Pend. Pagamento'],
              ] as const).map(([s, label]) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={cn(
                    'flex-1 py-1.5 rounded-xl text-xs font-medium border transition-colors',
                    status === s
                      ? 'bg-[#C9A4A0] text-white border-[#C9A4A0]'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                  )}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Observações (opcional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={3} maxLength={400} placeholder="Alguma observação para este agendamento…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#C9A4A0]/60" />
            <p className="text-[10px] text-gray-400 text-right">{notes.length} / 400</p>
          </div>

          {/* Actions */}
          {createMutation.isError && (
            <p className="text-xs text-red-600 text-center">{getErrorMessage(createMutation.error)}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!canSave || createMutation.isPending}
              className="flex-1 py-2.5 text-sm font-semibold bg-[#C9A4A0] text-white rounded-xl hover:bg-[#b8918d] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar({
  selectedDate, onSelect,
}: { selectedDate: string; onSelect: (d: string) => void }) {
  const [viewMonth, setViewMonth] = useState(() => selectedDate.slice(0, 7));

  // Sync calendar month when selectedDate changes externally (arrow nav)
  const selMonth = selectedDate.slice(0, 7);
  useEffect(() => { setViewMonth(selMonth); }, [selMonth]);

  const year  = parseInt(viewMonth.slice(0, 4));
  const month = parseInt(viewMonth.slice(5, 7)) - 1; // 0-indexed

  const firstDow   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    const d = new Date(year, month - 1, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const nextMonth = () => {
    const d = new Date(year, month + 1, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const today = todayStr();
  const monthLabel = new Date(year, month, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <p className="text-xs font-semibold text-gray-700 capitalize select-none">{monthLabel}</p>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 transition-colors">
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {['D','S','T','Q','Q','S','S'].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-semibold text-gray-400 uppercase py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSel   = dateStr === selectedDate;
          const isTod   = dateStr === today;
          return (
            <button key={i} onClick={() => onSelect(dateStr)}
              className={cn(
                'w-full aspect-square flex items-center justify-center rounded text-[11px] transition-colors font-medium',
                isSel ? 'bg-[#C9A4A0] text-white' :
                isTod ? 'text-[#C9A4A0] bg-[#C9A4A0]/10' :
                'text-gray-600 hover:bg-gray-100',
              )}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AgendaPage() {
  const [selectedDate,  setSelectedDate]  = useState(todayStr());
  const [filterPro,     setFilterPro]     = useState<string>('todos');
  const [searchClient,  setSearchClient]  = useState('');
  const [configPro,     setConfigPro]     = useState<Professional | null>(null);
  const [blockModal,    setBlockModal]    = useState<Professional | null>(null);
  const [detailAppt,    setDetailAppt]    = useState<any | null>(null);
  const [deletingBlock, setDeletingBlock] = useState<string | null>(null);
  const [showNewAppt,   setShowNewAppt]   = useState(false);
  const [ctxMenu,       setCtxMenu]       = useState<AgendaCtxMenu | null>(null);
  const [historyAppt,   setHistoryAppt]   = useState<any | null>(null);
  const [copied,        setCopied]        = useState(false);
  const qc = useQueryClient();

  const isToday = selectedDate === todayStr();
  const { weekday, rest } = formatDateHeader(selectedDate);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ['professionals'],
    queryFn: () => professionalsApi.list(),
    staleTime: 5 * 60_000,
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => servicesApi.list(),
    staleTime: 5 * 60_000,
  });

  const { data: apptRaw, isLoading: loadingAppts } = useQuery({
    queryKey: ['agenda-appointments', selectedDate],
    queryFn: () => appointmentsAdminApi.list({ date: selectedDate, limit: 200 }),
    staleTime: 30_000,
  });

  const dayAppts: any[] = Array.isArray(apptRaw)
    ? apptRaw
    : (apptRaw as any)?.items ?? [];

  const activePros = professionals.filter((p) => p.isActive ?? true);
  const visiblePros = filterPro === 'todos'
    ? activePros
    : activePros.filter((p) => p.id === filterPro);

  // ── Blocks ─────────────────────────────────────────────────────────────────
  const { data: allBlocks = [] } = useQuery<ScheduleBlock[]>({
    queryKey: ['blocks', selectedDate],
    queryFn: async () => {
      const ids = activePros.map((p) => p.id);
      const results = await Promise.all(
        ids.map((id) => schedulesApi.getBlocks(id, { from: selectedDate, to: selectedDate })),
      );
      return results.flat();
    },
    enabled: activePros.length > 0,
    staleTime: 30_000,
  });

  const deleteBlock = useMutation({
    mutationFn: (id: string) => schedulesApi.deleteBlock(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blocks'] }); setDeletingBlock(null); },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      appointmentStatusApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agenda-appointments'] }),
  });

  const handleCopy = useCallback((appt: any, service?: Service) => {
    const time = String(appt.appointment_time ?? '').slice(0, 5);
    const text = [
      `Cliente: ${appt.user?.name ?? '—'}`,
      `Serviço: ${service?.name ?? '—'}`,
      `Data: ${appt.appointment_date} às ${time}`,
      `Valor: R$ ${Number(appt.service_price ?? 0).toFixed(2)}`,
      `Status: ${STATUS[appt.status]?.label ?? appt.status}`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const clientFilter = searchClient.trim().toLowerCase();
  const getProAppts = (proId: string) =>
    dayAppts.filter((a) => {
      if (a.professional_id !== proId) return false;
      if (!clientFilter) return true;
      return (a.user?.name ?? '').toLowerCase().includes(clientFilter);
    });

  const getProBlocks = (proId: string) =>
    allBlocks.filter((b) => b.professional_id === proId);

  const getService = (serviceId?: string) =>
    services.find((s) => s.id === serviceId);

  const getProfessional = (proId?: string) =>
    professionals.find((p) => p.id === proId);

  const detailService = detailAppt
    ? getService(detailAppt.service_id)
    : undefined;
  const detailPro = detailAppt
    ? getProfessional(detailAppt.professional_id)
    : undefined;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full -mx-6 -mt-6">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
        {/* Date navigation */}
        <button onClick={() => setSelectedDate(addDays(selectedDate, -1))}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>

        <div className="min-w-[220px]">
          <p className="text-base font-semibold text-gray-900 capitalize leading-tight">{weekday}</p>
          <p className="text-xs text-gray-500">{rest}</p>
        </div>

        <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>

        {!isToday && (
          <button onClick={() => setSelectedDate(todayStr())}
            className="px-3 py-1.5 text-xs font-medium text-[#C9A4A0] border border-[#C9A4A0]/40 rounded-lg hover:bg-[#C9A4A0]/5 transition-colors">
            Hoje
          </button>
        )}
        {isToday && (
          <span className="px-2.5 py-1 text-xs font-medium bg-[#C9A4A0]/10 text-[#C9A4A0] rounded-lg">Hoje</span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {loadingAppts && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}

          {/* Client search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchClient}
              onChange={(e) => setSearchClient(e.target.value)}
              placeholder="Buscar cliente agendado…"
              className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-xl w-52 focus:outline-none focus:border-[#C9A4A0]/60 bg-white"
            />
            {searchClient && (
              <button onClick={() => setSearchClient('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowNewAppt(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#C9A4A0] hover:bg-[#b8918d] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Agendar
          </button>
          <select value={filterPro} onChange={(e) => setFilterPro(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white">
            <option value="todos">Todos os profissionais</option>
            {activePros.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── Body: sidebar + grid ──────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar ──────────────────────────────────────────────────── */}
        <div className="w-[200px] flex-shrink-0 border-r border-gray-100 bg-white overflow-y-auto flex flex-col gap-5 p-4">

          {/* Mini calendar */}
          <MiniCalendar selectedDate={selectedDate} onSelect={setSelectedDate} />

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Schedule config per professional */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Horários
            </p>
            <div className="space-y-0.5">
              {activePros.map((pro) => (
                <button key={pro.id} onClick={() => setConfigPro(pro)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-50 hover:text-[#C9A4A0] transition-colors text-left group">
                  <Settings className="w-3 h-3 text-gray-400 group-hover:text-[#C9A4A0] transition-colors flex-shrink-0" />
                  <span className="truncate">{pro.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Block per professional */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Bloquear Dia
            </p>
            <div className="space-y-0.5">
              {activePros.map((pro) => (
                <button key={pro.id} onClick={() => setBlockModal(pro)}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-gray-600 hover:bg-gray-50 hover:text-[#C9A4A0] transition-colors text-left group">
                  <Plus className="w-3 h-3 text-gray-400 group-hover:text-[#C9A4A0] transition-colors flex-shrink-0" />
                  <span className="truncate">{pro.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Time grid ─────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto bg-blue-50">
          <div className="inline-flex min-w-full">

          {/* Time labels column (sticky left) */}
          <div className="flex-shrink-0 w-14 bg-white border-r border-gray-100 sticky left-0 z-20">
            {/* Header spacer */}
            <div className="h-[72px] border-b border-gray-100" />
            {/* Hour labels */}
            <div className="relative" style={{ height: TOTAL_H }}>
              {HOURS.map((h, i) => (
                <div key={h} className="absolute right-0 left-0 flex items-start justify-end pr-2"
                  style={{ top: i * HOUR_HEIGHT }}>
                  <span className="text-[10px] text-gray-400 font-medium -mt-1.5">{h}h</span>
                </div>
              ))}
            </div>
          </div>

          {/* Professional columns */}
          {visiblePros.map((pro) => {
            const proAppts  = getProAppts(pro.id);
            const proBlocks = getProBlocks(pro.id);

            return (
              <div key={pro.id} className="flex-shrink-0 w-[200px] border-r border-blue-200/60 last:border-r-0">

                {/* Column header */}
                <div className="h-[72px] bg-white border-b border-gray-100 px-3 flex flex-col items-center justify-center gap-1 sticky top-0 z-10">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A4A0] to-[#b8918d] flex items-center justify-center flex-shrink-0">
                    {pro.avatarUrl ? (
                      <img src={pro.avatarUrl} alt={pro.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <span className="text-white text-[10px] font-bold">{initials(pro.name)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <p className="text-[11px] font-semibold text-gray-800 truncate max-w-[120px] text-center leading-tight">
                      {pro.name.split(' ')[0]}
                    </p>
                    {/* Config buttons */}
                    <button onClick={() => setConfigPro(pro)} title="Configurar horários"
                      className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                      <Settings className="w-3 h-3" />
                    </button>
                    <button onClick={() => setBlockModal(pro)} title="Adicionar bloqueio"
                      className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Time slot area */}
                <div className="relative bg-blue-50" style={{ height: TOTAL_H }}>
                  {/* Hour grid lines */}
                  {HOURS.map((_, i) => (
                    <div key={i} className="absolute left-0 right-0 border-b border-blue-200/60"
                      style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }} />
                  ))}

                  {/* Half-hour dotted lines */}
                  {HOURS.map((_, i) => (
                    <div key={`h${i}`} className="absolute left-0 right-0 border-b border-dashed border-blue-100"
                      style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                  ))}

                  {/* Blocks (AUSÊNCIA) */}
                  {proBlocks.map((blk) => {
                    const isFullDay = !blk.start_time;
                    const blkTop = isFullDay ? 0 : topPx(blk.start_time!);
                    const blkEnd = isFullDay
                      ? TOTAL_H
                      : (blk.end_time ? topPx(blk.end_time) : blkTop + HOUR_HEIGHT);
                    const blkH = blkEnd - blkTop;

                    return (
                      <div key={blk.id}
                        className="absolute left-0 right-0 bg-gray-100 border-l-[3px] border-l-gray-400 flex flex-col px-2 py-1 overflow-hidden group"
                        style={{ top: blkTop, height: Math.max(blkH, 20), zIndex: 5 }}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide truncate">
                              Ausência
                            </p>
                            {blk.reason && (
                              <p className="text-[10px] text-gray-400 truncate">{blk.reason}</p>
                            )}
                            {!isFullDay && (
                              <p className="text-[10px] text-gray-400">
                                {String(blk.start_time).slice(0, 5)} – {String(blk.end_time).slice(0, 5)}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => { setDeletingBlock(blk.id); deleteBlock.mutate(blk.id); }}
                            disabled={deletingBlock === blk.id}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 transition-all flex-shrink-0">
                            {deletingBlock === blk.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Trash2 className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Appointments */}
                  {proAppts
                    .sort((a, b) => String(a.appointment_time).localeCompare(String(b.appointment_time)))
                    .map((appt) => (
                      <AppointmentBlock
                        key={appt.id}
                        appt={appt}
                        service={getService(appt.service_id)}
                        onClick={() => setDetailAppt(appt)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setCtxMenu({ x: e.clientX, y: e.clientY, appt, service: getService(appt.service_id), professional: getProfessional(appt.professional_id) });
                        }}
                      />
                    ))}

                  {/* Current time line */}
                  {isToday && (() => {
                    const now = new Date();
                    const nowMin = now.getHours() * 60 + now.getMinutes();
                    const nowTop = ((nowMin - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                    if (nowTop < 0 || nowTop > TOTAL_H) return null;
                    return (
                      <div className="absolute left-0 right-0 z-20 pointer-events-none"
                        style={{ top: nowTop }}>
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-[#C9A4A0] -ml-1 flex-shrink-0" />
                          <div className="flex-1 border-t-2 border-[#C9A4A0]" />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}

          {/* Empty state if no professionals */}
          {visiblePros.length === 0 && (
            <div className="flex-1 flex items-center justify-center py-20 text-gray-400 text-sm">
              Nenhum profissional encontrado.
            </div>
          )}
        </div>
        </div>{/* end time grid overflow-auto */}
      </div>{/* end body flex row */}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      {showNewAppt && (
        <NewAppointmentModal
          defaultDate={selectedDate}
          professionals={professionals}
          services={services}
          onClose={() => setShowNewAppt(false)}
        />
      )}
      {configPro && (
        <ScheduleConfigModal professional={configPro} onClose={() => setConfigPro(null)} />
      )}
      {blockModal && (
        <BlockModal professional={blockModal} date={selectedDate} onClose={() => setBlockModal(null)} />
      )}
      {detailAppt && (
        <AppointmentDetailModal
          appt={detailAppt}
          service={detailService}
          professional={detailPro}
          onClose={() => setDetailAppt(null)}
        />
      )}
      {historyAppt && (
        <AgendaHistoryModal appt={historyAppt} onClose={() => setHistoryAppt(null)} />
      )}
      {ctxMenu && (
        <AgendaContextMenu
          menu={ctxMenu}
          onClose={() => setCtxMenu(null)}
          onView={(a, s, p) => { setDetailAppt(a); }}
          onChangeStatus={(id, status) => statusMutation.mutate({ id, status })}
          onHistory={setHistoryAppt}
          onCopy={handleCopy}
        />
      )}
      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          <Check className="w-4 h-4 text-green-400" />
          Informações copiadas!
        </div>
      )}
    </div>
  );
}
