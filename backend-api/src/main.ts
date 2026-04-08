import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/auth.router';
import { usersRouter } from './modules/users/users.router';
import { appointmentsRouter } from './modules/appointments/appointments.router';
import { couponsRouter } from './modules/coupons/coupons.router';
import { benefitsRouter } from './modules/benefits/benefits.router';
import { paymentsRouter } from './modules/payments/payments.router';
import { notificationsRouter } from './modules/notifications/notifications.router';
import { trinksRouter } from './modules/trinks/trinks.router';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : '*',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date().toISOString() })
);

// Auth
app.use('/api/auth', authRouter);

// Users
app.use('/api/users', usersRouter);

// Appointments
app.use('/api/appointments', appointmentsRouter);

// Trinks (services, professionals, slots + webhooks)
app.use('/api/trinks', trinksRouter);

// Coupons
app.use('/api/coupons', couponsRouter);

// Benefits
app.use('/api/benefits', benefitsRouter);

// Payments
app.use('/api/payments', paymentsRouter);

// Notifications
app.use('/api/notifications', notificationsRouter);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: 'NotFound', message: 'Rota não encontrada.' });
});

app.listen(PORT, () => {
  console.log(`[server] Studio Fernanda Correa API rodando na porta ${PORT}`);
});

export default app;
