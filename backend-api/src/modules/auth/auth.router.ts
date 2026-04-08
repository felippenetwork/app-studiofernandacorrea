import { Router } from 'express';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', (_req, res) => {
  // TODO ETAPA 2: implement registration
  res.status(501).json({ message: 'Not implemented yet' });
});

// POST /api/auth/login
authRouter.post('/login', (_req, res) => {
  // TODO ETAPA 2: implement login with JWT
  res.status(501).json({ message: 'Not implemented yet' });
});

// POST /api/auth/refresh
authRouter.post('/refresh', (_req, res) => {
  // TODO ETAPA 2: implement token refresh
  res.status(501).json({ message: 'Not implemented yet' });
});

// POST /api/auth/logout
authRouter.post('/logout', (_req, res) => {
  res.json({ message: 'Logged out' });
});
