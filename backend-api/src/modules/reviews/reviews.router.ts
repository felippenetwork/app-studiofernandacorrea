import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { supabase } from '../../config/supabase';
import { hasSupabase } from '../../config/env';
import { AuthenticatedRequest } from '../../types';

export const reviewsRouter = Router();

reviewsRouter.use(authMiddleware);

const createReviewSchema = z.object({
  appointmentId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

// POST /api/reviews
reviewsRouter.post('/', validate(createReviewSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const { appointmentId, rating, comment } = req.body as z.infer<typeof createReviewSchema>;

    if (!hasSupabase) {
      res.status(201).json({ data: { id: `rev-mock-${Date.now()}`, rating, comment }, message: 'Avaliação registrada!' });
      return;
    }

    // Verify appointment belongs to this user and is concluido
    const { data: appt } = await supabase
      .from('appointments')
      .select('id, professional_id, status')
      .eq('id', appointmentId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!appt) {
      res.status(404).json({ error: 'NotFound', message: 'Agendamento não encontrado.' });
      return;
    }
    if (appt.status !== 'concluido') {
      res.status(400).json({ error: 'InvalidState', message: 'Só é possível avaliar agendamentos concluídos.' });
      return;
    }

    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        appointment_id: appointmentId,
        user_id: userId,
        professional_id: appt.professional_id,
        rating,
        comment: comment ?? null,
      })
      .select('id, rating, comment, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        res.status(400).json({ error: 'AlreadyReviewed', message: 'Você já avaliou este atendimento.' });
        return;
      }
      throw error;
    }

    // Update professional's average rating
    supabase.rpc('update_professional_rating', { p_id: appt.professional_id }).catch(() => {});

    res.status(201).json({ data: review, message: 'Avaliação registrada! Obrigada pelo feedback.' });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// GET /api/reviews/appointment/:appointmentId
reviewsRouter.get('/appointment/:appointmentId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;

    if (!hasSupabase) {
      res.json({ data: null });
      return;
    }

    const { data } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at')
      .eq('appointment_id', req.params.appointmentId)
      .eq('user_id', userId)
      .maybeSingle();

    res.json({ data: data ?? null });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});
