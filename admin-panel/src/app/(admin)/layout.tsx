'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminHeader } from '@/components/layout/AdminHeader';
import { useAdminAuthStore } from '@/store/adminAuthStore';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-6 h-6 border-2 border-[#C9A4A0] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function IdleWarning({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Sessão prestes a expirar</h3>
        <p className="text-sm text-gray-500 mb-6">
          Você está inativo há quase 3 horas. Deseja continuar logado?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onLeave}
            className="flex-1 h-10 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Sair agora
          </button>
          <button
            onClick={onStay}
            className="flex-1 h-10 bg-[#C9A4A0] hover:bg-[#b8918d] text-white rounded-lg text-sm font-medium transition-colors"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout } = useAdminAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  const { showWarning, resetTimer } = useIdleTimeout(handleLogout);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) router.replace('/login');
  }, [mounted, isAuthenticated, router]);

  if (!mounted || !isAuthenticated) return <Spinner />;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {showWarning && (
        <IdleWarning
          onStay={resetTimer}
          onLeave={handleLogout}
        />
      )}
      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
