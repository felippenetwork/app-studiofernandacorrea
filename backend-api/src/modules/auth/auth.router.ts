import express, { Router } from 'express';
import { z } from 'zod';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import { authMiddleware } from '../../middleware/auth.middleware';
import { registerSchema, loginSchema, refreshSchema } from './auth.validator';

export const authRouter = Router();

// POST /api/auth/register
authRouter.post('/register', validate(registerSchema), authController.register);

// POST /api/auth/login
authRouter.post('/login', validate(loginSchema), authController.login);

// GET /api/auth/verify-email?token=xxx  — link from confirmation email (browser access)
authRouter.get('/verify-email', authController.verifyEmail);

// POST /api/auth/resend-verification
authRouter.post(
  '/resend-verification',
  validate(z.object({ email: z.string().email() })),
  authController.resendVerification
);

// POST /api/auth/forgot-password
authRouter.post(
  '/forgot-password',
  validate(z.object({ email: z.string().email() })),
  authController.forgotPassword
);

// GET /api/auth/reset-password?token=xxx  — formulário HTML
authRouter.get('/reset-password', authController.resetPasswordForm);

// POST /api/auth/reset-password  — submit do formulário HTML
authRouter.post(
  '/reset-password',
  express.urlencoded({ extended: false }),
  authController.resetPassword
);

// POST /api/auth/refresh
authRouter.post('/refresh', validate(refreshSchema), authController.refresh);

// POST /api/auth/logout
authRouter.post('/logout', authMiddleware, authController.logout);

// GET /api/auth/me
authRouter.get('/me', authMiddleware, authController.me);
