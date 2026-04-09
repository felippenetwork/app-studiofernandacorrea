'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Search, Crown, Ban, X, ChevronRight, Loader2, Users, Cake } from 'lucide-react';
import Link from 'next/link';
import { customersApi } from '@/lib/api';
import { Customer, Paginated } from '@/types';
import { formatDate, formatRelative } from '@/lib/formatters';
import { getErrorMessage } from '@/lib/utils';

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<Paginated<Customer>>({
    queryKey: ['admin-customers', search, page],
    queryFn: () => customersApi.list({ search, page, limit: 20 }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => customersApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-customers'] }); setEditing(null); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const customers = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  function toggleVip(c: Customer) { updateMutation.mutate({ id: c.id, data: { isVip: !c.isVip } }); }
  function toggleBlock(c: Customer) { updateMutation.mutate({ id: c.id, data: { isBlocked: !c.isBlocked } }); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Clientes ({total})</h2>
          <p className="text-sm text-gray-500">Gerencie a base de clientes.</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Buscar por nome ou e-mail…"
          className="w-full pl-9 pr-3 h-9 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0] mx-auto" /></div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhuma cliente encontrada.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Aniversário</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cadastro</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#C9A4A0]/20 flex items-center justify-center text-xs font-bold text-[#C9A4A0]">{c.name.charAt(0)}</div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-900">{c.name}</span>
                          {c.isVip && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                        <p className="text-xs text-gray-400">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-600">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3.5 text-gray-600">
                    {c.birthDate ? (
                      <span className="flex items-center gap-1">
                        <Cake className="w-3.5 h-3.5 text-pink-400" />
                        {formatDate(c.birthDate)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 text-xs">{formatRelative(c.createdAt)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {c.isBlocked && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">Bloqueada</span>}
                      {!c.acceptsMarketing && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">Sem mkt</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => toggleVip(c)} title={c.isVip ? 'Remover VIP' : 'Marcar VIP'} className={`p-1.5 rounded hover:bg-amber-50 ${c.isVip ? 'text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}>
                        <Crown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggleBlock(c)} title={c.isBlocked ? 'Desbloquear' : 'Bloquear'} className={`p-1.5 rounded hover:bg-red-50 ${c.isBlocked ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}>
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                      <Link href={`/customers/${c.id}`} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/60">
            <p className="text-xs text-gray-500">{total} clientes</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 px-3 border border-gray-200 rounded text-xs disabled:opacity-40 hover:bg-gray-100">← Anterior</button>
              <span className="h-7 px-3 flex items-center text-xs text-gray-600">{page}/{totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-7 px-3 border border-gray-200 rounded text-xs disabled:opacity-40 hover:bg-gray-100">Próxima →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
