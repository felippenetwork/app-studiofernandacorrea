import { env, hasSupabase, hasGetnet } from '../../config/env';
import { DbPayment, PaymentMethod, BOOKING_FEE } from '../../types';
import { appointmentsRepository } from '../appointments/appointments.repository';
import { pushService } from '../../services/push.service';
import { trinksService } from '../trinks/trinks.service';
import { getnetPost } from './getnet.client';

export interface CardData {
  number: string;       // digits only
  holderName: string;
  expiryMonth: string;  // "MM"
  expiryYear: string;   // "YYYY"
  cvv: string;
  brand?: string;
}

export interface CreatePaymentResult {
  paymentId: string;
  status: 'pendente' | 'aprovado';
  pixQrCode?: string;
  pixCopyPaste?: string;
  redirectUrl?: string;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const paymentsService = {
  async createBookingFee(
    userId: string,
    appointmentId: string,
    method: PaymentMethod,
    cardData?: CardData
  ): Promise<CreatePaymentResult> {
    if (hasSupabase) {
      const appointment = await appointmentsRepository.findById(appointmentId, userId);
      if (!appointment) throw new Error('Agendamento não encontrado.');
      if (appointment.payment_status === 'aprovado') {
        throw new Error('Taxa de reserva já foi paga para este agendamento.');
      }
    }

    if (!hasGetnet) {
      return paymentsService._simulatePayment(userId, appointmentId, method);
    }

    return paymentsService._createGetnetPayment(userId, appointmentId, method, cardData);
  },

  async _simulatePayment(
    userId: string,
    appointmentId: string,
    method: PaymentMethod
  ): Promise<CreatePaymentResult> {
    const externalId = `sim-${Date.now()}`;
    console.log(`[payments] ⚡ Simulating approval — appt: ${appointmentId}, method: ${method}`);

    if (hasSupabase) {
      const { supabase } = await import('../../config/supabase');

      const { data: apptRow } = await supabase
        .from('appointments')
        .select('booking_fee')
        .eq('id', appointmentId)
        .single();
      const amount = (apptRow as any)?.booking_fee ?? BOOKING_FEE;

      const { data: payRow } = await supabase.from('payments').insert({
        user_id: userId,
        appointment_id: appointmentId,
        amount,
        type: 'booking_fee',
        method,
        status: 'aprovado',
        external_payment_id: externalId,
      }).select('id').single();

      const paymentId = (payRow as any)?.id ?? externalId;
      await appointmentsRepository.confirmPayment(appointmentId, paymentId);

      _syncToTrinks(appointmentId).catch(() => {});
      await _triggerConfirmationPush(userId, appointmentId).catch(() => {});

      return { paymentId, status: 'aprovado' };
    }

    return { paymentId: externalId, status: 'aprovado' };
  },

  async _createGetnetPayment(
    userId: string,
    appointmentId: string,
    method: PaymentMethod,
    cardData?: CardData
  ): Promise<CreatePaymentResult> {
    let payerEmail = 'cliente@studiofernandacorrea.com.br';
    let payerName = 'Cliente';

    if (hasSupabase) {
      const { supabase } = await import('../../config/supabase');
      const { data: user } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', userId)
        .maybeSingle();
      if (user) {
        payerEmail = (user as any).email ?? payerEmail;
        payerName = (user as any).name ?? payerName;
      }
    }

    // Fetch actual booking fee from appointment row
    let amount = BOOKING_FEE;
    if (hasSupabase) {
      const { supabase } = await import('../../config/supabase');
      const { data: apptRow } = await supabase
        .from('appointments')
        .select('booking_fee')
        .eq('id', appointmentId)
        .single();
      amount = (apptRow as any)?.booking_fee ?? BOOKING_FEE;
    }

    // Getnet uses centavos (cents)
    const amountCents = Math.round(amount * 100);

    if (method === 'pix') {
      return _createGetnetPix(userId, appointmentId, amountCents, payerEmail, amount);
    }

    if (!cardData) {
      throw new Error('Dados do cartão são obrigatórios para pagamento com cartão.');
    }

    if (method === 'credit_card') {
      return _createGetnetCredit(userId, appointmentId, amountCents, payerEmail, payerName, cardData, amount);
    }

    return _createGetnetDebit(userId, appointmentId, amountCents, payerEmail, payerName, cardData, amount);
  },

  async processWebhook(payload: Record<string, unknown>): Promise<void> {
    console.log('[payments] Webhook received:', JSON.stringify(payload).slice(0, 300));
    if (!hasSupabase) return;

    // Getnet webhook payload shape:
    // { payment_id, seller_id, amount, status, payment_type, order_id }
    const getnetPaymentId = payload.payment_id as string | undefined;
    const getnetStatus   = (payload.status as string | undefined)?.toUpperCase();

    if (!getnetPaymentId || !getnetStatus) {
      console.warn('[payments] Webhook: missing payment_id or status');
      return;
    }

    const { supabase } = await import('../../config/supabase');
    const { data: payment } = await supabase
      .from('payments')
      .select('id, appointment_id, user_id, status')
      .eq('external_payment_id', getnetPaymentId)
      .maybeSingle();

    if (!payment) {
      console.warn('[payments] Webhook: payment not found for id:', getnetPaymentId);
      return;
    }

    const dbPayment = payment as DbPayment;

    // AUTHORIZED (credit pre-auth) and CONFIRMED both count as approved
    const newStatus =
      getnetStatus === 'CONFIRMED' || getnetStatus === 'AUTHORIZED' ? 'aprovado'
      : getnetStatus === 'DENIED' || getnetStatus === 'CANCELED' || getnetStatus === 'ERROR' ? 'recusado'
      : 'pendente';

    await supabase
      .from('payments')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', dbPayment.id);

    if (newStatus === 'aprovado') {
      await appointmentsRepository.confirmPayment(dbPayment.appointment_id, getnetPaymentId);
      console.log(`[payments] ✓ Appointment ${dbPayment.appointment_id} confirmed via Getnet webhook.`);
      _syncToTrinks(dbPayment.appointment_id).catch(() => {});
      await _triggerConfirmationPush(dbPayment.user_id, dbPayment.appointment_id).catch(() => {});
    }
  },

  async refund(paymentId: string): Promise<void> {
    if (!hasGetnet) {
      console.log(`[payments] Mock refund for ${paymentId}`);
      return;
    }
    await getnetPost(`/v1/payments/cancel/request`, {
      payment_id: paymentId,
      seller_id: env.GETNET_SELLER_ID,
      cancel_custom_key: `refund-${paymentId}-${Date.now()}`,
    });
  },
};

// ─── Getnet PIX ───────────────────────────────────────────────────────────────

async function _createGetnetPix(
  userId: string,
  appointmentId: string,
  amountCents: number,
  payerEmail: string,
  amountBrl: number
): Promise<CreatePaymentResult> {
  const res = await getnetPost<any>('/v1/payments/pix', {
    seller_id: env.GETNET_SELLER_ID,
    amount: amountCents,
    currency: 'BRL',
    order_id: appointmentId,
    customer: {
      customer_id: userId,
      email: payerEmail,
    },
    pix: {
      expiration_time: 3600,
    },
  });

  const paymentId = String(res.payment_id);

  if (hasSupabase) {
    const { supabase } = await import('../../config/supabase');
    await supabase.from('payments').insert({
      user_id: userId,
      appointment_id: appointmentId,
      amount: amountBrl,
      type: 'booking_fee',
      method: 'pix',
      status: 'pendente',
      external_payment_id: paymentId,
      metadata: { getnet_status: res.status },
    });
  }

  console.log(`[payments] Getnet PIX created: ${paymentId}`);

  return {
    paymentId,
    status: 'pendente',
    pixQrCode: res.pix?.qr_code_image,
    pixCopyPaste: res.pix?.qr_code,
  };
}

// ─── Getnet Credit Card ───────────────────────────────────────────────────────

async function _createGetnetCredit(
  userId: string,
  appointmentId: string,
  amountCents: number,
  payerEmail: string,
  payerName: string,
  cardData: CardData,
  amountBrl: number
): Promise<CreatePaymentResult> {
  // 1. Tokenize the card number
  const tokenRes = await getnetPost<any>('/v1/tokens/card', {
    card_number: cardData.number.replace(/\s/g, ''),
    customer_id: userId,
  });
  const numberToken: string = tokenRes.number_token;

  // 2. Charge the token
  const [firstName, ...rest] = payerName.split(' ');
  const lastName = rest.join(' ') || firstName;

  const res = await getnetPost<any>('/v1/payments/credit', {
    seller_id: env.GETNET_SELLER_ID,
    amount: amountCents,
    currency: 'BRL',
    order_id: appointmentId,
    customer: {
      customer_id: userId,
      email: payerEmail,
      first_name: firstName,
      last_name: lastName,
    },
    credit: {
      delayed: false,
      save_card_data: false,
      transaction_type: 'FULL',
      number_installments: 1,
      card: {
        number_token: numberToken,
        cardholder_name: cardData.holderName,
        security_code: cardData.cvv,
        brand: cardData.brand ?? _detectBrand(cardData.number),
        expiration_month: cardData.expiryMonth,
        expiration_year: cardData.expiryYear,
      },
    },
  });

  const paymentId = String(res.payment_id);
  const getnetStatus: string = (res.status ?? '').toUpperCase();

  if (getnetStatus === 'DENIED' || getnetStatus === 'ERROR') {
    const reason = res.credit?.reason_message ?? 'Cartão recusado.';
    throw new Error(`Pagamento recusado: ${reason}`);
  }

  const approved = getnetStatus === 'APPROVED' || getnetStatus === 'AUTHORIZED';

  if (hasSupabase) {
    const { supabase } = await import('../../config/supabase');
    const { data: payRow } = await supabase.from('payments').insert({
      user_id: userId,
      appointment_id: appointmentId,
      amount: amountBrl,
      type: 'booking_fee',
      method: 'credit_card',
      status: approved ? 'aprovado' : 'pendente',
      external_payment_id: paymentId,
      metadata: { getnet_status: res.status, authorization_code: res.credit?.authorization_code },
    }).select('id').single();

    if (approved) {
      const dbId = (payRow as any)?.id ?? paymentId;
      await appointmentsRepository.confirmPayment(appointmentId, dbId);
      _syncToTrinks(appointmentId).catch(() => {});
      await _triggerConfirmationPush(userId, appointmentId).catch(() => {});
    }
  }

  console.log(`[payments] Getnet credit: ${paymentId} → ${res.status}`);
  return { paymentId, status: approved ? 'aprovado' : 'pendente' };
}

// ─── Getnet Debit Card (3DS) ──────────────────────────────────────────────────

async function _createGetnetDebit(
  userId: string,
  appointmentId: string,
  amountCents: number,
  payerEmail: string,
  payerName: string,
  cardData: CardData,
  amountBrl: number
): Promise<CreatePaymentResult> {
  // Tokenize card
  const tokenRes = await getnetPost<any>('/v1/tokens/card', {
    card_number: cardData.number.replace(/\s/g, ''),
    customer_id: userId,
  });
  const numberToken: string = tokenRes.number_token;

  const [firstName, ...rest] = payerName.split(' ');
  const lastName = rest.join(' ') || firstName;

  const res = await getnetPost<any>('/v1/payments/debit', {
    seller_id: env.GETNET_SELLER_ID,
    amount: amountCents,
    currency: 'BRL',
    order_id: appointmentId,
    customer: {
      customer_id: userId,
      email: payerEmail,
      first_name: firstName,
      last_name: lastName,
    },
    debit: {
      card: {
        number_token: numberToken,
        cardholder_name: cardData.holderName,
        security_code: cardData.cvv,
        brand: cardData.brand ?? _detectBrand(cardData.number),
        expiration_month: cardData.expiryMonth,
        expiration_year: cardData.expiryYear,
      },
    },
  });

  const paymentId = String(res.payment_id);
  const redirectUrl: string | undefined = res.debit?.redirect_url;

  if (hasSupabase) {
    const { supabase } = await import('../../config/supabase');
    await supabase.from('payments').insert({
      user_id: userId,
      appointment_id: appointmentId,
      amount: amountBrl,
      type: 'booking_fee',
      method: 'debit_card',
      status: 'pendente',
      external_payment_id: paymentId,
      metadata: { getnet_status: res.status, redirect_url: redirectUrl },
    });
  }

  console.log(`[payments] Getnet debit: ${paymentId}, 3DS redirect: ${redirectUrl ?? 'none'}`);

  return { paymentId, status: 'pendente', redirectUrl };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _detectBrand(cardNumber: string): string {
  const n = cardNumber.replace(/\s/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^(636368|438935|504175|451416|636297|5067|4576|4011)/.test(n)) return 'Elo';
  if (/^(606282|3841)/.test(n)) return 'Hipercard';
  return 'Mastercard'; // safe fallback for Brazilian market
}

async function _syncToTrinks(appointmentId: string): Promise<void> {
  if (!hasSupabase) return;

  const { supabase } = await import('../../config/supabase');
  const { data } = await supabase
    .from('appointments')
    .select(`
      id, service_id, professional_id, appointment_date, appointment_time,
      user:users(name, phone, email)
    `)
    .eq('id', appointmentId)
    .maybeSingle();

  if (!data) return;

  const appt = data as any;
  const user = appt.user;

  trinksService.createAppointment({
    serviceId: String(appt.service_id),
    professionalId: String(appt.professional_id),
    date: appt.appointment_date,
    time: appt.appointment_time,
    clientName: user?.name,
    clientPhone: user?.phone,
    clientEmail: user?.email,
  }).then(async (result: { id?: string }) => {
    if (result?.id) {
      await appointmentsRepository.updateTrinksId(appointmentId, result.id);
      console.log(`[payments] ✓ Trinks appointment created: ${result.id} → ${appointmentId}`);
    }
  }).catch((err: Error) => {
    console.warn('[payments] Trinks sync failed (non-fatal):', err.message);
  });
}

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
  await pushService.appointmentConfirmed(
    userId,
    appt.service?.name ?? 'seu serviço',
    appt.appointment_date,
    appt.appointment_time
  );
}
