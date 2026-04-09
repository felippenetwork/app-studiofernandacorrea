import { hasSupabase } from '../../config/env';
import { supabase } from '../../config/supabase';

export type AdminNotificationType =
  | 'new_appointment'
  | 'appointment_cancelled'
  | 'payment_approved'
  | 'payment_pending'
  | 'new_feedback'
  | 'new_customer'
  | 'no_show';

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}

// In-memory store for mock mode
const mockNotifications: AdminNotification[] = [
  {
    id: 'an-1',
    type: 'new_appointment',
    title: 'Novo agendamento',
    message: 'Ana Paula agendou Coloração para 10/04 às 10:00.',
    entityType: 'appointment',
    entityId: 'apt-1',
    isRead: false,
    createdAt: new Date(Date.now() - 600_000).toISOString(),
  },
  {
    id: 'an-2',
    type: 'payment_approved',
    title: 'Pagamento aprovado',
    message: 'Taxa de reserva de R$40,00 aprovada via Pix.',
    entityType: 'payment',
    entityId: 'pay-1',
    isRead: false,
    createdAt: new Date(Date.now() - 1_800_000).toISOString(),
  },
  {
    id: 'an-3',
    type: 'new_customer',
    title: 'Nova cliente',
    message: 'Carla Santos criou uma conta no app.',
    entityType: 'user',
    entityId: 'user-2',
    isRead: true,
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
  },
];

export const adminNotificationsService = {
  async create(data: Omit<AdminNotification, 'id' | 'isRead' | 'createdAt'>): Promise<void> {
    if (!hasSupabase) {
      mockNotifications.unshift({
        ...data,
        id: `an-${Date.now()}`,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      return;
    }

    await supabase.from('admin_notifications').insert({
      type: data.type,
      title: data.title,
      message: data.message,
      entity_type: data.entityType ?? null,
      entity_id: data.entityId ?? null,
      is_read: false,
    });
  },

  async list(limit = 50): Promise<AdminNotification[]> {
    if (!hasSupabase) {
      return mockNotifications.slice(0, limit);
    }

    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data ?? []).map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      entityType: n.entity_type ?? undefined,
      entityId: n.entity_id ?? undefined,
      isRead: n.is_read,
      createdAt: n.created_at,
    }));
  },

  async countUnread(): Promise<number> {
    if (!hasSupabase) {
      return mockNotifications.filter((n) => !n.isRead).length;
    }

    const { count } = await supabase
      .from('admin_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    return count ?? 0;
  },

  async markRead(id: string): Promise<void> {
    if (!hasSupabase) {
      const n = mockNotifications.find((n) => n.id === id);
      if (n) n.isRead = true;
      return;
    }
    await supabase.from('admin_notifications').update({ is_read: true }).eq('id', id);
  },

  async markAllRead(): Promise<void> {
    if (!hasSupabase) {
      mockNotifications.forEach((n) => { n.isRead = true; });
      return;
    }
    await supabase.from('admin_notifications').update({ is_read: true }).eq('is_read', false);
  },
};
