/**
 * PaymentsService — Mercado Pago integration for booking fee collection.
 *
 * Flow:
 * 1. Client selects service, professional, date/time
 * 2. Backend creates MP preference for R$ 40,00
 * 3. Client completes payment on MP
 * 4. MP sends webhook to /api/payments/webhook
 * 5. Backend marks appointment as 'confirmado'
 * 6. Push notification sent to client
 *
 * TODO ETAPA 2: implement using @mercadopago/sdk-js (backend SDK)
 */
export class PaymentsService {
  async createBookingFeePreference(
    _appointmentId: string,
    _userId: string,
    _amount: number = 40.00
  ): Promise<{ preferenceId: string; initPoint: string }> {
    // TODO ETAPA 2: create MP payment preference
    throw new Error('Not implemented yet');
  }

  async processWebhook(_payload: unknown): Promise<void> {
    // TODO ETAPA 2: validate signature, update payment + appointment status
    throw new Error('Not implemented yet');
  }

  async refundPayment(_paymentId: string): Promise<void> {
    // TODO ETAPA 2: issue refund via MP
    throw new Error('Not implemented yet');
  }
}

export const paymentsService = new PaymentsService();
