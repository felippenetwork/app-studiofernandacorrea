import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/auth.router';
import { appointmentsRouter } from './modules/appointments/appointments.router';
import { couponsRouter } from './modules/coupons/coupons.router';
import { notificationsRouter } from './modules/notifications/notifications.router';
import { trinksRouter } from './modules/trinks/trinks.router';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS ?? '').split(','),
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/trinks/webhooks', trinksRouter);

app.listen(PORT, () => {
  console.log(`[server] Studio Fernanda Correa API running on port ${PORT}`);
});

export default app;
