'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Crown, Ban, ChevronRight, Loader2, Users, Cake, UserPlus, X } from 'lucide-react';
import Link from 'next/link';
import { customersApi } from '@/lib/api';
import { Customer, Paginated } from '@/types';
import { formatDate, formatRelative } from '@/lib/formatters';
import { getErrorMessage } from '@/lib/utils';

interface NewCustomerForm {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  acceptsMarketing: boolean;
}

function NewCustomerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<NewCustomerForm>({ name: '', email: '', phone: '', birthDate: '', acceptsMarketing: false });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => customersApi.create({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      birthDate: form.birthDate || undefined,
      acceptsMarketing: form.acceptsMarketing,
      acceptsPush: false,
    }),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  function set(field: keyof NewCustomerForm, value: string | boolean) {
    setForm((p) => ({ ...p, [field]: value }));
    setError(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Nova Cliente</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Nome completo *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Ana Paula Santos"
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">E-mail *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="ana@email.com"
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Telefone</label>
              <input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="(11) 99999-0000"
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Aniversário</label>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => set('birthDate', e.target.value)}
                className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A4A0]"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.acceptsMarketing}
              onChange={(e) => set('acceptsMarketing', e.target.checked)}
              className="w-4 h-4 accent-[#C9A4A0]"
            />
            <span className="text-sm text-gray-600">Aceita receber promoções por e-mail</span>
          </label>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 h-9 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name.trim() || !form.email.trim()}
            className="flex-1 h-9 bg-[#C9A4A0] hover:bg-[#b8918d] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Cadastrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery<Paginated<Customer>>({
    queryKey: ['admin-customers', search, page],
    queryFn: () => customersApi.list({ search, page, limit: 20 }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => customersApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-customers'] }); },
    onError: (e) => setError(getErrorMessage(e)),
  });

  const customers = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  function toggleVip(c: Customer) { updateMutation.mutate({ id: c.id, data: { isVip: !c.isVip } }); }
  function toggleBlock(c: Customer) { updateMutation.mutate({ id: c.id, data: { isBlocked: !c.isBlocked } }); }

  return (
    <div className="space-y-6">
      {showNew && (
        <NewCustomerModal
          onClose={() => setShowNew(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-customers'] })}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Clientes ({total})</h2>
          <p className="text-sm text-gray-500">Gerencie a base de clientes.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 h-9 px-4 bg-[#C9A4A0] hover:bg-[#b8918d] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Nova Cliente
        </button>
      </div>

      {error && (
        <div className="px-4 py-2.5 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600">{error}</div>
      )}

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
