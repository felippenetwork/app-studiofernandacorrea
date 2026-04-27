import { Router, Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { trinksService } from './trinks.service';
import { trinksSync } from './trinks.sync';
import { appointmentsRepository } from '../appointments/appointments.repository';
import { TrinksSNSMessage, TrinksSNSNotification, TrinksWebhookPayload } from './trinks.types';
import { env, hasSupabase } from '../../config/env';
import { adminAuthMiddleware } from '../../middleware/adminAuth.middleware';

export const trinksRouter = Router();

// ─── GET /api/trinks/services ─────────────────────────────────────────────────

trinksRouter.get('/services', async (_req: Request, res: Response): Promise<void> => {
  try {
    const services = await trinksService.getServices();
    res.json({ data: services });
  } catch (err) {
    res.status(500).json({ error: 'TrinksError', message: (err as Error).message });
  }
});

// ─── GET /api/trinks/professionals ───────────────────────────────────────────

trinksRouter.get('/professionals', async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.query as { serviceId?: string };
    const professionals = await trinksService.getProfessionals(serviceId);
    res.json({ data: professionals });
  } catch (err) {
    res.status(500).json({ error: 'TrinksError', message: (err as Error).message });
  }
});

// ─── POST /api/trinks/sync  (admin only — manual trigger) ────────────────────

trinksRouter.post('/sync', adminAuthMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await trinksSync.runFullSync();
    res.json({ data: result, message: 'Sincronização concluída.' });
  } catch (err) {
    res.status(500).json({ error: 'SyncError', message: (err as Error).message });
  }
});

// ─── POST /api/trinks/webhooks ────────────────────────────────────────────────
//
// Trinks sends webhooks via Amazon SNS. The first message after subscribing
// is a SubscriptionConfirmation — we must GET the SubscribeURL to activate it.
// Subsequent messages are Notification type with a JSON string in `Message`.
//
// Raw body parsing is configured in main.ts for this route.

trinksRouter.post('/webhooks', async (req: Request, res: Response): Promise<void> => {
  // Always acknowledge immediately — SNS / Trinks expects fast 200
  res.json({ received: true });

  try {
    const rawBody = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);
    let sns: TrinksSNSMessage;

    try {
      sns = JSON.parse(rawBody) as TrinksSNSMessage;
    } catch {
      console.warn('[trinks-webhook] Could not parse SNS body');
      return;
    }

    // ── Subscription confirmation ──────────────────────────────────────────
    if (sns.Type === 'SubscriptionConfirmation') {
      console.log('[trinks-webhook] SNS SubscriptionConfirmation received — confirming…');
      try {
        await axios.get(sns.SubscribeURL, { timeout: 10_000 });
        console.log('[trinks-webhook] SNS subscription confirmed successfully');
      } catch (err) {
        console.error('[trinks-webhook] Failed to confirm SNS subscription:', (err as Error).message);
      }
      return;
    }

    if (sns.Type !== 'Notification') return;

    const notification = sns as TrinksSNSNotification;

    // ── Optional HMAC-SHA256 signature verification ────────────────────────
    if (env.TRINKS_WEBHOOK_SECRET) {
      const signature = (req.headers['x-trinks-signature'] ?? req.headers['x-sns-signature']) as string;
      if (signature) {
        const expected = crypto
          .createHmac('sha256', env.TRINKS_WEBHOOK_SECRET)
          .update(rawBody)
          .digest('hex');
        if (signature !== expected) {
          console.warn('[trinks-webhook] Invalid signature — ignoring event');
          return;
        }
      }
    }

    // ── Parse the Trinks event from SNS Message field ──────────────────────
    let payload: TrinksWebhookPayload;
    try {
      payload = JSON.parse(notification.Message) as TrinksWebhookPayload;
    } catch {
      console.warn('[trinks-webhook] Could not parse Message JSON');
      return;
    }

    if (payload.TipoDeEvento !== 'Agendamento' || !payload.Agendamento?.Id) {
      console.log('[trinks-webhook] Ignoring non-appointment event:', payload.TipoDeEvento);
      return;
    }

    const { Action, Agendamento } = payload;
    console.log(`[trinks-webhook] Action=${Action} AgendamentoId=${Agendamento.Id}`);

    if (!hasSupabase) return;

    // Log the raw webhook for audit
    const { supabase: db } = await import('../../config/supabase');
    await db.from('trinks_webhook_events').insert({
      event_type: Action,
      trinks_appointment_id: String(Agendamento.Id),
      raw_payload: payload,
      processed_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.warn('[trinks-webhook] Audit log failed:', error.message);
    });

    // Map Trinks Action → our appointment status
    const statusMap: Record<string, string> = {
      Created:   'pendente_pagamento',
      Updated:   'confirmado',
      Confirmed: 'confirmado',
      Cancelled: 'cancelado',
      Completed: 'concluido',
      NoShow:    'nao_compareceu',
    };

    const mappedStatus = statusMap[Action];
    if (!mappedStatus) {
      console.log('[trinks-webhook] No status mapping for Action:', Action);
      return;
    }

    // Find our appointment by trinks_appointment_id
    const { data: appointment } = await db
      .from('appointments')
      .select('id, user_id')
      .eq('trinks_appointment_id', String(Agendamento.Id))
      .maybeSingle();

    if (!appointment) {
      console.log('[trinks-webhook] Appointment not found in DB for trinks id:', Agendamento.Id);
      return;
    }

    await appointmentsRepository.updateStatus(
      appointment.id,
      appointment.user_id,
      mappedStatus as any,
    );

    console.log(`[trinks-webhook] Appointment ${appointment.id} → ${mappedStatus}`);
  } catch (err) {
    console.error('[trinks-webhook] Processing error:', (err as Error).message);
  }
});
