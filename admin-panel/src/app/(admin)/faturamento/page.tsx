'use client';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign, CalendarDays, TrendingUp, Loader2,
  Scissors, User, ChevronDown,
} from 'lucide-react';
import { faturamentoApi } from '@/lib/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10); }

function monthStart(offsetMonths = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  return d.toISOString().slice(0, 10);
}

function yearStart() {
  return `${new Date().getFullYear()}-01-01`;
}

function fmtCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(s: string) {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

const PRESETS = [
  { label: 'Este mês',     from: () => monthStart(0),  to: () => todayStr() },
  { label: 'Mês passado',  from: () => monthStart(-1), to: () => { const d = new Date(); d.setDate(0); return d.toISOString().slice(0, 10); } },
  { label: 'Últimos 90 d', from: () => { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().slice(0, 10); }, to: () => todayStr() },
  { label: 'Este ano',     from: () => yearStart(),    to: () => todayStr() },
];

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Breakdown table ──────────────────────────────────────────────────────────

function BreakdownTable({ title, icon: Icon, rows, totalRevenue }: {
  title: string;
  icon: React.ElementType;
  rows: { name: string; count: number; revenue: number }[];
  totalRevenue: number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <Icon className="w-4 h-4 text-[#C9A4A0]" />
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 p-5 text-center">Nenhum dado.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/60">
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">Nome</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Atend.</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Faturamento</th>
              <th className="text-right px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((r) => {
              const pct = totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0;
              return (
                <tr key={r.name} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-gray-800 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-gray-600 text-right">{r.count}</td>
                  <td className="px-4 py-3 text-gray-800 font-semibold text-right">{fmtCurrency(r.revenue)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-[#C9A4A0]" style={{ width: `${pct.toFixed(1)}%` }} />
                      </div>
                      <span className="text-gray-500 text-xs w-10 text-right">{pct.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FaturamentoPage() {
  const [from, setFrom] = useState(monthStart(0));
  const [to,   setTo]   = useState(todayStr());
  const [activePreset, setActivePreset] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-faturamento', from, to],
    queryFn: () => faturamentoApi.stats(from, to),
    staleTime: 60_000,
  });

  function applyPreset(idx: number) {
    setActivePreset(idx);
    setFrom(PRESETS[idx].from());
    setTo(PRESETS[idx].to());
  }

  const stats = data ?? { totalRevenue: 0, totalAppointments: 0, avgTicket: 0, byService: [], byProfessional: [], byDay: [], appointments: [] };

  const visibleAppts = showAll ? stats.appointments : stats.appointments.slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Faturamento</h2>
        <p className="text-sm text-gray-500">Receita dos atendimentos concluídos no período.</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p, i) => (
          <button
            key={p.label}
            onClick={() => applyPreset(i)}
            className={`h-8 px-3.5 rounded-lg text-sm font-medium transition-colors ${
              activePreset === i
                ? 'bg-[#C9A4A0] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-[#C9A4A0] hover:text-[#C9A4A0]'
            }`}
          >
            {p.label}
          </button>
        ))}

        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1.5 h-8 px-3 border border-gray-200 rounded-lg bg-white">
            <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="date"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setActivePreset(-1); }}
              className="text-sm text-gray-700 focus:outline-none bg-transparent"
            />
          </div>
          <span className="text-gray-400 text-sm">até</span>
          <div className="flex items-center gap-1.5 h-8 px-3 border border-gray-200 rounded-lg bg-white">
            <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="date"
              value={to}
              onChange={(e) => { setTo(e.target.value); setActivePreset(-1); }}
              className="text-sm text-gray-700 focus:outline-none bg-transparent"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0]" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={DollarSign}
              label="Faturamento total"
              value={fmtCurrency(stats.totalRevenue)}
              sub={`de ${fmtDate(from)} a ${fmtDate(to)}`}
              color="bg-[#C9A4A0]"
            />
            <StatCard
              icon={CalendarDays}
              label="Atendimentos concluídos"
              value={String(stats.totalAppointments)}
              color="bg-blue-400"
            />
            <StatCard
              icon={TrendingUp}
              label="Ticket médio"
              value={fmtCurrency(stats.avgTicket)}
              color="bg-emerald-500"
            />
          </div>

          {/* Breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BreakdownTable
              title="Por serviço"
              icon={Scissors}
              rows={stats.byService}
              totalRevenue={stats.totalRevenue}
            />
            <BreakdownTable
              title="Por profissional"
              icon={User}
              rows={stats.byProfessional}
              totalRevenue={stats.totalRevenue}
            />
          </div>

          {/* Appointments table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 text-sm">
                Atendimentos concluídos ({stats.appointments.length})
              </h3>
            </div>

            {stats.appointments.length === 0 ? (
              <div className="p-12 text-center">
                <CalendarDays className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhum atendimento concluído no período.</p>
              </div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Hora</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Serviço</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Profissional</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {visibleAppts.map((a: any) => (
                      <tr key={a.id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-gray-700 font-medium">{fmtDate(a.date)}</td>
                        <td className="px-4 py-3 text-gray-500">{a.time}</td>
                        <td className="px-4 py-3 text-gray-700">{a.clientName}</td>
                        <td className="px-4 py-3 text-gray-600">{a.serviceName}</td>
                        <td className="px-4 py-3 text-gray-600">{a.professionalName}</td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-800">{fmtCurrency(a.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {!showAll && stats.appointments.length > 20 && (
                    <tfoot>
                      <tr className="border-t border-gray-100 bg-gray-50/60">
                        <td colSpan={6} className="px-5 py-3 text-center">
                          <button
                            onClick={() => setShowAll(true)}
                            className="flex items-center gap-1.5 text-sm text-[#C9A4A0] hover:underline mx-auto"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                            Ver todos os {stats.appointments.length} atendimentos
                          </button>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>

                {/* Total footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/60">
                  <span className="text-xs text-gray-500">Total do período</span>
                  <span className="text-sm font-bold text-gray-900">{fmtCurrency(stats.totalRevenue)}</span>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
