'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Loader2 } from 'lucide-react';
import { paymentsAdminApi } from '@/lib/api';
import { Payment } from '@/types';
import { formatCurrency, formatRelative } from '@/lib/formatters';

const statusBadge: Record<string, string> = {
  aprovado: 'bg-green-100 text-green-700',
  pendente: 'bg-yellow-100 text-yellow-700',
  recusado: 'bg-red-100 text-red-600',
  reembolsado: 'bg-gray-100 text-gray-600',
};

const methodLabel: Record<string, string> = { pix: 'Pix', credit_card: 'Cartão de Crédito', debit_card: 'Cartão de Débito' };

export default function PaymentsPage() {
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-payments', status],
    queryFn: () => paymentsAdminApi.list({ status: status || undefined }),
  });

  const payments: Payment[] = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Pagamentos ({total})</h2>
          <p className="text-sm text-gray-500">Histórico e status de pagamentos.</p>
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]">
          <option value="">Todos os status</option>
          <option value="aprovado">Aprovado</option>
          <option value="pendente">Pendente</option>
          <option value="recusado">Recusado</option>
          <option value="reembolsado">Reembolsado</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0] mx-auto" /></div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center"><CreditCard className="w-8 h-8 text-gray-200 mx-auto mb-2" /><p className="text-sm text-gray-400">Nenhum pagamento.</p></div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Método</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{p.userName ?? '—'}</td>
                  <td className="px-4 py-3.5 text-gray-900 font-medium">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3.5 text-gray-600">{p.method ? methodLabel[p.method] ?? p.method : '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[p.status]}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 text-xs">{formatRelative(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
