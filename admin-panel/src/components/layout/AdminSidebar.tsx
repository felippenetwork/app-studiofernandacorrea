'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Palette, Scissors, Users, Calendar, Tag, Gift,
  Bell, Send, Cake, MessageSquare, Star, CreditCard, Settings2,
  UserCog, ClipboardList, Plug, Scissors as ScissorsIcon, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard',        href: '/dashboard',        icon: LayoutDashboard },
  { label: 'Aparência',         href: '/appearance',       icon: Palette },
  { label: 'Serviços',          href: '/services',         icon: Scissors },
  { label: 'Profissionais',     href: '/professionals',    icon: Users },
  { label: 'Agenda',            href: '/schedule',         icon: Calendar },
  { label: 'Clientes',          href: '/customers',        icon: Users },
  { label: 'Cupons',            href: '/coupons',          icon: Tag },
  { label: 'Benefícios',        href: '/benefits',         icon: Gift },
  { label: 'Notificações',      href: '/notifications',    icon: Bell },
  { label: 'Push Campaigns',    href: '/push-campaigns',   icon: Send },
  { label: 'Aniversários',      href: '/birthday',         icon: Cake },
  { label: 'Feedbacks',         href: '/feedback',         icon: MessageSquare },
  { label: 'Avaliações',        href: '/reviews',          icon: Star },
  { label: 'Pagamentos',        href: '/payments',         icon: CreditCard },
  { label: 'Integrações',       href: '/integrations',     icon: Plug },
  { label: 'Usuários Admin',    href: '/users',            icon: UserCog },
  { label: 'Auditoria',         href: '/audit-logs',       icon: ClipboardList },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-xl bg-[#C9A4A0]/20 flex items-center justify-center flex-shrink-0">
          <ScissorsIcon className="w-5 h-5 text-[#C9A4A0]" />
        </div>
        <div className="overflow-hidden">
          <p className="text-white font-semibold text-sm leading-tight truncate">Studio Fernanda</p>
          <p className="text-sidebar-text text-xs">Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 mx-2 px-3 py-2 rounded-lg text-sm transition-colors group',
                isActive
                  ? 'bg-sidebar-active text-sidebar-text-active font-medium'
                  : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate">{label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-sidebar-border">
        <p className="text-sidebar-text text-xs text-center">v5.0.0 — ETAPA 5</p>
      </div>
    </aside>
  );
}
