'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Save, Loader2, Eye } from 'lucide-react';
import { settingsApi } from '@/lib/api';
import { BrandingSettings } from '@/types';
import { getErrorMessage } from '@/lib/utils';

export default function AppearancePage() {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: branding, isLoading } = useQuery<BrandingSettings>({
    queryKey: ['settings', 'branding'],
    queryFn: () => settingsApi.get('branding'),
  });

  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm<BrandingSettings>({
    values: branding ?? undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (data: BrandingSettings) => settingsApi.set('branding', data),
    onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 3000); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const primaryColor = watch('primaryColor', branding?.primaryColor ?? '#C9A4A0');
  const accentColor = watch('accentColor', branding?.accentColor ?? '#C9A87C');
  const bgColor = watch('backgroundColor', branding?.backgroundColor ?? '#F8F5F2');

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0]" /></div>;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {/* Form */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Aparência & Branding</h2>
          <p className="text-sm text-gray-500">Personalize as cores, logo e textos do app.</p>
        </div>

        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
        {saved && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">✓ Aparência salva com sucesso!</div>}

        <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h3 className="font-medium text-gray-900 text-sm">Cores</h3>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Cor primária', field: 'primaryColor' as const, hint: 'Botões e destaques principais' },
              { label: 'Cor de destaque', field: 'accentColor' as const, hint: 'Elementos secundários' },
              { label: 'Fundo', field: 'backgroundColor' as const, hint: 'Cor de fundo do app' },
            ].map(({ label, field, hint }) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <div className="flex items-center gap-2">
                  <input {...register(field)} type="color" className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                  <input {...register(field)} type="text" className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] font-mono" />
                </div>
                <p className="text-xs text-gray-400 mt-1">{hint}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-5">
            <h3 className="font-medium text-gray-900 text-sm mb-4">Textos institucionais</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
              <input {...register('tagline')} placeholder="Beleza que transforma." className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <h3 className="font-medium text-gray-900 text-sm mb-4">Imagens</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL do logo</label>
                <input {...register('logoUrl')} type="url" placeholder="https://…" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL do banner principal</label>
                <input {...register('bannerUrl')} type="url" placeholder="https://…" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-[#C9A4A0] hover:bg-[#b8918d] disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isSubmitting ? 'Salvando…' : 'Publicar alterações'}
            </button>
          </div>
        </form>
      </div>

      {/* Preview */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">Preview do app</p>
        </div>
        <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 max-w-xs mx-auto" style={{ backgroundColor: bgColor }}>
          {/* Status bar mock */}
          <div className="h-10 flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
            <span className="text-white text-xs font-medium">Studio Fernanda Correa</span>
          </div>
          {/* Body */}
          <div className="p-5 space-y-4">
            <div className="h-24 rounded-xl" style={{ backgroundColor: primaryColor, opacity: 0.2 }} />
            <div className="h-4 w-3/4 rounded" style={{ backgroundColor: primaryColor, opacity: 0.3 }} />
            <div className="h-3 w-1/2 rounded bg-gray-200" />
            <div className="h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
              <span className="text-white text-sm font-medium">Agendar</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: accentColor, opacity: 0.4 }} />
              <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: accentColor, opacity: 0.4 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
