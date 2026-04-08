import { Router, Request, Response } from 'express';
import { trinksService } from './trinks.service';
import { appointmentsRepository } from '../appointments/appointments.repository';
import { TrinksWebhookEvent } from './trinks.types';
import { env, hasSupabase } from '../../config/env';
import crypto from 'crypto';

export const trinksRouter = Router();

// GET /api/trinks/services — list services from Trinks (or mock)
trinksRouter.get('/services', async (_req: Request, res: Response): Promise<void> => {
  try {
    const services = await trinksService.getServices();
    res.json({ data: services });
  } catch (err) {
    res.status(500).json({ error: 'TrinksError', message: (err as Error).message });
  }
});

// GET /api/trinks/professionals
trinksRouter.get('/professionals', async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.query as { serviceId?: string };
    const professionals = await trinksService.getProfessionals(serviceId);
    res.json({ data: professionals });
  } catch (err) {
    res.status(500).json({ error: 'TrinksError', message: (err as Error).message });
  }
});

/**
 * POST /api/trinks/webhooks
 * Receives webhook events from Trinks and syncs appointment status.
 *
 * Trinks sends:
 *   - appointment.created
 *   - appointment.updated
 *   - appointment.cancelled
 */
trinksRouter.post('/webhooks', async (req: Request, res: Response): Promise<void> => {
  // Acknowledge immediately — Trinks expects fast response
  res.json({ received: true });

  try {
    // Verify webhook signature if secret is configured
    if (env.MP_WEBHOOK_SECRET) {
      const signature = req.headers['x-trinks-signature'] as string;
      const expected = crypto
        .createHmac('sha256', env.MP_WEBHOOK_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expected) {
        console.warn('[trinks-webhook] Invalid signature — ignoring event');
        return;
      }
    }

    const event = req.body as TrinksWebhookEvent;
    console.log(`[trinks-webhook] Event received: ${event.type}`, event.payload?.id);

    if (!hasSupabase || !event.payload?.id) return;

    // Map Trinks status to our status
    const statusMap: Record<string, string> = {
      scheduled: 'pendente_pagamento',
      confirmed: 'confirmado',
      cancelled: 'cancelado',
      completed: 'concluido',
      no_show: 'nao_compareceu',
    };

    const mappedStatus = statusMap[event.payload.status];
    if (!mappedStatus) return;

    // Find our appointment by trinks_appointment_id
    const { supabase: db } = await import('../../config/supabase');
    const { data } = await db
      .from('appointments')
      .select('id, user_id')
      .eq('trinks_appointment_id', event.payload.id)
      .maybeSingle();

    if (!data) {
      console.log('[trinks-webhook] Appointment not found in DB:', event.payload.id);
      return;
    }

    await appointmentsRepository.updateStatus(
      data.id,
      data.user_id,
      mappedStatus as any
    );

    console.log(`[trinks-webhook] Appointment ${data.id} updated to ${mappedStatus}`);
  } catch (err) {
    console.error('[trinks-webhook] Processing error:', err);
  }
});
