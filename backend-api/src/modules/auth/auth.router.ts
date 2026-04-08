import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import { authMiddleware } from '../../middleware/auth.middleware';
import { registerSchema, loginSchema, refreshSchema } from './auth.validator';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', validate(registerSchema), authController.register);

// POST /api/auth/login
authRouter.post('/login', validate(loginSchema), authController.login);

// POST /api/auth/refresh
authRouter.post('/refresh', validate(refreshSchema), authController.refresh);

// POST /api/auth/logout
authRouter.post('/logout', authMiddleware, authController.logout);

// GET /api/auth/me
authRouter.get('/me', authMiddleware, authController.me);
