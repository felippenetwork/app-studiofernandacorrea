'use client';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { formatRelative } from '@/lib/formatters';
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

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markRead, markAllRead } = useAdminNotifications();

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-0.5 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Notificações</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500">{unreadCount} não lida{unreadCount !== 1 ? 's' : ''}</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead()}
                className="flex items-center gap-1 text-xs text-[#C9A4A0] hover:text-[#b8918d] font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.slice(0, 15).map((n: AdminNotification) => (
                <NotificationItem key={n.id} notification={n} onRead={() => markRead(n.id)} />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <a href="/notifications" className="text-xs text-[#C9A4A0] hover:text-[#b8918d] font-medium block text-center" onClick={() => setOpen(false)}>
              Ver todas as notificações →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({ notification: n, onRead }: { notification: AdminNotification; onRead: () => void }) {
  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer group transition-colors',
        !n.isRead && 'bg-blue-50/40'
      )}
      onClick={onRead}
    >
      <span className="text-lg flex-shrink-0 mt-0.5">{typeIcon[n.type] ?? '🔔'}</span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-tight', n.isRead ? 'text-gray-700' : 'text-gray-900 font-medium')}>
          {n.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
        <p className="text-xs text-gray-400 mt-1">{formatRelative(n.createdAt)}</p>
      </div>
      {!n.isRead && (
        <div className="flex-shrink-0 mt-1.5">
          <div className="w-2 h-2 rounded-full bg-[#C9A4A0]" />
        </div>
      )}
    </div>
  );
}
