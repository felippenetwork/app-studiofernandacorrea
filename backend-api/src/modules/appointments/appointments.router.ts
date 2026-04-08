import { Router } from 'express';

export const appointmentsRouter = Router();

// GET /api/appointments/me
appointmentsRouter.get('/me', (_req, res) => {
  // TODO ETAPA 2: return authenticated user's appointments
  res.status(501).json({ message: 'Not implemented yet' });
});

// GET /api/appointments/available-slots
appointmentsRouter.get('/available-slots', (_req, res) => {
  // TODO ETAPA 2: query Trinks for available slots
  res.status(501).json({ message: 'Not implemented yet' });
});

// POST /api/appointments
appointmentsRouter.post('/', (_req, res) => {
  // TODO ETAPA 2: create appointment in Trinks + our DB, process booking fee
  res.status(501).json({ message: 'Not implemented yet' });
});

// PATCH /api/appointments/:id/cancel
appointmentsRouter.patch('/:id/cancel', (_req, res) => {
  // TODO ETAPA 2: cancel appointment in Trinks + our DB
  res.status(501).json({ message: 'Not implemented yet' });
});
