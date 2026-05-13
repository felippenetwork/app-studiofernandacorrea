import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.middleware';
import { adminAuthMiddleware, requireRole } from '../../middleware/adminAuth.middleware';
import { birthdayService } from './birthday.service';

export const birthdayRouter = Router();

birthdayRouter.use(adminAuthMiddleware);

const settingsSchema = z.object({
  isActive: z.boolean().optional(),
  couponType: z.enum(['percentage', 'fixed']).optional(),
  couponValue: z.number().positive().optional(),
  couponValidityDays: z.number().int().positive().optional(),
  pushMessage: z.string().min(1).optional(),
  sendHour: z.number().int().min(0).max(23).optional(),
});

// GET /api/admin/birthday/settings
birthdayRouter.get('/settings', async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await birthdayService.getSettings();
    res.json({ data: settings });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// PUT /api/admin/birthday/settings
birthdayRouter.put(
  '/settings',
  requireRole('owner', 'gerente', 'marketing'),
  validate(settingsSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await birthdayService.updateSettings(req.body);
      res.json({ data: updated, message: 'Configurações salvas.' });
    } catch (err) {
      res.status(500).json({ error: 'InternalError', message: (err as Error).message });
    }
  }
);

// POST /api/admin/birthday/run-now
birthdayRouter.post(
  '/run-now',
  requireRole('owner', 'gerente'),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const result = await birthdayService.runBirthdayAutomation();
      res.json({ data: result, message: `Automação executada: ${result.processed} enviadas.` });
    } catch (err) {
      res.status(500).json({ error: 'InternalError', message: (err as Error).message });
    }
  }
);
