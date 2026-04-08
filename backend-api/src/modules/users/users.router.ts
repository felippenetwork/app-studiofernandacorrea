import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { usersRepository } from './users.repository';
import { AuthenticatedRequest } from '../../types';
import { Request, Response } from 'express';

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

const updateSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z.string().min(10).optional(),
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
