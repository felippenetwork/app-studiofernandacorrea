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
// Admin
import { adminAuthRouter } from './modules/admin-auth/admin-auth.router';
import { adminRouter } from './modules/admin/admin.router';
import { adminNotificationsRouter } from './modules/admin-notifications/admin-notifications.router';
import { birthdayRouter } from './modules/birthday/birthday.router';
import { startCronJobs } from './scheduler';
import { adminService } from './modules/admin/admin.service';

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

if (env.NODE_ENV !== 'test') {
  app.use('/api', globalLimiter);
  app.use('/api/auth', authLimiter);
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({
    status: 'ok',
    version: '5.0.0',
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

// ─── Public services list (no auth) ──────────────────────────────────────────
// Returns active services with variations for the mobile booking flow
app.get('/api/services', async (_req, res) => {
  try {
    const all = await adminService.listServices();
    const active = all.filter((s: any) => s.isActive !== false);
    res.json({ data: active });
  } catch {
    res.status(500).json({ error: 'InternalError', message: 'Erro ao carregar serviços.' });
  }
});

// ─── Public config (no auth) ──────────────────────────────────────────────────
// Returns only safe, non-sensitive public settings for the mobile app
app.get('/api/config/public', async (_req, res) => {
  try {
    const integrations = await adminService.getSetting('integrations');
    res.json({
      data: {
        googleReviewLink: integrations?.googleReviewLink ?? null,
      },
    });
  } catch {
    res.json({ data: { googleReviewLink: null } });
  }
});

// Admin routes
app.use('/api/admin/auth',          adminAuthRouter);
app.use('/api/admin/notifications', adminNotificationsRouter);
app.use('/api/admin/birthday',      birthdayRouter);
app.use('/api/admin',               adminRouter);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'NotFound', message: 'Rota não encontrada.' });
});

// ─── Centralized error handler (must be last) ─────────────────────────────────
app.use(errorHandler);

// ─── Start (skipped in test mode — supertest opens its own port) ─────────────
if (env.NODE_ENV !== 'test') {
  const server = app.listen(env.PORT, () => {
    console.log(`\n🌸 Studio Fernanda Correa API — ${env.NODE_ENV}`);
    console.log(`   Port        : ${env.PORT}`);
    console.log(`   Supabase    : ${hasSupabase ? '✓ connected' : '✗ mock mode'}`);
    console.log(`   Trinks      : ${hasTrinks ? '✓ connected' : '✗ mock mode'}`);
    console.log(`   Mercado Pago: ${hasMercadoPago ? '✓ connected' : '✗ simulation'}`);
    startCronJobs();
    if (isDev) console.log(`   Docs        : http://localhost:${env.PORT}/health\n`);
  });

  const shutdown = (signal: string) => {
    console.log(`\n[server] ${signal} received — shutting down gracefully…`);
    server.close(() => {
      console.log('[server] All connections closed. Exiting.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[server] Shutdown timeout — forcing exit.');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
}

export default app;
