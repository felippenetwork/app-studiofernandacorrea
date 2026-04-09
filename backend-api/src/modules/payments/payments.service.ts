import axios from 'axios';
import { env, hasSupabase, hasMercadoPago } from '../../config/env';
import { DbPayment, PaymentMethod, BOOKING_FEE } from '../../types';
import { appointmentsRepository } from '../appointments/appointments.repository';
import { pushService } from '../../services/push.service';

export interface CreatePaymentResult {
  paymentId: string;
  status: 'pendente' | 'aprovado';
  // PIX-specific fields
  pixQrCode?: string;      // Base64 QR code image
  pixCopyPaste?: string;   // Copia-e-cola text
  // Card/redirect flow
  preferenceId?: string;
  redirectUrl?: string;
}

const MP_API = 'https://api.mercadopago.com';

// ─── Public API ───────────────────────────────────────────────────────────────

export const paymentsService = {
  /**
   * Creates a booking fee payment (R$40) for an appointment.
   * Routes to MP real or simulation based on MP_ACCESS_TOKEN.
   */
  async createBookingFee(
    userId: string,
    appointmentId: string,
    method: PaymentMethod
  ): Promise<CreatePaymentResult> {
    if (hasSupabase) {
      const appointment = await appointmentsRepository.findById(appointmentId, userId);
      if (!appointment) throw new Error('Agendamento não encontrado.');
      if (appointment.payment_status === 'aprovado') {
        throw new Error('Taxa de reserva já foi paga para este agendamento.');
      }
    }

    if (!hasMercadoPago) {
      return paymentsService._simulatePayment(userId, appointmentId, method);
    }

    return paymentsService._createMercadoPagoPayment(userId, appointmentId, method);
  },

  /**
   * Dev/test simulation — instant approval, no external calls.
   */
  async _simulatePayment(
    userId: string,
    appointmentId: string,
    method: PaymentMethod
  ): Promise<CreatePaymentResult> {
    const paymentId = `sim-${Date.now()}`;
    console.log(`[payments] ⚡ Simulating approval — appt: ${appointmentId}, method: ${method}`);

    if (hasSupabase) {
      const { supabase } = await import('../../config/supabase');
      await supabase.from('payments').insert({
        user_id: userId,
        appointment_id: appointmentId,
        amount: BOOKING_FEE,
        type: 'booking_fee',
        method,
        status: 'aprovado',
        external_payment_id: paymentId,
      });
      await appointmentsRepository.confirmPayment(appointmentId, paymentId);

      // Trigger push notification (non-blocking)
      await _triggerConfirmationPush(userId, appointmentId).catch(() => {});
    }

    return { paymentId, status: 'aprovado' };
  },

  /**
   * Real Mercado Pago integration via REST API.
   *
   * PIX:         Returns pixQrCode + pixCopyPaste. Status starts as 'pendente'.
   *              Appointment is confirmed via webhook when MP approves.
   *
   * Credit/Debit: Returns redirectUrl to MP Checkout.
   *              For full card tokenization on mobile, integrate MP SDK later.
   */
  async _createMercadoPagoPayment(
    userId: string,
    appointmentId: string,
    method: PaymentMethod
  ): Promise<CreatePaymentResult> {
    // Fetch user info for payer
    let payerEmail = 'cliente@studiofernandacorrea.com.br';
    if (hasSupabase) {
      const { supabase } = await import('../../config/supabase');
      const { data: user } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .maybeSingle();
      if (user) payerEmail = (user as { email: string }).email;
    }

    if (method === 'pix') {
      return _createPixPayment(userId, appointmentId, payerEmail);
    }

    // For credit/debit card: create a Checkout Pro preference
    return _createCheckoutPreference(userId, appointmentId, payerEmail);
  },

  /**
   * Webhook handler — called by Mercado Pago when payment status changes.
   */
  async processWebhook(payload: Record<string, unknown>): Promise<void> {
    console.log('[payments] Webhook received:', JSON.stringify(payload).slice(0, 200));
    if (!hasSupabase) return;

    const externalPaymentId = (payload.data as any)?.id as string | undefined;
    if (!externalPaymentId) return;

    // Verify payment status via MP API
    let mpStatus: string;
    try {
      const { data: mpPayment } = await axios.get(
        `${MP_API}/v1/payments/${externalPaymentId}`,
        { headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } }
      );
      mpStatus = mpPayment.status;
    } catch (err) {
      console.error('[payments] Failed to fetch MP payment status:', (err as Error).message);
      return;
    }

    const { supabase } = await import('../../config/supabase');

    const { data: payment } = await supabase
      .from('payments')
      .select('id, appointment_id, user_id, status')
      .eq('external_payment_id', externalPaymentId)
      .maybeSingle();

    if (!payment) {
      console.warn('[payments] Payment not found for external ID:', externalPaymentId);
      return;
    }

    const dbPayment = payment as DbPayment;
    const newStatus =
      mpStatus === 'approved' ? 'aprovado'
      : mpStatus === 'rejected' ? 'recusado'
      : 'pendente';

    await supabase
      .from('payments')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', dbPayment.id);

    if (newStatus === 'aprovado') {
      await appointmentsRepository.confirmPayment(dbPayment.appointment_id, externalPaymentId);
      console.log(`[payments] ✓ Appointment ${dbPayment.appointment_id} confirmed.`);
      await _triggerConfirmationPush(dbPayment.user_id, dbPayment.appointment_id).catch(() => {});
    }
  },

  async refund(paymentId: string): Promise<void> {
    if (!hasMercadoPago) {
      console.log(`[payments] Mock refund for ${paymentId}`);
      return;
    }
    await axios.post(
      `${MP_API}/v1/payments/${paymentId}/refunds`,
      {},
      { headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } }
    );
  },
};

