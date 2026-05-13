import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { paymentsService } from './payments.service';
import { AuthenticatedRequest } from '../../types';

export const paymentsRouter = Router();

const createPaymentSchema = z.object({
  appointmentId: z.string().uuid('ID de agendamento inválido'),
  method: z.enum(['pix', 'credit_card', 'debit_card']),
});

// POST /api/payments/booking-fee — pay the R$40 reservation fee
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
        req.body.method
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

// POST /api/payments/webhook — Mercado Pago webhook
paymentsRouter.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  // Acknowledge immediately
  res.json({ received: true });

  try {
    await paymentsService.processWebhook(req.body);
  } catch (err) {
    console.error('[payments-webhook] Error:', err);
  }
});
