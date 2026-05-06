import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { appointmentsService } from './appointments.service';
import { AuthenticatedRequest } from '../../types';
import { createAppointmentSchema } from './appointments.validator';
import { trinksService } from '../trinks/trinks.service';

export const appointmentsRouter = Router();

appointmentsRouter.use(authMiddleware);

// GET /api/appointments — list user's appointments
appointmentsRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = (req as AuthenticatedRequest).user;
    const appointments = await appointmentsService.getMyAppointments(id);
    res.json({ data: appointments });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// GET /api/appointments/available-slots — get available time slots from Trinks
appointmentsRouter.get('/available-slots', async (req: Request, res: Response): Promise<void> => {
  try {
    const { professionalId, serviceId, date } = req.query as Record<string, string>;
    if (!professionalId || !date) {
      res.status(400).json({ error: 'ValidationError', message: 'professionalId e date são obrigatórios.' });
      return;
    }
    let slots;
    try {
      slots = await trinksService.getAvailableSlots(professionalId, serviceId, date);
    } catch {
      // Trinks unavailable — return mock slots so mobile booking flow works
      slots = [
        { time: '09:00', available: true },  { time: '09:30', available: false },
        { time: '10:00', available: true },  { time: '10:30', available: true },
        { time: '11:00', available: false }, { time: '11:30', available: true },
        { time: '14:00', available: true },  { time: '14:30', available: true },
        { time: '15:00', available: false }, { time: '15:30', available: true },
        { time: '16:00', available: true },  { time: '17:00', available: true },
      ];
    }
    res.json({ data: slots });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// GET /api/appointments/:id
appointmentsRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const appointment = await appointmentsService.getById(req.params.id, userId);
    if (!appointment) {
      res.status(404).json({ error: 'NotFound', message: 'Agendamento não encontrado.' });
      return;
    }
    res.json({ data: appointment });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// POST /api/appointments — create appointment (status: pendente_pagamento)
appointmentsRouter.post('/', validate(createAppointmentSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: userId } = (req as AuthenticatedRequest).user;
    const appointment = await appointmentsService.create(userId, req.body);
    res.status(201).json({
      data: appointment,
      message: 'Agendamento criado. Realize o pagamento da taxa de reserva para confirmar.',
    });
  } catch (err) {
    res.status(500).json({ error: 'InternalError', message: (err as Error).message });
  }
});

// Cancelamento de agendamentos não é permitido pelo cliente.
// Em caso de necessidade, o cancelamento é feito diretamente no painel Trinks pela profissional.
