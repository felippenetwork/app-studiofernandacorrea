'use client';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar, CreditCard, Users, Tag, TrendingUp, Clock, ChevronRight, Cake
} from 'lucide-react';
import Link from 'next/link';
import { dashboardApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { DashboardStats, Appointment } from '@/types';

function StatCard({ title, value, icon: Icon, color, href }: {
  title: string; value: string | number; icon: any; color: string; href?: string;
}) {
  const content = (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {href && <p className="text-xs text-[#C9A4A0] mt-3 flex items-center gap-1">Ver detalhes <ChevronRight className="w-3 h-3" /></p>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function AppointmentRow({ a }: { a: Appointment }) {
  const statusColor: Record<string, string> = {
    confirmado: 'bg-green-100 text-green-700',
    pendente_pagamento: 'bg-yellow-100 text-yellow-700',
    cancelado: 'bg-red-100 text-red-700',
    concluido: 'bg-gray-100 text-gray-600',
    nao_compareceu: 'bg-orange-100 text-orange-700',
  };
  const status = a.status ?? 'pendente_pagamento';
  const date = a.appointmentDate ?? a.appointment_date ?? '';
  const time = a.appointmentTime ?? a.appointment_time ?? '';
  const userName = (a.user as any)?.name ?? 'Cliente';

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#C9A4A0]/20 flex items-center justify-center text-xs font-bold text-[#C9A4A0]">
          {userName.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{userName}</p>
          <p className="text-xs text-gray-400">{formatDate(date)} às {time}</p>
        </div>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[status] ?? 'bg-gray-100 text-gray-600'}`}>
        {status.replace('_', ' ')}
      </span>
    </div>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.stats,
    refetchInterval: 60_000,
  });

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Visão Geral</h2>
          <p className="text-sm text-gray-500 capitalize">{today}</p>
        </div>
        {stats?.birthdaysToday && stats.birthdaysToday.length > 0 && (
          <div className="flex items-center gap-2 bg-pink-50 border border-pink-200 rounded-lg px-3 py-2">
            <Cake className="w-4 h-4 text-pink-500" />
            <span className="text-sm text-pink-700 font-medium">
              🎂 {stats.birthdaysToday.length} aniversariante{stats.birthdaysToday.length !== 1 ? 's' : ''} hoje
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Agendamentos hoje"
          value={isLoading ? '—' : stats?.totalAppointmentsToday ?? 0}
          icon={Calendar} color="bg-[#C9A4A0]"
          href="/appointments"
        />
        <StatCard
          title="Pagamentos pendentes"
          value={isLoading ? '—' : stats?.pendingPayments ?? 0}
          icon={CreditCard} color="bg-amber-400"
          href="/payments"
        />
        <StatCard
          title="Total de clientes"
          value={isLoading ? '—' : stats?.totalCustomers ?? 0}
          icon={Users} color="bg-indigo-400"
          href="/customers"
        />
        <StatCard
          title="Cupons ativos"
          value={isLoading ? '—' : stats?.activeCoupons ?? 0}
          icon={Tag} color="bg-emerald-400"
          href="/coupons"
        />
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Agendamentos no mês"
          value={isLoading ? '—' : stats?.totalAppointmentsMonth ?? 0}
          icon={TrendingUp} color="bg-violet-400"
        />
        <StatCard
          title="Pagamentos aprovados"
          value={isLoading ? '—' : stats?.approvedPayments ?? 0}
          icon={CreditCard} color="bg-green-500"
        />
        <StatCard
          title="Receita do mês"
          value={isLoading ? '—' : formatCurrency(stats?.revenueMonth ?? 0)}
          icon={TrendingUp} color="bg-[#C9A87C]"
        />
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Upcoming today */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C9A4A0]" />
              <h3 className="font-semibold text-gray-900 text-sm">Próximos agendamentos</h3>
            </div>
            <Link href="/schedule" className="text-xs text-[#C9A4A0] hover:text-[#b8918d]">Ver agenda →</Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : !stats?.upcomingToday?.length ? (
            <div className="py-8 text-center">
              <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhum agendamento hoje</p>
            </div>
          ) : (
            stats.upcomingToday.map((a: Appointment) => <AppointmentRow key={a.id} a={a} />)
          )}
        </div>

        {/* Birthdays + Quick links */}
        <div className="space-y-4">
          {/* Birthdays today */}
          {stats?.birthdaysToday && stats.birthdaysToday.length > 0 && (
            <div className="bg-pink-50 border border-pink-100 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Cake className="w-4 h-4 text-pink-500" />
                <h3 className="font-semibold text-pink-800 text-sm">Aniversariantes de hoje</h3>
              </div>
              <div className="space-y-2">
                {stats.birthdaysToday.map((b) => (
                  <div key={b.id} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-pink-200 flex items-center justify-center text-xs font-bold text-pink-700">{b.name.charAt(0)}</div>
                    <span className="text-sm text-pink-800">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-4">Ações rápidas</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Novo cupom',      href: '/coupons',       icon: Tag },
                { label: 'Ver clientes',    href: '/customers',     icon: Users },
                { label: 'Push campaign',   href: '/push-campaigns', icon: TrendingUp },
                { label: 'Aniversários',    href: '/birthday',      icon: Cake },
              ].map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 hover:border-[#C9A4A0]/40 transition-colors text-sm text-gray-700"
                >
                  <Icon className="w-4 h-4 text-[#C9A4A0]" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