// ─── PIX payment ──────────────────────────────────────────────────────────────

async function _createPixPayment(
  userId: string,
  appointmentId: string,
  payerEmail: string
): Promise<CreatePaymentResult> {
  const idempotencyKey = `booking-fee-pix-${appointmentId}`;

  const { data: mpPayment } = await axios.post(
    `${MP_API}/v1/payments`,
    {
      transaction_amount: BOOKING_FEE,
      description: 'Taxa de reserva — Studio Fernanda Correa',
      payment_method_id: 'pix',
      payer: { email: payerEmail },
    },
    {
      headers: {
        Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
        'X-Idempotency-Key': idempotencyKey,
        'Content-Type': 'application/json',
      },
    }
  );

  const paymentId = String(mpPayment.id);
  const pixData = mpPayment.point_of_interaction?.transaction_data;

  // Persist payment record
  if (hasSupabase) {
    const { supabase } = await import('../../config/supabase');
    await supabase.from('payments').insert({
      user_id: userId,
      appointment_id: appointmentId,
      amount: BOOKING_FEE,
      type: 'booking_fee',
      method: 'pix',
      status: 'pendente',
      external_payment_id: paymentId,
      metadata: { mp_status: mpPayment.status, idempotency_key: idempotencyKey },
    });
  }

  console.log(`[payments] PIX payment created: ${paymentId} — waiting for webhook confirmation.`);

  return {
    paymentId,
    status: 'pendente',
    pixQrCode: pixData?.qr_code_base64,
    pixCopyPaste: pixData?.qr_code,
  };
}

// ─── Checkout Pro (credit/debit card) ─────────────────────────────────────────

async function _createCheckoutPreference(
  userId: string,
  appointmentId: string,
  payerEmail: string
): Promise<CreatePaymentResult> {
  const webhookUrl = env.API_BASE_URL
    ? `${env.API_BASE_URL}/api/payments/webhook`
    : undefined;

  const { data: preference } = await axios.post(
    `${MP_API}/checkout/preferences`,
    {
      items: [{
        title: 'Taxa de reserva — Studio Fernanda Correa',
        quantity: 1,
        unit_price: BOOKING_FEE,
        currency_id: 'BRL',
      }],
      payer: { email: payerEmail },
      external_reference: appointmentId,
      notification_url: webhookUrl,
      auto_return: 'approved',
      back_urls: {
        success: `${env.API_BASE_URL ?? 'https://studiofernandacorrea.com.br'}/pagamento/sucesso`,
        failure: `${env.API_BASE_URL ?? 'https://studiofernandacorrea.com.br'}/pagamento/falha`,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (hasSupabase) {
    const { supabase } = await import('../../config/supabase');
    await supabase.from('payments').insert({
      user_id: userId,
      appointment_id: appointmentId,
      amount: BOOKING_FEE,
      type: 'booking_fee',
      method: 'credit_card',
      status: 'pendente',
      mp_preference_id: preference.id,
      metadata: { preference_id: preference.id },
    });
  }

  return {
    paymentId: preference.id,
    status: 'pendente',
    preferenceId: preference.id,
    redirectUrl: preference.init_point,
  };
}

// ─── Trigger confirmation push ────────────────────────────────────────────────

async function _triggerConfirmationPush(userId: string, appointmentId: string): Promise<void> {
  if (!hasSupabase) return;

  const { supabase } = await import('../../config/supabase');
  const { data } = await supabase
    .from('appointments')
    .select('appointment_date, appointment_time, service:services(name)')
    .eq('id', appointmentId)
    .maybeSingle();

  if (!data) return;

  const appt = data as any;
  const serviceName = appt.service?.name ?? 'seu serviço';

  await pushService.appointmentConfirmed(
    userId,
    serviceName,
    appt.appointment_date,
    appt.appointment_time
  );
}
