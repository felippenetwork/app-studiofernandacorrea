import { supabase } from '../../config/supabase';
import { env, hasSupabase, hasMercadoPago } from '../../config/env';
import { DbPayment, PaymentMethod, BOOKING_FEE } from '../../types';
import { appointmentsRepository } from '../appointments/appointments.repository';

export interface CreatePaymentResult {
  paymentId: string;
  preferenceId?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  redirectUrl?: string;
  status: 'pendente' | 'aprovado';
}

export const paymentsService = {
  /**
   * Creates a booking fee payment (R$ 40) for an appointment.
   * Uses Mercado Pago when configured, otherwise simulates approval.
   */
  async createBookingFee(
    userId: string,
    appointmentId: string,
    method: PaymentMethod
  ): Promise<CreatePaymentResult> {
    // Validate appointment only when DB is available
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
   * Development/test mode — simulates instant payment approval.
   * Persists to DB when Supabase is configured; skips persistence otherwise.
   */
  async _simulatePayment(
    userId: string,
    appointmentId: string,
    method: PaymentMethod
  ): Promise<CreatePaymentResult> {
    const paymentId = `sim-${Date.now()}`;
    console.log(`[payments] Simulating approval — appointment: ${appointmentId}, method: ${method}`);

    if (hasSupabase) {
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
    } else {
      // Mock mode: just log — in-memory state updated by appointmentsService
      console.log(`[payments] Mock mode — no DB to update for ${appointmentId}`);
    }

    return { paymentId, status: 'aprovado' };
  },

  /**
   * Mercado Pago integration — creates preference and returns checkout data.
   * Install @mercadopago/sdk-js and implement when MP credentials are ready.
   */
  async _createMercadoPagoPayment(
    _userId: string,
    _appointmentId: string,
    _method: PaymentMethod
  ): Promise<CreatePaymentResult> {
    // Example skeleton (uncomment + install SDK to enable):
    // const mp = new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN! });
    // const preference = new Preference(mp);
    // const result = await preference.create({ body: {
    //   items: [{ title: 'Taxa de reserva — Studio Fernanda Correa', quantity: 1, unit_price: BOOKING_FEE }],
    //   back_urls: { success: '...', failure: '...' },
    //   notification_url: `${env.API_BASE_URL}/api/payments/webhook`,
    // }});
    // return { paymentId: result.id!, preferenceId: result.id!, redirectUrl: result.init_point!, status: 'pendente' };

    throw new Error(
      'Mercado Pago não configurado. Defina MP_ACCESS_TOKEN no .env para habilitar pagamentos reais.'
    );
  },

  /**
   * Processes Mercado Pago webhook — updates payment and appointment status.
   */
  async processWebhook(payload: Record<string, unknown>): Promise<void> {
    console.log('[payments] Webhook received:', payload);
    if (!hasSupabase) return;

    const externalPaymentId = (payload.data as any)?.id as string | undefined;
    if (!externalPaymentId) return;

    const { data: payment } = await supabase
      .from('payments')
      .select('id, appointment_id, status')
      .eq('external_payment_id', externalPaymentId)
      .maybeSingle();

    if (!payment) {
      console.warn('[payments] Payment not found for external ID:', externalPaymentId);
      return;
    }

    const mpStatus = payload.status as string;
    const newStatus =
      mpStatus === 'approved' ? 'aprovado'
      : mpStatus === 'rejected' ? 'recusado'
      : 'pendente';

    await supabase
      .from('payments')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', (payment as DbPayment).id);

    if (newStatus === 'aprovado') {
      await appointmentsRepository.confirmPayment(
        (payment as DbPayment).appointment_id,
        externalPaymentId
      );
      console.log(`[payments] Appointment ${(payment as DbPayment).appointment_id} confirmed via webhook.`);
    }
  },

  async refund(paymentId: string): Promise<void> {
    if (!hasMercadoPago) {
      console.log(`[payments] Mock refund for ${paymentId}`);
      return;
    }
    throw new Error('Refund not yet implemented.');
  },
};
