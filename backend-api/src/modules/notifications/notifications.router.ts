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

// POST /api/notifications/register-token
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

// DELETE /api/notifications/register-token — deactivate token on logout
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
