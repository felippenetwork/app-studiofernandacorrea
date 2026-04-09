import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env, isDev, hasSupabase, hasTrinks, hasMercadoPago } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.router';
import { usersRouter } from './modules/users/users.router';
import { appointmentsRouter } from './modules/appointments/appointments.router';
import { couponsRouter } from './modules/coupons/coupons.router';
import { benefitsRouter } from './modules/benefits/benefits.router';
import { paymentsRouter } from './modules/payments/payments.router';
import { notificationsRouter } from './modules/notifications/notifications.router';
import { trinksRouter } from './modules/trinks/trinks.router';

const app = express();

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = env.ALLOWED_ORIGINS === '*'
  ? true  // allow all (dev only)
  : env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Body parsing ─────────────────────────────────────────────────────────────
// Webhook routes need raw body — parse JSON for the rest
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/trinks/webhooks', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));

// ─── Rate limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TooManyRequests', message: 'Muitas requisições. Tente novamente em instantes.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TooManyRequests', message: 'Muitas tentativas. Aguarde 15 minutos.' },
});

app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({
    status: 'ok',
    version: '4.0.0',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
    integrations: {
      supabase: hasSupabase,
      trinks: hasTrinks,
      mercadopago: hasMercadoPago,
    },
  })
);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRouter);
app.use('/api/users',         usersRouter);
app.use('/api/appointments',  appointmentsRouter);
app.use('/api/trinks',        trinksRouter);
app.use('/api/coupons',       couponsRouter);
app.use('/api/benefits',      benefitsRouter);
app.use('/api/payments',      paymentsRouter);
app.use('/api/notifications', notificationsRouter);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'NotFound', message: 'Rota não encontrada.' });
});

// ─── Centralized error handler (must be last) ─────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`\n🌸 Studio Fernanda Correa API — ${env.NODE_ENV}`);
  console.log(`   Port        : ${env.PORT}`);
  console.log(`   Supabase    : ${hasSupabase ? '✓ connected' : '✗ mock mode'}`);
  console.log(`   Trinks      : ${hasTrinks ? '✓ connected' : '✗ mock mode'}`);
  console.log(`   Mercado Pago: ${hasMercadoPago ? '✓ connected' : '✗ simulation'}`);
  if (isDev) console.log(`   Docs        : http://localhost:${env.PORT}/health\n`);
});

export default app;
