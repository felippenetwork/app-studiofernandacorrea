'use client';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { formatRelative } from '@/lib/formatters';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdminNotification } from '@/types';

const typeIcon: Record<string, string> = {
  new_appointment: '📅',
  appointment_cancelled: '❌',
  payment_approved: '✅',
  payment_pending: '⏳',
  new_feedback: '💬',
  new_customer: '👤',
  no_show: '⚠️',
};

const typeLabel: Record<string, string> = {
  new_appointment: 'Novo Agendamento',
  appointment_cancelled: 'Cancelamento',
  payment_approved: 'Pagamento Aprovado',
  payment_pending: 'Pagamento Pendente',
  new_feedback: 'Novo Feedback',
  new_customer: 'Nova Cliente',
  no_show: 'No-Show',
};

export default function NotificationsPage() {
  const { notifications, unreadCount, isLoading, markRead, markAllRead } = useAdminNotifications();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Central de Notificações</h2>
          <p className="text-sm text-gray-500">
            {unreadCount > 0 ? `${unreadCount} não lida${unreadCount !== 1 ? 's' : ''}` : 'Tudo lido!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllRead()}
            className="flex items-center gap-2 text-sm text-[#C9A4A0] hover:text-[#b8918d] font-medium"
          >
            <CheckCheck className="w-4 h-4" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-[#C9A4A0] mx-auto" /></div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Nenhuma notificação.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((n: AdminNotification) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                className={cn(
                  'flex gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors',
                  !n.isRead && 'bg-blue-50/30'
                )}
              >
                <span className="text-2xl flex-shrink-0 mt-0.5">{typeIcon[n.type] ?? '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#C9A4A0] uppercase tracking-wider">{typeLabel[n.type] ?? n.type}</span>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-[#C9A4A0] flex-shrink-0" />}
                      </div>
                      <p className={cn('text-sm mt-0.5', n.isRead ? 'text-gray-700' : 'text-gray-900 font-medium')}>{n.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{formatRelative(n.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
