'use client';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { NotificationsBell } from './NotificationsBell';
import { useAdminAuthStore } from '@/store/adminAuthStore';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/appearance': 'Aparência & Branding',
  '/services': 'Serviços',
  '/professionals': 'Profissionais',
  '/schedule': 'Configurações de Agenda',
  '/customers': 'Clientes',
  '/coupons': 'Cupons',
  '/benefits': 'Benefícios & Campanhas',
  '/notifications': 'Notificações',
  '/push-campaigns': 'Push Campaigns',
  '/birthday': 'Automação de Aniversário',
  '/feedback': 'Feedbacks',
  '/reviews': 'Avaliações',
  '/payments': 'Pagamentos',
  '/integrations': 'Integrações',
  '/users': 'Usuários Admin',
  '/audit-logs': 'Auditoria',
};

export function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAdminAuthStore();

  const title = PAGE_TITLES[pathname] ?? PAGE_TITLES[Object.keys(PAGE_TITLES).find((k) => pathname.startsWith(k + '/')) ?? ''] ?? 'Admin';

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-40">
      <h1 className="font-semibold text-gray-800 text-lg">{title}</h1>

      <div className="flex items-center gap-3">
        <NotificationsBell />

        {/* User menu */}
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-[#C9A4A0]/20 flex items-center justify-center">
            <User className="w-4 h-4 text-[#C9A4A0]" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">{user?.name ?? 'Admin'}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role ?? ''}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            className="ml-2 p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
