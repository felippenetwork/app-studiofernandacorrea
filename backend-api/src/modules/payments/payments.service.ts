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
   * Creates a booking fee payment (R$ 40,00) for an appointment.
   * When Mercado Pago is configured, creates a real preference.
   * When not, simulates approval for development.
   */
  async createBookingFee(
    userId: string,
    appointmentId: string,
    method: PaymentMethod
  ): Promise<CreatePaymentResult> {
    // Validate appointment exists and belongs to user
    const appointment = await appointmentsRepository.findById(appointmentId, userId);
    if (!appointment) throw new Error('Agendamento não encontrado.');
    if (appointment.payment_status === 'aprovado') {
      throw new Error('Taxa de reserva já foi paga para este agendamento.');
    }

    if (!hasMercadoPago) {
      return paymentsService._simulatePayment(userId, appointmentId, method);
    }

    return paymentsService._createMercadoPagoPayment(userId, appointmentId, method);
  },

  /**
   * Development/test mode: simulates instant payment approval.
   * Replace with real Mercado Pago integration in production.
   */
  async _simulatePayment(
    userId: string,
    appointmentId: string,
    method: PaymentMethod
  ): Promise<CreatePaymentResult> {
    const paymentId = `sim-${Date.now()}`;
    console.log(`[payments] Simulating payment approval for appointment ${appointmentId}`);

    if (hasSupabase) {
      // Persist payment record
      await supabase.from('payments').insert({
        user_id: userId,
        appointment_id: appointmentId,
        amount: BOOKING_FEE,
        type: 'booking_fee',
        method,
        status: 'aprovado',
        external_payment_id: paymentId,
      });

      // Confirm appointment
      await appointmentsRepository.confirmPayment(appointmentId, paymentId);
    }

    return {
      paymentId,
      status: 'aprovado',
    };
  },

  /**
   * Mercado Pago integration.
   * Creates a payment preference and returns checkout data.
   * The mobile app displays the checkout URL or PIX QR code.
   *
   * TODO: Install @mercadopago/sdk-js and implement full flow.
   */
  async _createMercadoPagoPayment(
    userId: string,
    appointmentId: string,
    method: PaymentMethod
  ): Promise<CreatePaymentResult> {
    // Placeholder — implement with official MP SDK in production
    // const mp = new MercadoPagoConfig({ accessToken: env.MP_ACCESS_TOKEN! });
    // const preference = new Preference(mp);
    // const result = await preference.create({ body: { ... } });

    throw new Error(
      '[payments] Mercado Pago integration not yet implemented. ' +
        'Set hasMercadoPago=false to use simulation mode.'
    );
  },

  /**
   * Processes Mercado Pago webhook notification.
   * Called when MP notifies our backend of a payment status change.
   */
  async processWebhook(payload: Record<string, unknown>): Promise<void> {
    console.log('[payments] Webhook received:', payload);

    const externalPaymentId = payload.data?.id as string;
    if (!externalPaymentId || !hasSupabase) return;

    // Find payment by external ID
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

    // Update payment status
    await supabase
      .from('payments')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', (payment as DbPayment).id);

    // If approved, confirm appointment
    if (newStatus === 'aprovado') {
      await appointmentsRepository.confirmPayment(
        (payment as DbPayment).appointment_id,
        externalPaymentId
      );
      console.log(`[payments] Appointment ${(payment as DbPayment).appointment_id} confirmed.`);
    }
  },

  async refund(paymentId: string): Promise<void> {
    if (!hasMercadoPago) {
      console.log(`[payments] Mock refund for payment ${paymentId}`);
      return;
    }
    // TODO: implement MP refund API call
    throw new Error('Refund not implemented yet.');
  },
};
