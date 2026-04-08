import { Router } from 'express';

export const trinksRouter = Router();

/**
 * POST /api/trinks/webhooks
 *
 * Receives webhook events from Trinks and syncs appointment state.
 * Events: appointment.created | appointment.updated | appointment.cancelled
 *
 * TODO ETAPA 2: verify signature, parse event, update our DB, push notification
 */
trinksRouter.post('/', (req, res) => {
  const event = req.body;
  console.log('[trinks-webhook] Received event:', event?.type ?? 'unknown');
  // Acknowledge immediately — process asynchronously
  res.json({ received: true });
});
