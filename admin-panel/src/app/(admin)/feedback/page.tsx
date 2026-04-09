'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Loader2, Star, CheckCircle2, XCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { feedbackApi } from '@/lib/api';
import { Feedback } from '@/types';
import { formatDateTime } from '@/lib/formatters';
import { getErrorMessage } from '@/lib/utils';

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
    </span>
  );
}

const statusColor: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-700',
  aprovado: 'bg-green-100 text-green-700',
  rejeitado: 'bg-red-100 text-red-700',
};
const statusLabel: Record<string, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

export default function FeedbackPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['feedback', statusFilter, page],
    queryFn: () => feedbackApi.list({ status: statusFilter || undefined, page, limit: 20 }),
  });

  const items: Feedback[] = data?.items ?? [];
  const total: number = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20) || 1;

  const pendingCount = items.filter((i) => i.status === 'pendente').length;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'aprovado' | 'rejeitado' }) =>
      feedbackApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback'] }),
    onError: (e) => setError(getErrorMessage(e)),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Avaliações & Feedback ({total})</h2>
          <p className="text-sm text-gray-500">Modere os comentários dos clientes antes de exibi-los no app.</p>
        </div>
        {pendingCount > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 font-medium">
            <MessageSquare className="w-4 h-4" /> {pendingCount} aguardando moderação
          </span>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['', 'pendente', 'aprovado', 'rejeitado'] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${statusFilter === s ? 'bg-[#C9A4A0] text-white border-[#C9A4A0]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#C9A4A0]'}`}
          >
            {s === '' ? 'Todos' : statusLabel[s]}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0] mx-auto" /></div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum feedback encontrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.id} className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{item.userName}</span>
                      <Stars rating={item.rating} />
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[item.status]}`}>{statusLabel[item.status]}</span>
                    </div>
                    {(item.serviceName || item.professionalName) && (
                      <p className="text-xs text-gray-400">
                        {item.serviceName && <span>Serviço: <strong>{item.serviceName}</strong></span>}
                        {item.professionalName && <span> · Profissional: <strong>{item.professionalName}</strong></span>}
                      </p>
                    )}
                    <p className="text-sm text-gray-700 leading-relaxed">{item.comment}</p>
                    <p className="text-xs text-gray-400">{formatDateTime(item.createdAt)}</p>
                  </div>
                  {item.status === 'pendente' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => statusMutation.mutate({ id: item.id, status: 'aprovado' })}
                        disabled={statusMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-xs font-medium"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" /> Aprovar
                      </button>
                      <button
                        onClick={() => statusMutation.mutate({ id: item.id, status: 'rejeitado' })}
                        disabled={statusMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg text-xs font-medium"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" /> Rejeitar
                      </button>
                    </div>
                  )}
                  {item.status === 'aprovado' && (
                    <span className="flex items-center gap-1 text-xs text-green-600 shrink-0">
                      <CheckCircle2 className="w-4 h-4" /> Publicado
                    </span>
                  )}
                  {item.status === 'rejeitado' && (
                    <span className="flex items-center gap-1 text-xs text-red-400 shrink-0">
                      <XCircle className="w-4 h-4" /> Rejeitado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/60">
            <p className="text-xs text-gray-500">{total} registros</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 px-3 border border-gray-200 rounded text-xs disabled:opacity-40">← Anterior</button>
              <span className="h-7 px-3 flex items-center text-xs">{page}/{totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-7 px-3 border border-gray-200 rounded text-xs disabled:opacity-40">Próxima →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
