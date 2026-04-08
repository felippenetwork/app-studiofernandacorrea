import { z } from 'zod';

export const createAppointmentSchema = z.object({
  serviceId: z.string().uuid('ID de serviço inválido'),
  professionalId: z.string().uuid('ID de profissional inválido'),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (use YYYY-MM-DD)'),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, 'Hora inválida (use HH:MM)'),
  notes: z.string().max(500).optional(),
});
