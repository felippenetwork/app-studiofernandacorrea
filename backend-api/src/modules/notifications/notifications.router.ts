import { Router } from 'express';

export const notificationsRouter = Router();

// POST /api/notifications/register-token
notificationsRouter.post('/register-token', (_req, res) => {
  // TODO ETAPA 2: save push token to DB
  res.status(501).json({ message: 'Not implemented yet' });
});

// POST /api/notifications/send (admin only)
notificationsRouter.post('/send', (_req, res) => {
  // TODO ETAPA 2: send push notification to user(s)
  res.status(501).json({ message: 'Not implemented yet' });
});
