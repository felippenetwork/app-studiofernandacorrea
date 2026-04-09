import { Router, Request, Response } from 'express';
import { adminAuthMiddleware } from '../../middleware/adminAuth.middleware';
import { adminNotificationsService } from './admin-notifications.service';

export const adminNotificationsRouter = Router();

adminNotificationsRouter.use(adminAuthMiddleware);

// GET /api/admin/notifications
adminNotificationsRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const notifications = await adminNotificationsService.list();
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    res.json({ data: { notifications, unreadCount } });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// PATCH /api/admin/notifications/read-all
adminNotificationsRouter.patch('/read-all', async (_req: Request, res: Response): Promise<void> => {
  try {
    await adminNotificationsService.markAllRead();
    res.json({ data: null, message: 'Todas as notificações marcadas como lidas.' });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// PATCH /api/admin/notifications/:id/read
adminNotificationsRouter.patch('/:id/read', async (req: Request, res: Response): Promise<void> => {
  try {
    await adminNotificationsService.markRead(req.params.id);
    res.json({ data: null, message: 'Notificação marcada como lida.' });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});
