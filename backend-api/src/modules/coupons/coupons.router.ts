import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { couponsRepository } from './coupons.repository';
import { AuthenticatedRequest } from '../../types';
import { z } from 'zod';
import { validate } from '../../middleware/validate.middleware';

export const couponsRouter = Router();

couponsRouter.use(authMiddleware);

// GET /api/coupons — list available coupons
couponsRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const coupons = await couponsRepository.findAll();
    res.json({ data: coupons });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// GET /api/coupons/:id
couponsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const coupon = await couponsRepository.findById(req.params.id);
    if (!coupon) {
      res.status(404).json({ error: 'NotFound', message: 'Cupom não encontrado.' });
      return;
    }
    res.json({ data: coupon });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

const validateCouponSchema = z.object({ code: z.string().min(1) });

// POST /api/coupons/validate — validate coupon code
couponsRouter.post('/validate', validate(validateCouponSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const coupon = await couponsRepository.findByCode(req.body.code);

    if (!coupon || coupon.status !== 'ativo') {
      res.status(404).json({ error: 'InvalidCoupon', message: 'Cupom inválido ou expirado.' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (coupon.valid_until < today) {
      res.status(400).json({ error: 'ExpiredCoupon', message: 'Cupom expirado.' });
      return;
    }

    const alreadyUsed = await couponsRepository.hasUserRedeemed(userId, coupon.id);
    if (alreadyUsed) {
      res.status(400).json({ error: 'AlreadyUsed', message: 'Você já utilizou este cupom.' });
      return;
    }

    res.json({ data: coupon, message: 'Cupom válido!' });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

const redeemSchema = z.object({ appointmentId: z.string().uuid().optional() });

// POST /api/coupons/:id/redeem
couponsRouter.post('/:id/redeem', validate(redeemSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const coupon = await couponsRepository.findById(req.params.id);

    if (!coupon || coupon.status !== 'ativo') {
      res.status(404).json({ error: 'NotFound', message: 'Cupom não encontrado.' });
      return;
    }

    await couponsRepository.redeem(userId, coupon.id, req.body.appointmentId);
    res.json({ data: null, message: 'Cupom resgatado com sucesso!' });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});
