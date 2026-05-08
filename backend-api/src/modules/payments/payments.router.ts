import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { paymentsService } from './payments.service';
import { AuthenticatedRequest } from '../../types';

export const paymentsRouter = Router();

const cardDataSchema = z.object({
  number: z.string().min(14).max(19),
  holderName: z.string().min(2),
  expiryMonth: z.string().length(2),
  expiryYear: z.string().length(4),
  cvv: z.string().min(3).max(4),
  brand: z.string().optional(),
});

const createPaymentSchema = z.object({
  appointmentId: z.string().uuid('ID de agendamento inválido'),
  method: z.enum(['pix', 'credit_card', 'debit_card']),
  cardData: cardDataSchema.optional(),
});

// POST /api/payments/booking-fee
paymentsRouter.post(
  '/booking-fee',
  authMiddleware,
  validate(createPaymentSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id: userId } = (req as AuthenticatedRequest).user;
      const result = await paymentsService.createBookingFee(
        userId,
        req.body.appointmentId,
        req.body.method,
        req.body.cardData
      );
      res.status(201).json({
        data: result,
        message:
          result.status === 'aprovado'
            ? 'Pagamento aprovado! Seu agendamento está confirmado.'
            : 'Pagamento iniciado. Aguardando confirmação.',
      });
    } catch (err) {
      const message = (err as Error).message;
      const status = message.includes('não encontrado') ? 404 : 400;
      res.status(status).json({ error: 'PaymentError', message });
    }
  }
);

// POST /api/payments/webhook — Getnet webhook
paymentsRouter.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  res.json({ received: true });
  try {
    await paymentsService.processWebhook(req.body);
  } catch (err) {
    console.error('[payments-webhook] Error:', err);
  }
});
