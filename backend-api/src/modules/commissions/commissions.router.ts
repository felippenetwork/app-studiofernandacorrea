import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.middleware';
import { adminAuthMiddleware, requireRole } from '../../middleware/adminAuth.middleware';
import { commissionsService } from './commissions.service';

export const commissionsRouter = Router();

commissionsRouter.use(adminAuthMiddleware);

// GET /api/admin/commissions/rates
commissionsRouter.get('/rates', async (req: Request, res: Response): Promise<void> => {
  try {
    const { professionalId } = req.query as Record<string, string>;
    res.json({ data: await commissionsService.getRates(professionalId) });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// PUT /api/admin/commissions/rates
const rateSchema = z.object({
  professionalId: z.string().uuid(),
  serviceId:      z.string().uuid(),
  percentage:     z.number().min(0).max(100),
});

commissionsRouter.put(
  '/rates',
  requireRole('owner', 'gerente', 'financeiro'),
  validate(rateSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { professionalId, serviceId, percentage } = req.body;
      const rate = await commissionsService.setRate(professionalId, serviceId, percentage);
      res.json({ data: rate, message: 'Taxa de comissão atualizada.' });
    } catch (err) {
      res.status(400).json({ error: 'BadRequest', message: (err as Error).message });
    }
  },
);

// DELETE /api/admin/commissions/rates
const deleteRateSchema = z.object({
  professionalId: z.string().uuid(),
  serviceId:      z.string().uuid(),
});

commissionsRouter.delete(
  '/rates',
  requireRole('owner', 'gerente', 'financeiro'),
  validate(deleteRateSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await commissionsService.deleteRate(req.body.professionalId, req.body.serviceId);
      res.json({ data: null, message: 'Taxa removida.' });
    } catch (err) {
      res.status(400).json({ error: 'BadRequest', message: (err as Error).message });
    }
  },
);

// GET /api/admin/commissions/summary — totais por profissional
commissionsRouter.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query as Record<string, string>;
    res.json({ data: await commissionsService.getSummary(from, to) });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// GET /api/admin/commissions/records
commissionsRouter.get('/records', async (req: Request, res: Response): Promise<void> => {
  try {
    const { professionalId, status, from, to, page = '1', limit = '20' } = req.query as Record<string, string>;
    res.json({
      data: await commissionsService.getRecords({ professionalId, status, from, to, page: +page, limit: +limit }),
    });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// POST /api/admin/commissions/records/pay — marcar repasse em lote
const paySchema = z.object({
  ids:   z.array(z.string().uuid()).min(1),
  notes: z.string().optional(),
});

commissionsRouter.post(
  '/records/pay',
  requireRole('owner', 'gerente', 'financeiro'),
  validate(paySchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const admin = (req as any).adminUser;
      await commissionsService.markAsPaid(req.body.ids, admin.id, req.body.notes);
      res.json({ data: null, message: `${req.body.ids.length} comissão(ões) marcada(s) como paga(s).` });
    } catch (err) {
      res.status(400).json({ error: 'BadRequest', message: (err as Error).message });
    }
  },
);
