'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Save, Loader2, Calendar } from 'lucide-react';
import { settingsApi } from '@/lib/api';
import { ScheduleSettings } from '@/types';
import { getErrorMessage } from '@/lib/utils';

const DAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const DAY_LABELS: Record<string, string> = { dom: 'Domingo', seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado' };

export default function SchedulePage() {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<ScheduleSettings>({
    queryKey: ['settings', 'schedule'],
    queryFn: () => settingsApi.get('schedule'),
  });

  const { register, handleSubmit, formState: { isSubmitting } } = useForm<ScheduleSettings>({ values: data ?? undefined });

  const updateMutation = useMutation({
    mutationFn: (v: ScheduleSettings) => settingsApi.set('schedule', v),
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 3000); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0]" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><Calendar className="w-5 h-5 text-blue-500" /></div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Configurações de Agenda</h2>
          <p className="text-sm text-gray-500">Taxas, políticas e horários de funcionamento.</p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      {saved && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">✓ Configurações salvas!</div>}

      <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-5">
        {/* Taxas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-medium text-gray-900 text-sm mb-4">Taxas & Políticas</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Taxa de reserva (R$)</label>
              <input {...register('bookingFee', { valueAsNumber: true })} type="number" step="0.01" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Taxa no-show (R$)</label>
              <input {...register('noShowFee', { valueAsNumber: true })} type="number" step="0.01" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Intervalo entre slots</label>
              <select {...register('slotIntervalMinutes', { valueAsNumber: true })} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]">
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm text-gray-700 mb-1">Política de cancelamento</label>
            <input {...register('cancelPolicy')} placeholder="ex: 24h de antecedência" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
          </div>
        </div>

        {/* Horários */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-medium text-gray-900 text-sm mb-4">Horários de funcionamento</h3>
          <div className="space-y-2">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-3">
                <span className="w-16 text-sm text-gray-700 font-medium">{DAY_LABELS[day]}</span>
                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                  <input {...register(`businessHours.${day}.closed`)} type="checkbox" className="w-3.5 h-3.5 accent-[#C9A4A0]" />
                  Fechado
                </label>
                <input {...register(`businessHours.${day}.open`)} type="time" defaultValue="09:00" className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                <span className="text-xs text-gray-400">até</span>
                <input {...register(`businessHours.${day}.close`)} type="time" defaultValue="19:00" className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-[#C9A4A0] hover:bg-[#b8918d] disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSubmitting ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </form>
    </div>
  );
}
