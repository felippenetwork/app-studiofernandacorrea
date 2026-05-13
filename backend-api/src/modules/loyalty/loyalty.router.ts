import { Router, Request, Response } from 'express';
import { adminAuthMiddleware, requireRole } from '../../middleware/adminAuth.middleware';
import { loyaltyService } from './loyalty.service';

export const loyaltyRouter = Router();
loyaltyRouter.use(adminAuthMiddleware);

// GET /api/admin/loyalty/settings
loyaltyRouter.get('/settings', async (_req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await loyaltyService.getSettings() }); }
  catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

// PUT /api/admin/loyalty/settings
loyaltyRouter.put('/settings', requireRole('owner', 'gerente'), async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await loyaltyService.updateSettings(req.body);
    res.json({ data, message: 'Configurações salvas.' });
  } catch (err) { res.status(400).json({ error: 'BadRequest', message: (err as Error).message }); }
});

// GET /api/admin/loyalty/customers
loyaltyRouter.get('/customers', async (_req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await loyaltyService.getCustomersRanking() }); }
  catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});

// GET /api/admin/loyalty/customers/:userId/history
loyaltyRouter.get('/customers/:userId/history', async (req: Request, res: Response): Promise<void> => {
  try { res.json({ data: await loyaltyService.getUserHistory(req.params.userId) }); }
  catch (err) { res.status(500).json({ error: 'InternalError', message: (err as Error).message }); }
});
