'use client';
import { useQuery } from '@tanstack/react-query';
import { Star, Loader2, ExternalLink, TrendingUp, MessageCircle, BarChart3 } from 'lucide-react';
import { reviewsApi, settingsApi } from '@/lib/api';
import { ReviewSummary, IntegrationSettings } from '@/types';
import { formatDateTime } from '@/lib/formatters';

function Stars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const cls = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((s) => (
        <Star key={s} className={`${cls} ${s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const { data: integrations } = useQuery<IntegrationSettings>({
    queryKey: ['settings', 'integrations'],
    queryFn: () => settingsApi.get('integrations'),
  });

  const { data: summary, isLoading, isError } = useQuery<ReviewSummary>({
    queryKey: ['reviews-summary'],
    queryFn: () => reviewsApi.summary(),
    retry: 1,
  });

  const googleLink = integrations?.googleReviewLink;
  const total = summary?.totalReviews ?? 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Avaliações Google & App</h2>
          <p className="text-sm text-gray-500">Visão geral das avaliações dos clientes e link para o Google.</p>
        </div>
        {googleLink && (
          <a
            href={googleLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#C9A4A0] hover:bg-[#b8918d] text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            <ExternalLink className="w-4 h-4" /> Ver no Google
          </a>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0]" /></div>
      ) : isError || !summary ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <BarChart3 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Nenhuma avaliação ainda.</p>
          <p className="text-xs text-gray-400 mt-1">Avaliações aparecem aqui depois que clientes concluírem atendimentos.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-center text-center">
              <Stars rating={summary.averageRating} size="lg" />
              <p className="text-4xl font-bold text-gray-900 mt-2">{summary.averageRating.toFixed(1)}</p>
              <p className="text-sm text-gray-500 mt-1">Nota média</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-[#C9A4A0]/10 flex items-center justify-center mb-2">
                <MessageCircle className="w-5 h-5 text-[#C9A4A0]" />
              </div>
              <p className="text-4xl font-bold text-gray-900">{total}</p>
              <p className="text-sm text-gray-500 mt-1">Total de avaliações</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-4xl font-bold text-gray-900">
                {total > 0 ? Math.round(((summary.breakdown['5'] ?? 0) + (summary.breakdown['4'] ?? 0)) / total * 100) : 0}%
              </p>
              <p className="text-sm text-gray-500 mt-1">Satisfação (4-5 ★)</p>
            </div>
          </div>

          {/* Breakdown + Google link config */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="font-medium text-gray-900 text-sm mb-4">Distribuição por nota</h3>
              <div className="space-y-2.5">
                {[5,4,3,2,1].map((star) => {
                  const count = summary.breakdown[String(star)] ?? 0;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-4 text-right">{star}</span>
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
              <h3 className="font-medium text-gray-900 text-sm">Link Google Reviews</h3>
              {googleLink ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
                    <p className="text-xs text-green-700 font-medium">Link configurado</p>
                  </div>
                  <p className="text-xs text-gray-500 break-all">{googleLink}</p>
                  <a href={googleLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#C9A4A0] hover:text-[#b8918d] font-medium">
                    <ExternalLink className="w-4 h-4" /> Abrir página Google
                  </a>
                  <p className="text-xs text-gray-400">Exibido no app para incentivar avaliações. Configure em <strong>Integrações</strong>.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="w-2 h-2 bg-amber-500 rounded-full shrink-0" />
                    <p className="text-xs text-amber-700 font-medium">Link não configurado</p>
                  </div>
                  <p className="text-xs text-gray-500">Adicione em <strong>Configurações → Integrações → Link Google Reviews</strong>.</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent reviews */}
          {summary.recentReviews.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-medium text-gray-900 text-sm">Avaliações recentes</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {summary.recentReviews.map((review) => (
                  <div key={review.id} className="p-5 flex items-start gap-4">
                    <div className="w-9 h-9 rounded-full bg-[#C9A4A0]/20 flex items-center justify-center font-bold text-[#C9A4A0] shrink-0 text-sm">
                      {review.userName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{review.userName}</span>
                        <Stars rating={review.rating} />
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${review.source === 'google' ? 'bg-blue-100 text-blue-700' : 'bg-[#C9A4A0]/10 text-[#C9A4A0]'}`}>
                          {review.source === 'google' ? 'Google' : 'App'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{review.comment}</p>
                      <p className="text-xs text-gray-400">{formatDateTime(review.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
