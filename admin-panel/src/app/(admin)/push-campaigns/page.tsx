'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import {
  Plus, Send, Loader2, X, Users, CheckCircle2, AlertCircle,
  RefreshCw, Clock, Pause, Play, Calendar,
} from 'lucide-react';
import { pushCampaignsApi } from '@/lib/api';
import { PushCampaign } from '@/types';
import { formatDateTime, formatRelative } from '@/lib/formatters';
import { getErrorMessage, cn } from '@/lib/utils';

const DAYS_BRT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00`,
}));

const statusBadge: Record<string, string> = {
  rascunho:   'bg-gray-100 text-gray-600',
  agendada:   'bg-blue-100 text-blue-700',
  enviada:    'bg-green-100 text-green-700',
  manual:     'bg-purple-100 text-purple-700',
  recorrente: 'bg-amber-100 text-amber-700',
  cancelada:  'bg-red-100 text-red-600',
};
const statusLabel: Record<string, string> = {
  rascunho:   'Rascunho',
  agendada:   'Agendada',
  enviada:    'Enviada',
  manual:     'Manual',
  recorrente: 'Recorrente',
  cancelada:  'Cancelada',
};
const segmentLabel: Record<string, string> = {
  todos:     'Todas as clientes',
  vip:       'Clientes VIP',
  ativos:    'Clientes ativas',
  inativos:  'Clientes inativas',
  marketing: 'Opt-in marketing',
};

type FormData = {
  title: string;
  body: string;
  segment: string;
  type: 'unico' | 'manual' | 'recorrente';
  scheduledAt?: string;
  recurrenceType?: 'weekly' | 'interval';
  recurrenceDays?: number[];
  recurrenceInterval?: number;
  recurrenceHour?: number;
};
type SendResult = { campaignId: string; sent: number; failed: number };

function recurrenceDescription(c: PushCampaign): string {
  if (c.type !== 'recorrente') return '';
  if (c.recurrenceType === 'weekly' && c.recurrenceDays?.length) {
    const names = c.recurrenceDays.map((d) => DAYS_BRT[d]).join(', ');
    return `Toda(s): ${names} às ${String(c.recurrenceHour ?? 9).padStart(2, '0')}:00`;
  }
  if (c.recurrenceType === 'interval' && c.recurrenceInterval) {
    return `A cada ${c.recurrenceInterval} dia(s) às ${String(c.recurrenceHour ?? 9).padStart(2, '0')}:00`;
  }
  return '';
}

export default function PushCampaignsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  const { data: campaigns = [], isLoading } = useQuery<PushCampaign[]>({
    queryKey: ['push-campaigns'],
    queryFn: pushCampaignsApi.list,
  });

  const { register, handleSubmit, reset, watch, control, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: { segment: 'todos', type: 'unico', recurrenceType: 'weekly', recurrenceDays: [], recurrenceHour: 9 },
  });

  const selectedType = watch('type');
  const recurrenceType = watch('recurrenceType');
  const recurrenceDays = watch('recurrenceDays') ?? [];

  const createMutation = useMutation({
    mutationFn: pushCampaignsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['push-campaigns'] }); setShowForm(false); reset(); setError(null); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => pushCampaignsApi.send(id),
    onSuccess: (data, id) => {
      qc.invalidateQueries({ queryKey: ['push-campaigns'] });
      setSendResult({ campaignId: id, sent: data.data?.sent ?? 0, failed: data.data?.failed ?? 0 });
      setError(null);
    },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => pushCampaignsApi.toggle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['push-campaigns'] }),
    onError: (e) => setError(getErrorMessage(e)),
  });

  const canSend = (c: PushCampaign) =>
    c.type === 'manual'     ? c.status === 'manual' :
    c.type === 'recorrente' ? c.status === 'recorrente' :
    c.status === 'rascunho' || c.status === 'agendada';

  const toggleDaySelection = (days: number[], day: number): number[] =>
    days.includes(day) ? days.filter((d) => d !== day) : [...days, day];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Push Campaigns ({campaigns.length})</h2>
          <p className="text-sm text-gray-500">Envie notificações push segmentadas para as clientes.</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError(null); setSendResult(null); }}
          className="flex items-center gap-2 bg-[#C9A4A0] hover:bg-[#b8918d] text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" /> Nova campanha
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {sendResult && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm text-green-800 font-medium">Campanha enviada!</p>
            <p className="text-xs text-green-700 mt-0.5">
              {sendResult.sent} dispositivos alcançados
              {sendResult.failed > 0 && `, ${sendResult.failed} falhas`}
            </p>
          </div>
          <button onClick={() => setSendResult(null)} className="ml-auto p-1 rounded hover:bg-green-100 text-green-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-28 bg-white rounded-xl border animate-pulse" />)
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Send className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhuma campanha criada.</p>
          </div>
        ) : campaigns.map((c) => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-gray-900 text-sm">{c.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[c.status] ?? statusBadge.rascunho}`}>
                    {statusLabel[c.status] ?? c.status}
                  </span>
                  {c.type === 'manual' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Reenviável
                    </span>
                  )}
                  {c.type === 'recorrente' && (
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full flex items-center gap-1',
                      c.recurrenceActive ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-400'
                    )}>
                      <Calendar className="w-3 h-3" />
                      {c.recurrenceActive ? 'Ativa' : 'Pausada'}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{c.body}</p>

                <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {segmentLabel[c.segment] ?? c.segment}
                  </span>
                  {c.type === 'recorrente' && recurrenceDescription(c) && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Clock className="w-3 h-3" /> {recurrenceDescription(c)}
                    </span>
                  )}
                  {c.type === 'recorrente' && c.recurrenceNextSend && c.recurrenceActive && (
                    <span className="flex items-center gap-1 text-amber-700 font-medium">
                      Próximo: {formatDateTime(c.recurrenceNextSend)}
                    </span>
                  )}
                  {c.sentAt && (
                    <span>Último envio {formatRelative(c.sentAt)}</span>
                  )}
                  {c.sentCount > 0 && (
                    <span className="text-green-600 font-medium">
                      {c.sentCount} {c.type === 'unico' ? 'envios' : 'envios acumulados'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Pause / Resume for recurring */}
                {c.type === 'recorrente' && (
                  <button
                    onClick={() => toggleMutation.mutate(c.id)}
                    disabled={toggleMutation.isPending && toggleMutation.variables === c.id}
                    title={c.recurrenceActive ? 'Pausar' : 'Retomar'}
                    className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 disabled:opacity-50"
                  >
                    {toggleMutation.isPending && toggleMutation.variables === c.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : c.recurrenceActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                )}

                {/* Send now */}
                {canSend(c) && (
                  <button
                    onClick={() => {
                      setError(null); setSendResult(null);
                      const msg = c.type === 'recorrente'
                        ? `Enviar "${c.title}" agora (fora do horário programado)?`
                        : c.type === 'manual'
                        ? `Reenviar "${c.title}" para ${segmentLabel[c.segment] ?? c.segment}?`
                        : `Enviar "${c.title}" para ${segmentLabel[c.segment] ?? c.segment}?`;
                      if (confirm(msg)) sendMutation.mutate(c.id);
                    }}
                    disabled={sendMutation.isPending && sendMutation.variables === c.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C9A4A0] hover:bg-[#b8918d] disabled:opacity-60 text-white rounded-lg text-xs font-medium"
                  >
                    {sendMutation.isPending && sendMutation.variables === c.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : c.type === 'manual' ? <RefreshCw className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                    Enviar agora
                  </button>
                )}

                {c.type === 'unico' && c.status === 'enviada' && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle2 className="w-4 h-4" /> Enviada
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Create form modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Nova campanha push</h3>
              <button onClick={() => { setShowForm(false); reset(); }} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="p-6 space-y-5">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de campanha</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: 'unico',      icon: Send,      label: 'Envio único',  sub: 'Enviada uma vez' },
                    { value: 'manual',     icon: RefreshCw, label: 'Manual',       sub: 'Reenviável a qualquer hora' },
                    { value: 'recorrente', icon: Calendar,  label: 'Recorrente',   sub: 'Automático no horário' },
                  ] as const).map(({ value, icon: Icon, label, sub }) => (
                    <label key={value} className={cn(
                      'flex flex-col gap-1 p-3 border-2 rounded-xl cursor-pointer transition-colors',
                      selectedType === value
                        ? value === 'recorrente' ? 'border-amber-400 bg-amber-50'
                        : value === 'manual' ? 'border-purple-400 bg-purple-50'
                        : 'border-[#C9A4A0] bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}>
                      <input {...register('type')} type="radio" value={value} className="sr-only" />
                      <Icon className="w-4 h-4 text-gray-600" />
                      <span className="text-xs font-semibold text-gray-800">{label}</span>
                      <span className="text-[10px] text-gray-500 leading-tight">{sub}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Título e mensagem */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input {...register('title', { required: true })} placeholder="ex: Promoção de verão 🌸"
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem *</label>
                <textarea {...register('body', { required: true })} rows={3}
                  placeholder="Texto que a cliente verá na notificação"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] resize-none" />
              </div>

              {/* Segmento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Segmentação</label>
                <select {...register('segment')} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]">
                  <option value="todos">Todas as clientes</option>
                  <option value="vip">Clientes VIP</option>
                  <option value="marketing">Opt-in de marketing</option>
                  <option value="ativos">Clientes com agendamento recente</option>
                  <option value="inativos">Clientes inativas (+90 dias)</option>
                </select>
              </div>

              {/* Agendamento único */}
              {selectedType === 'unico' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agendar envio (opcional)</label>
                  <input {...register('scheduledAt')} type="datetime-local"
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                  <p className="text-xs text-gray-400 mt-1">Deixe em branco para salvar como rascunho.</p>
                </div>
              )}

              {/* Recorrência */}
              {selectedType === 'recorrente' && (
                <div className="space-y-4 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Configuração da recorrência</p>

                  {/* Tipo de recorrência */}
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'weekly',   label: 'Dias da semana' },
                      { value: 'interval', label: 'A cada X dias' },
                    ] as const).map(({ value, label }) => (
                      <label key={value} className={cn(
                        'flex items-center justify-center p-2.5 border-2 rounded-lg cursor-pointer text-sm font-medium transition-colors',
                        recurrenceType === value ? 'border-amber-400 bg-white text-amber-800' : 'border-amber-200 text-amber-600 hover:border-amber-300'
                      )}>
                        <input {...register('recurrenceType')} type="radio" value={value} className="sr-only" />
                        {label}
                      </label>
                    ))}
                  </div>

                  {/* Dias da semana */}
                  {recurrenceType === 'weekly' && (
                    <div>
                      <p className="text-xs text-amber-700 mb-2">Selecione os dias:</p>
                      <Controller
                        control={control}
                        name="recurrenceDays"
                        render={({ field }) => (
                          <div className="flex gap-1.5 flex-wrap">
                            {DAYS_BRT.map((name, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => field.onChange(toggleDaySelection(field.value ?? [], idx))}
                                className={cn(
                                  'w-10 h-10 rounded-full text-xs font-semibold transition-colors',
                                  (field.value ?? []).includes(idx)
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-white border border-amber-200 text-amber-600 hover:border-amber-400'
                                )}
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        )}
                      />
                    </div>
                  )}

                  {/* Intervalo em dias */}
                  {recurrenceType === 'interval' && (
                    <div>
                      <label className="block text-xs text-amber-700 mb-1">A cada quantos dias?</label>
                      <div className="flex items-center gap-2">
                        <input
                          {...register('recurrenceInterval', { valueAsNumber: true, min: 1, max: 365 })}
                          type="number" min={1} max={365} defaultValue={15}
                          className="w-24 h-10 px-3 border border-amber-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                        <span className="text-sm text-amber-700">dias</span>
                      </div>
                    </div>
                  )}

                  {/* Horário */}
                  <div>
                    <label className="block text-xs text-amber-700 mb-1">Horário de envio (Brasília)</label>
                    <select
                      {...register('recurrenceHour', { valueAsNumber: true })}
                      className="w-full h-10 px-3 border border-amber-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      {HOUR_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowForm(false); reset(); }}
                  className="flex-1 h-10 border border-gray-200 rounded-lg text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting || createMutation.isPending}
                  className="flex-1 h-10 bg-[#C9A4A0] hover:bg-[#b8918d] disabled:opacity-60 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {(isSubmitting || createMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                  Criar campanha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
