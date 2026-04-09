'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Save, Loader2, Plug, CheckCircle2, XCircle } from 'lucide-react';
import { settingsApi } from '@/lib/api';
import { IntegrationSettings } from '@/types';
import { getErrorMessage } from '@/lib/utils';

export default function IntegrationsPage() {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<IntegrationSettings>({
    queryKey: ['settings', 'integrations'],
    queryFn: () => settingsApi.get('integrations'),
  });

  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm<IntegrationSettings>({ values: data ?? undefined });

  const updateMutation = useMutation({
    mutationFn: (v: IntegrationSettings) => settingsApi.set('integrations', v),
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 3000); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0]" /></div>;

  const integrations = [
    { key: 'trinksEnabled', label: 'Trinks', desc: 'Sistema de agendamento online. Sincroniza horários e profissionais.', envVars: ['TRINKS_API_URL', 'TRINKS_API_KEY', 'TRINKS_COMPANY_ID'] },
    { key: 'mercadoPagoEnabled', label: 'Mercado Pago', desc: 'Processamento de pagamentos via Pix e cartão.', envVars: ['MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET', 'API_BASE_URL'] },
    { key: 'pushEnabled', label: 'Push Notifications (Expo)', desc: 'Notificações push para clientes via Expo Push API.', envVars: [] },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Integrações</h2>
        <p className="text-sm text-gray-500">Configure as integrações externas do sistema.</p>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      {saved && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">✓ Configurações salvas!</div>}

      <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-4">
        {integrations.map(({ key, label, desc, envVars }) => {
          const isEnabled = watch(key as keyof IntegrationSettings, (data as any)?.[key] ?? false);
          return (
            <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Plug className={`w-5 h-5 ${isEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{label}</p>
                      {isEnabled
                        ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="w-3 h-3" /> Ativo</span>
                        : <span className="flex items-center gap-1 text-xs text-gray-400"><XCircle className="w-3 h-3" /> Inativo</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    {envVars.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {envVars.map((v) => <code key={v} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">{v}</code>)}
                      </div>
                    )}
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input {...register(key as keyof IntegrationSettings)} type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C9A4A0]" />
                </label>
              </div>
            </div>
          );
        })}

        {/* Google Review */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Link Google Reviews</label>
          <input {...register('googleReviewLink')} type="url" placeholder="https://g.page/r/…" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
          <p className="text-xs text-gray-400 mt-1">Exibido no app para incentivar avaliações no Google.</p>
        </div>

        <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-[#C9A4A0] hover:bg-[#b8918d] disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSubmitting ? 'Salvando…' : 'Salvar configurações'}
        </button>
      </form>
    </div>
  );
}
