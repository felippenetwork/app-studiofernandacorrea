'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Clock, AlertTriangle, TrendingDown, Search, Phone, Mail } from 'lucide-react';
import { customersApi, RetentionClient } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ─── Faixas de ausência ────────────────────────────────────────────────────────
type Faixa = 'todos' | '30' | '60' | '90';

const FAIXAS: { key: Faixa; label: string; min: number; color: string; bg: string; text: string; icon: any }[] = [
  { key: 'todos', label: 'Todos',     min: 0,  color: 'border-gray-200',    bg: 'bg-gray-50',     text: 'text-gray-600',   icon: Users },
  { key: '30',    label: '30+ dias',  min: 30, color: 'border-amber-200',   bg: 'bg-amber-50',    text: 'text-amber-700',  icon: Clock },
  { key: '60',    label: '60+ dias',  min: 60, color: 'border-orange-200',  bg: 'bg-orange-50',   text: 'text-orange-700', icon: AlertTriangle },
  { key: '90',    label: '90+ dias',  min: 90, color: 'border-red-200',     bg: 'bg-red-50',      text: 'text-red-700',    icon: TrendingDown },
];

function getDaysBadge(days: number) {
  if (days < 30)  return { label: `${days}d`,  bg: 'bg-emerald-100 text-emerald-700' };
  if (days < 60)  return { label: `${days}d`,  bg: 'bg-amber-100 text-amber-700' };
  if (days < 90)  return { label: `${days}d`,  bg: 'bg-orange-100 text-orange-700' };
  return           { label: `${days}d`,         bg: 'bg-red-100 text-red-700' };
}

function getAvatarColor(days: number) {
  if (days < 30)  return 'from-emerald-400 to-emerald-500';
  if (days < 60)  return 'from-amber-400 to-amber-500';
  if (days < 90)  return 'from-orange-400 to-orange-500';
  return           'from-red-400 to-red-500';
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function RetencaoPage() {
  const [faixa, setFaixa]   = useState<Faixa>('todos');
  const [search, setSearch] = useState('');

  const { data: all = [], isLoading } = useQuery<RetentionClient[]>({
    queryKey: ['retention'],
    queryFn: () => customersApi.retention(0),
    staleTime: 5 * 60_000,
  });

  // Counts per faixa
  const count30 = all.filter(c => c.daysAway >= 30).length;
  const count60 = all.filter(c => c.daysAway >= 60).length;
  const count90 = all.filter(c => c.daysAway >= 90).length;
  const counts: Record<Faixa, number> = {
    todos: all.length,
    '30':  count30,
    '60':  count60,
    '90':  count90,
  };

  const minDays = FAIXAS.find(f => f.key === faixa)!.min;
  const filtered = all
    .filter(c => c.daysAway >= minDays)
    .filter(c => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q)
        || c.email.toLowerCase().includes(q)
        || (c.phone ?? '').includes(q);
    });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Retenção de Clientes</h1>
        <p className="text-sm text-gray-500 mt-1">Clientes com base no tempo desde o último atendimento concluído</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {FAIXAS.map(({ key, label, color, bg, text, icon: Icon }) => {
          const active = faixa === key;
          return (
            <button key={key} onClick={() => setFaixa(key)}
              className={cn(
                'rounded-xl border-2 p-4 text-left transition-all',
                active ? cn(color, bg) : 'border-gray-100 bg-white hover:border-gray-200',
              )}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn('w-4 h-4', active ? text : 'text-gray-400')} />
                <span className={cn('text-xs font-semibold uppercase tracking-wide', active ? text : 'text-gray-500')}>
                  {label}
                </span>
              </div>
              <p className={cn('text-2xl font-bold', active ? text : 'text-gray-800')}>
                {isLoading ? '—' : counts[key]}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {key === 'todos' ? 'clientes com visita' : 'sem retornar'}
              </p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone…"
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#C9A4A0]/60 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm gap-2">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-[#C9A4A0] rounded-full animate-spin" />
            Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Users className="w-8 h-8 mb-2" />
            <p className="text-sm">Nenhum cliente encontrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Contato</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Última visita</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Ausente há</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Visitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((client) => {
                const badge  = getDaysBadge(client.daysAway);
                const avatar = getAvatarColor(client.daysAway);
                return (
                  <tr key={client.userId} className="hover:bg-gray-50/60 transition-colors">
                    {/* Cliente */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0',
                          avatar,
                        )}>
                          <span className="text-white text-xs font-bold">{initials(client.name)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{client.name}</p>
                          <p className="text-xs text-gray-400 md:hidden">{client.phone ?? client.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Contato */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {client.email && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Mail className="w-3 h-3 text-gray-400" />
                            {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {client.phone}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Última visita */}
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-gray-700">{formatDate(client.lastVisit)}</p>
                    </td>

                    {/* Ausente há */}
                    <td className="px-4 py-3.5 text-center">
                      <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-semibold', badge.bg)}>
                        {client.daysAway === 1 ? '1 dia' : `${client.daysAway} dias`}
                      </span>
                    </td>

                    {/* Total visitas */}
                    <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                      <span className="text-sm font-medium text-gray-700">{client.totalVisits}</span>
                      <span className="text-xs text-gray-400 ml-0.5">visit.</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Footer count */}
        {!isLoading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50">
            <p className="text-xs text-gray-400">
              {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
