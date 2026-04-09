'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Send, Loader2, X, Users } from 'lucide-react';
import { pushCampaignsApi } from '@/lib/api';
import { PushCampaign } from '@/types';
import { formatDateTime, formatRelative } from '@/lib/formatters';
import { getErrorMessage } from '@/lib/utils';

const statusBadge: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-600',
  agendada: 'bg-blue-100 text-blue-700',
  enviada: 'bg-green-100 text-green-700',
  cancelada: 'bg-red-100 text-red-600',
};

const segmentLabel: Record<string, string> = { todos: 'Todas as clientes', vip: 'Clientes VIP', ativos: 'Clientes ativos', inativos: 'Clientes inativas' };

export default function PushCampaignsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: campaigns = [], isLoading } = useQuery<PushCampaign[]>({
    queryKey: ['push-campaigns'],
    queryFn: pushCampaignsApi.list,
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<{ title: string; body: string; segment: string; scheduledAt?: string }>();

  const createMutation = useMutation({
    mutationFn: pushCampaignsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['push-campaigns'] }); setShowForm(false); reset(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Push Campaigns ({campaigns.length})</h2>
          <p className="text-sm text-gray-500">Envie notificações push segmentadas para as clientes.</p>
        </div>
        <button onClick={() => { setShowForm(true); setError(null); }} className="flex items-center gap-2 bg-[#C9A4A0] hover:bg-[#b8918d] text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> Nova campanha
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-xl border animate-pulse" />)
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Send className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhuma campanha criada.</p>
          </div>
        ) : campaigns.map((c) => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{c.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[c.status]}`}>{c.status}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{c.body}</p>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{segmentLabel[c.segment]}</span>
                  {c.sentAt && <span>Enviada {formatRelative(c.sentAt)}</span>}
                  {c.scheduledAt && c.status === 'agendada' && <span>Agendada para {formatDateTime(c.scheduledAt)}</span>}
                  {c.sentCount > 0 && <span>{c.sentCount} envios</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Nova campanha push</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input {...register('title', { required: true })} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem *</label>
                <textarea {...register('body', { required: true })} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0] resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Segmentação</label>
                <select {...register('segment')} className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]">
                  <option value="todos">Todas as clientes</option>
                  <option value="vip">Clientes VIP</option>
                  <option value="ativos">Clientes com agendamento recente</option>
                  <option value="inativos">Clientes inativas (+90 dias)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agendamento (opcional)</label>
                <input {...register('scheduledAt')} type="datetime-local" className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]" />
                <p className="text-xs text-gray-400 mt-1">Deixe em branco para salvar como rascunho.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-10 border border-gray-200 rounded-lg text-sm">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 h-10 bg-[#C9A4A0] hover:bg-[#b8918d] disabled:opacity-60 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
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
