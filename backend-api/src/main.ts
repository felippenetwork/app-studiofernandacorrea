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
import { reviewsRouter } from './modules/reviews/reviews.router';
import { postsRouter } from './modules/posts/posts.router';
import { adminAuthRouter } from './modules/admin-auth/admin-auth.router';
import { adminRouter } from './modules/admin/admin.router';
import { adminNotificationsRouter } from './modules/admin-notifications/admin-notifications.router';
import { birthdayRouter } from './modules/birthday/birthday.router';
import { startCronJobs } from './scheduler';
import { adminService } from './modules/admin/admin.service';
import { runMigrations } from './scripts/migrate';

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
app.use('/api/reviews',       reviewsRouter);
app.use('/api/posts',         postsRouter);

// ─── Public professionals list (no auth) ─────────────────────────────────────
// Returns active professionals for the mobile booking flow.
// Uses Supabase as source-of-truth; falls back to Trinks then mock.
app.get('/api/professionals', async (req, res) => {
  try {
    const { serviceId } = req.query as Record<string, string>;

    const all = await adminService.listProfessionals();
    let active = all.filter((p: any) => p.isActive !== false);

    if (active.length > 0) {
      res.json({ data: active });
      return;
    }

    // Supabase empty — try Trinks
    try {
      const { trinksService } = await import('./modules/trinks/trinks.service');
      const trinksPros = await trinksService.getProfessionals(serviceId);
      const mapped = trinksPros
        .filter((p) => p.active !== false)
        .map((p) => ({
          id: p.id,
          name: p.name,
          avatarUrl: p.photo ?? undefined,
          specialties: p.services ?? [],
          rating: 5.0,
          reviewCount: 0,
          isActive: true,
        }));
      res.json({ data: mapped });
    } catch {
      // Trinks unavailable — use admin mock
      const { MOCK_PROFESSIONALS } = await import('./modules/admin/admin.service');
      res.json({ data: (MOCK_PROFESSIONALS as any[]).filter((p) => p.isActive !== false) });
    }
  } catch (err) {
    console.error('[/api/professionals]', err);
    res.status(500).json({ error: 'InternalError', message: 'Erro ao carregar profissionais.' });
  }
});

// ─── Public services list (no auth) ──────────────────────────────────────────
// Returns active services with variations for the mobile booking flow.
// Uses Supabase as source-of-truth when populated; falls back to Trinks.
app.get('/api/services', async (_req, res) => {
  try {
    const all = await adminService.listServices();
    const active = all.filter((s: any) => s.isActive !== false);

    if (active.length > 0) {
      res.json({ data: active });
      return;
    }

    // Supabase table empty — try Trinks, then fall back to admin mock data
    try {
      const { trinksService } = await import('./modules/trinks/trinks.service');
      const trinksServices = await trinksService.getServices();
      const mapped = trinksServices
        .filter((s) => s.active !== false)
        .map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description ?? '',
          price: s.price,
          durationMinutes: s.duration,
          category: (s.category ?? 'outros').toLowerCase(),
          isActive: true,
          variations: [],
        }));
      res.json({ data: mapped });
    } catch {
      // Trinks unavailable — use admin mock data (includes variations for testing)
      const { MOCK_SERVICES } = await import('./modules/admin/admin.service');
      res.json({ data: (MOCK_SERVICES as any[]).filter((s) => s.isActive !== false) });
    }
  } catch (err) {
    console.error('[/api/services]', err);
    res.status(500).json({ error: 'InternalError', message: 'Erro ao carregar serviços.' });
  }
});

// ─── Public service categories (no auth) ─────────────────────────────────────
app.get('/api/service-categories', async (_req, res) => {
  try {
    const categories = await adminService.listServiceCategories();
    res.json({ data: categories });
  } catch {
    res.json({ data: [] });
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
  // Run DB migrations before accepting traffic
  runMigrations().catch((e) => console.error('[migrate] failed:', e));

  // Ensure Supabase Storage bucket for posts exists
  if (hasSupabase) {
    import('./config/supabase').then(({ supabase }) => {
      supabase.storage.createBucket('post-media', { public: true }).then(({ error }) => {
        if (error && !error.message.includes('already exists') && !error.message.includes('duplicate')) {
          console.warn('[storage] post-media bucket:', error.message);
        } else if (!error) {
          console.log('   Storage     : ✓ post-media bucket created');
        }
      });
    });
  }

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
