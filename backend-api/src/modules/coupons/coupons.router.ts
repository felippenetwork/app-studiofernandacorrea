import { Router } from 'express';

export const couponsRouter = Router();

// GET /api/coupons
couponsRouter.get('/', (_req, res) => {
  // TODO ETAPA 2: return active coupons from DB
  res.status(501).json({ message: 'Not implemented yet' });
});

// POST /api/coupons/validate
couponsRouter.post('/validate', (_req, res) => {
  // TODO ETAPA 2: validate coupon code
  res.status(501).json({ message: 'Not implemented yet' });
});

// POST /api/coupons/redeem
couponsRouter.post('/redeem', (_req, res) => {
  // TODO ETAPA 2: mark coupon as used
  res.status(501).json({ message: 'Not implemented yet' });
});
