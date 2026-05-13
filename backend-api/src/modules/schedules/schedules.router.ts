import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.middleware';
import { adminAuthMiddleware, requireRole } from '../../middleware/adminAuth.middleware';
import { schedulesService } from './schedules.service';

export const schedulesRouter = Router();

schedulesRouter.use(adminAuthMiddleware);

// GET /api/admin/schedules — visão geral de todos os horários
schedulesRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({ data: await schedulesService.getAllSchedules() });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// GET /api/admin/schedules/:professionalId — horário semanal do profissional
schedulesRouter.get('/:professionalId', async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ data: await schedulesService.getSchedule(req.params.professionalId) });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// PUT /api/admin/schedules/:professionalId/day/:dayOfWeek — configurar um dia
const daySchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  endTime:   z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  isActive:  z.boolean().default(true),
});

schedulesRouter.put(
  '/:professionalId/day/:dayOfWeek',
  requireRole('owner', 'gerente', 'recepcao'),
  validate(daySchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const dow = parseInt(req.params.dayOfWeek, 10);
      const result = await schedulesService.setDaySchedule(req.params.professionalId, dow, req.body);
      res.json({ data: result, message: 'Horário atualizado.' });
    } catch (err) {
      res.status(400).json({ error: 'BadRequest', message: (err as Error).message });
    }
  },
);

// GET /api/admin/schedules/:professionalId/blocks — bloqueios do profissional
schedulesRouter.get('/:professionalId/blocks', async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const today   = new Date().toISOString().slice(0, 10);
    const endDate = to ?? new Date(Date.now() + 90 * 86400_000).toISOString().slice(0, 10);
    res.json({ data: await schedulesService.getBlocks(req.params.professionalId, from ?? today, endDate) });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// POST /api/admin/schedules/:professionalId/blocks — criar bloqueio
const blockSchema = z.object({
  blockDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  startTime:  z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime:    z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reason:     z.string().optional(),
});

schedulesRouter.post(
  '/:professionalId/blocks',
  requireRole('owner', 'gerente', 'recepcao'),
  validate(blockSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const block = await schedulesService.createBlock(req.params.professionalId, req.body);
      res.status(201).json({ data: block, message: 'Bloqueio criado.' });
    } catch (err) {
      res.status(400).json({ error: 'BadRequest', message: (err as Error).message });
    }
  },
);

// DELETE /api/admin/schedules/blocks/:blockId — remover bloqueio
// IMPORTANTE: esta rota deve vir antes de /:professionalId para não colidir
schedulesRouter.delete(
  '/blocks/:blockId',
  requireRole('owner', 'gerente', 'recepcao'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await schedulesService.deleteBlock(req.params.blockId);
      res.json({ data: null, message: 'Bloqueio removido.' });
    } catch (err) {
      res.status(400).json({ error: 'BadRequest', message: (err as Error).message });
    }
  },
);

// GET /api/admin/schedules/:professionalId/slots — slots disponíveis
schedulesRouter.get('/:professionalId/slots', async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId, date } = req.query as Record<string, string>;
    if (!serviceId || !date) {
      res.status(400).json({ error: 'ValidationError', message: 'serviceId e date são obrigatórios.' });
      return;
    }
    const slots = await schedulesService.getAvailableSlots(req.params.professionalId, serviceId, date);
    res.json({ data: slots });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});
