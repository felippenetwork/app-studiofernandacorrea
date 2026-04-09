'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Cake, Play, Loader2, Save } from 'lucide-react';
import { birthdayApi } from '@/lib/api';
import { BirthdaySettings } from '@/types';
import { getErrorMessage } from '@/lib/utils';

export default function BirthdayPage() {
  const [runResult, setRunResult] = useState<{ processed: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: settings, isLoading } = useQuery<BirthdaySettings>({
    queryKey: ['birthday-settings'],
    queryFn: birthdayApi.getSettings,
  });

  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm<BirthdaySettings>({
    values: settings ?? undefined,
  });

  const updateMutation = useMutation({
    mutationFn: birthdayApi.updateSettings,
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 3000); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const runMutation = useMutation({
    mutationFn: birthdayApi.runNow,
    onSuccess: (data) => setRunResult(data.data),
    onError: (e) => setError(getErrorMessage(e)),
  });

  const isActive = watch('isActive', settings?.isActive ?? false);

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0]" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
          <Cake className="w-5 h-5 text-pink-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Automação de Aniversário</h2>
          <p className="text-sm text-gray-500">Envio automático de cupom no dia do aniversário das clientes.</p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      {saved && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">✓ Configurações salvas com sucesso!</div>}
      {runResult && (
        <div className="p-4 bg-pink-50 border border-pink-200 rounded-lg">
          <p className="text-sm font-medium text-pink-800">Automação executada!</p>
          <p className="text-sm text-pink-700 mt-1">{runResult.processed} aniversariante(s) processada(s) · {runResult.skipped} já recebera(m) este ano.</p>
        </div>
      )}

      <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
        {/* Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900 text-sm">Automação ativa</p>
            <p className="text-xs text-gray-500 mt-0.5">Ao ativar, cupons serão enviados automaticamente todo dia às {watch('sendHour', settings?.sendHour ?? 8)}h.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input {...register('isActive')} type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C9A4A0]" />
          </label>
        </div>

        {/* Coupon settings */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de desconto</label>
            <select {...register('couponType')} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]">
              <option value="fixed">Valor fixo (R$)</option>
              <option value="percentage">Percentual (%)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor do desconto</label>
            <input {...register('couponValue', { valueAsNumber: true })} type="number" step="0.01" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Validade do cupom (dias)</label>
            <input {...register('couponValidityDays', { valueAsNumber: true })} type="number" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horário de envio (hora)</label>
            <input {...register('sendHour', { valueAsNumber: true })} type="number" min="0" max="23" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
            <p className="text-xs text-gray-400 mt-1">0–23 (ex: 8 = 08:00)</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem do push</label>
          <textarea {...register('pushMessage')} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] resize-none" />
          <p className="text-xs text-gray-400 mt-1">Mensagem enviada via push notification para a aniversariante.</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-[#C9A4A0] hover:bg-[#b8918d] disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSubmitting ? 'Salvando…' : 'Salvar configurações'}
          </button>
          <button
            type="button"
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending}
            className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg"
          >
            {runMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Executar agora
          </button>
        </div>
      </form>

      {/* How it works */}
      <div className="bg-pink-50 border border-pink-100 rounded-xl p-5">
        <h3 className="font-medium text-pink-800 text-sm mb-3">Como funciona</h3>
        <ol className="space-y-1.5 text-sm text-pink-700">
          <li>1. Clientes com data de nascimento cadastrada são elegíveis.</li>
          <li>2. Todos os dias, às {watch('sendHour', settings?.sendHour ?? 8)}h, o sistema verifica aniversariantes do dia.</li>
          <li>3. Um cupom único é gerado com código <code className="bg-pink-100 px-1 rounded">ANIV{new Date().getFullYear()}XXXXXX</code>.</li>
          <li>4. Uma push notification é enviada para a cliente.</li>
          <li>5. O cupom é válido por {watch('couponValidityDays', settings?.couponValidityDays ?? 30)} dias.</li>
          <li>6. Cada cliente recebe apenas um cupom por ano.</li>
        </ol>
        <p className="text-xs text-pink-500 mt-3">
          Para ativar o envio automático, configure um cron job no servidor:<br />
          <code className="bg-pink-100 px-2 py-0.5 rounded font-mono">curl -X POST {'{API_BASE_URL}'}/api/admin/birthday/run-now -H "Authorization: Bearer {'{token}'}"</code>
        </p>
      </div>
    </div>
  );
}
