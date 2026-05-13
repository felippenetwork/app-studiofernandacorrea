'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Palette, Scissors, Users, Calendar, CalendarDays, Tag, Gift,
  Bell, Send, Cake, MessageSquare, Star, CreditCard,
  UserCog, ClipboardList, Plug, CalendarClock, BadgeDollarSign, TrendingDown, MessageCircle, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navGroups = [
  {
    label: 'Principal',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Salão',
    items: [
      { label: 'Serviços',       href: '/services',      icon: Scissors },
      { label: 'Profissionais',  href: '/professionals', icon: Users },
      { label: 'Agenda',         href: '/agenda',        icon: CalendarClock },
      { label: 'Agendamentos',   href: '/appointments',  icon: CalendarDays },
      { label: 'Clientes',       href: '/customers',     icon: Users },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { label: 'Cupons',          href: '/coupons',         icon: Tag },
      { label: 'Benefícios',      href: '/benefits',        icon: Gift },
      { label: 'Notificações',    href: '/notifications',   icon: Bell },
      { label: 'Push Campaigns',  href: '/push-campaigns',  icon: Send },
      { label: 'Aniversários',    href: '/birthday',        icon: Cake },
      { label: 'WhatsApp',        href: '/whatsapp',        icon: MessageCircle },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { label: 'Faturamento', href: '/faturamento', icon: BarChart3 },
      { label: 'Feedbacks',   href: '/feedback',    icon: MessageSquare },
      { label: 'Avaliações',  href: '/reviews',     icon: Star },
      { label: 'Pagamentos',  href: '/payments',    icon: CreditCard },
      { label: 'Comissões',   href: '/comissoes',   icon: BadgeDollarSign },
      { label: 'Retenção',    href: '/retencao',    icon: TrendingDown },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Integrações',    href: '/integrations', icon: Plug },
      { label: 'Aparência',      href: '/appearance',   icon: Palette },
      { label: 'Usuários Admin', href: '/users',        icon: UserCog },
      { label: 'Auditoria',      href: '/audit-logs',   icon: ClipboardList },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-sidebar border-r border-sidebar-border">

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-[18px] border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C9A4A0] to-[#b8918d] flex items-center justify-center flex-shrink-0 shadow-sm">
          <Scissors className="w-4 h-4 text-white" />
        </div>
        <div className="overflow-hidden">
          <p className="text-white font-semibold text-[13px] leading-tight tracking-tight truncate">
            Studio Fernanda Correa
          </p>
          <p className="text-sidebar-text text-[11px] mt-0.5 tracking-wide uppercase">Painel Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto px-3 space-y-5">
        {navGroups.map(({ label, items }) => (
          <div key={label}>
            <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-sidebar-section">
              {label}
            </p>
            <div className="space-y-0.5">
              {items.map(({ label: itemLabel, href, icon: Icon }) => {
                const isActive = pathname === href || pathname.startsWith(href + '/');
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-all duration-150 group relative',
                      isActive
                        ? 'bg-white/[0.07] text-sidebar-text-active font-medium'
                        : 'text-sidebar-text hover:bg-white/[0.04] hover:text-sidebar-text-active'
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#C9A4A0]" />
                    )}
                    <Icon className={cn(
                      'w-4 h-4 flex-shrink-0 transition-colors',
                      isActive ? 'text-[#C9A4A0]' : 'text-sidebar-text group-hover:text-sidebar-section'
                    )} />
                    <span className="truncate">{itemLabel}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-sidebar-border">
        <p className="text-sidebar-section text-[11px] text-center tracking-wide">
          Studio Fernanda Correa © 2026
        </p>
      </div>
    </aside>
  );
}
