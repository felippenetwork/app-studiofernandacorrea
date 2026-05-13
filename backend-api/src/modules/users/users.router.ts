import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { usersRepository } from './users.repository';
import { AuthenticatedRequest } from '../../types';
import { Request, Response } from 'express';
import { loyaltyService } from '../loyalty/loyalty.service';
import { hasSupabase } from '../../config/env';
import { supabase } from '../../config/supabase';

export const usersRouter = Router();

usersRouter.use(authMiddleware);

// GET /api/users/me
usersRouter.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = (req as AuthenticatedRequest).user;
    const user = await usersRepository.findById(id);
    if (!user) {
      // Return token payload if DB not available
      res.json({ data: (req as AuthenticatedRequest).user });
      return;
    }
    res.json({ data: user });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao buscar perfil.';
    res.status(500).json({ error: 'InternalError', message });
  }
});

// GET /api/users/loyalty
usersRouter.get('/loyalty', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const settings = await loyaltyService.getSettings();

    if (!settings.isActive && !settings.visitRewardActive) {
      res.json({ data: null });
      return;
    }

    let balance = 0;
    let lifetimePoints = 0;
    let visitCount = 0;

    if (hasSupabase) {
      const { data: txs } = await supabase
        .from('loyalty_points')
        .select('points')
        .eq('user_id', userId);

      for (const t of txs ?? []) {
        const p = Number(t.points);
        balance += p;
        if (p > 0) lifetimePoints += p;
      }

      const { count } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'concluido');

      visitCount = count ?? 0;
    }

    const tier = lifetimePoints >= settings.goldThreshold
      ? 'ouro'
      : lifetimePoints >= settings.silverThreshold
      ? 'prata'
      : 'bronze';

    const nextTierPoints = tier === 'bronze'
      ? settings.silverThreshold
      : tier === 'prata'
      ? settings.goldThreshold
      : null;

    res.json({
      data: {
        pointsActive:             settings.isActive,
        visitRewardActive:        settings.visitRewardActive,
        tier,
        balance,
        lifetimePoints,
        redemptionThreshold:      settings.redemptionThreshold,
        nextTierPoints,
        visitCount,
        visitRewardCount:         settings.visitRewardCount,
        visitRewardDiscountType:  settings.visitRewardDiscountType,
        visitRewardDiscountValue: settings.visitRewardDiscountValue,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

const updateSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z.string().min(10).optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use YYYY-MM-DD)').optional().nullable(),
  accepts_marketing: z.boolean().optional(),
  accepts_push: z.boolean().optional(),
});

// PATCH /api/users/me
usersRouter.patch('/me', validate(updateSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = (req as AuthenticatedRequest).user;
    const updated = await usersRepository.update(id, req.body);
    res.json({ data: updated, message: 'Perfil atualizado.' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao atualizar.';
    res.status(500).json({ error: 'InternalError', message });
  }
});
