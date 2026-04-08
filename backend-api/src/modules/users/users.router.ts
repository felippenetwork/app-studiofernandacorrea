import { Router } from 'express';

export const usersRouter = Router();

// GET /api/users/me
usersRouter.get('/me', (_req, res) => {
  // TODO ETAPA 2: return authenticated user profile
  res.status(501).json({ message: 'Not implemented yet' });
});

// PATCH /api/users/me
usersRouter.patch('/me', (_req, res) => {
  // TODO ETAPA 2: update user profile
  res.status(501).json({ message: 'Not implemented yet' });
});
