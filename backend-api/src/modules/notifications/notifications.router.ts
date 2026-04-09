import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { supabase } from '../../config/supabase';
import { hasSupabase } from '../../config/env';
import { AuthenticatedRequest } from '../../types';

export const notificationsRouter = Router();

notificationsRouter.use(authMiddleware);

const registerTokenSchema = z.object({
  token: z.string().min(10, 'Token inválido'),
  provider: z.enum(['expo', 'fcm', 'apns']).default('expo'),
  platform: z.enum(['ios', 'android']).optional(),
});

// ─── Mock data (used when !hasSupabase) ──────────────────────────────────────

const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-1',
    type: 'agendamento_confirmado',
    title: 'Agendamento confirmado!',
    body: 'Sua Coloração foi confirmada para 15/04 às 10:00.',
    data: {},
    is_read: false,
    created_at: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: 'notif-2',
    type: 'novo_cupom',
    title: 'Novo cupom disponível',
    body: 'Use BOAS_VINDAS e ganhe R$20 no seu próximo agendamento.',
    data: { couponCode: 'BOAS_VINDAS' },
    is_read: true,
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
  },
];

// ─── GET /api/notifications — list user notifications ────────────────────────

notificationsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;

    if (!hasSupabase) {
      res.json({ data: MOCK_NOTIFICATIONS });
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ data: data ?? [] });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// ─── PATCH /api/notifications/:id/read — mark as read ────────────────────────

notificationsRouter.patch('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const { id } = req.params;

    if (!hasSupabase) {
      const notif = MOCK_NOTIFICATIONS.find((n) => n.id === id);
      if (notif) notif.is_read = true;
      res.json({ data: null, message: 'Notificação marcada como lida.' });
      return;
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ data: null, message: 'Notificação marcada como lida.' });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// ─── PATCH /api/notifications/read-all — mark all as read ────────────────────

notificationsRouter.patch('/read-all', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;

    if (!hasSupabase) {
      MOCK_NOTIFICATIONS.forEach((n) => { n.is_read = true; });
      res.json({ data: null, message: 'Todas as notificações marcadas como lidas.' });
      return;
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    res.json({ data: null, message: 'Todas as notificações marcadas como lidas.' });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// ─── POST /api/notifications/register-token ──────────────────────────────────

notificationsRouter.post(
  '/register-token',
  validate(registerTokenSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: userId } = (req as AuthenticatedRequest).user;
      const { token, provider, platform } = req.body;

      if (!hasSupabase) {
        console.log(`[notifications] Push token registered (mock): ${token}`);
        res.json({ data: null, message: 'Token registrado.' });
        return;
      }

      await supabase.from('push_tokens').upsert(
        {
          user_id: userId,
          token,
          provider,
          platform: platform ?? null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,token' }
      );

      res.json({ data: null, message: 'Token de notificação registrado.' });
    } catch (err) {
      res.status(500).json({ error: 'InternalError', message: (err as Error).message });
    }
  }
);

// ─── DELETE /api/notifications/register-token — deactivate on logout ─────────

notificationsRouter.delete('/register-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const { token } = req.body as { token?: string };

    if (hasSupabase && token) {
      await supabase
        .from('push_tokens')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('token', token);
    }

    res.json({ data: null, message: 'Token desativado.' });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});
