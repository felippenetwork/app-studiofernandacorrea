'use client';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { NotificationsBell } from './NotificationsBell';
import { useAdminAuthStore } from '@/store/adminAuthStore';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/appearance':   'Aparência & Branding',
  '/services':     'Serviços',
  '/professionals':'Profissionais',
  '/appointments': 'Agendamentos',
  '/schedule':     'Configurações de Agenda',
  '/customers':    'Clientes',
  '/coupons':      'Cupons',
  '/benefits':     'Benefícios & Campanhas',
  '/notifications':'Notificações',
  '/push-campaigns':'Push Campaigns',
  '/birthday':     'Automação de Aniversário',
  '/feedback':     'Feedbacks',
  '/reviews':      'Avaliações',
  '/payments':     'Pagamentos',
  '/integrations': 'Integrações',
  '/users':        'Usuários Admin',
  '/audit-logs':   'Auditoria',
};

function getInitials(name?: string) {
  if (!name) return 'A';
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAdminAuthStore();

  const title =
    PAGE_TITLES[pathname] ??
    PAGE_TITLES[Object.keys(PAGE_TITLES).find((k) => pathname.startsWith(k + '/')) ?? ''] ??
    'Admin';

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const roleLabel: Record<string, string> = {
    owner:      'Proprietária',
    gerente:    'Gerente',
    recepcao:   'Recepção',
    marketing:  'Marketing',
    financeiro: 'Financeiro',
  };

  return (
    <header className="h-14 bg-white border-b border-gray-100 shadow-[0_1px_4px_0_rgba(0,0,0,0.04)] flex items-center justify-between px-6 sticky top-0 z-40">

      {/* Page title */}
      <div className="flex items-center gap-3">
        <h1 className="font-semibold text-gray-900 text-[15px] tracking-tight">{title}</h1>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <NotificationsBell />

        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Avatar + info */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A4A0] to-[#b8918d] flex items-center justify-center shadow-sm">
            <span className="text-white text-[11px] font-bold leading-none">
              {getInitials(user?.name)}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-[13px] font-semibold text-gray-900 leading-tight">{user?.name ?? 'Admin'}</p>
            <p className="text-[11px] text-gray-400 leading-tight">
              {roleLabel[user?.role ?? ''] ?? user?.role ?? ''}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Sair"
          className="ml-1 p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
