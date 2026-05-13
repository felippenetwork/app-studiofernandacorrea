import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.middleware';
import { adminAuthService } from './admin-auth.service';
import { adminAuthMiddleware } from '../../middleware/adminAuth.middleware';

export const adminAuthRouter = Router();

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha obrigatória'),
});

// POST /api/admin/auth/login
adminAuthRouter.post('/login', validate(loginSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const result = await adminAuthService.login(email, password);
    res.json({ data: result, message: 'Login realizado com sucesso.' });
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized', message: (err as Error).message });
  }
});

// GET /api/admin/auth/me
adminAuthRouter.get('/me', adminAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const admin = (req as any).adminUser;
    res.json({ data: admin });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// POST /api/admin/auth/logout
adminAuthRouter.post('/logout', adminAuthMiddleware, async (_req: Request, res: Response): Promise<void> => {
  res.json({ data: null, message: 'Logout realizado com sucesso.' });
});
