// src/services/estimates/estimates.clientPayments.ts
//
// Client-portal-authenticated payment actions (Stripe intent, PayPal
// order/capture, cash claim). Uses clientAuthRequest (client-portal JWT),
// distinct from estimatesApiRequest (contractor Auth0 JWT) used by
// estimates.mutations.ts's addPayment/deletePayment/reviewPayment.
import { clientAuthRequest } from '../clients/client.auth';
import type { PaymentRecord } from './estimates.types';

export const createStripeIntent = async (
  estimateId: string,
  options?: { scheduleEntryId?: string }
): Promise<{ clientSecret: string; paymentId: string }> => {
  return clientAuthRequest(`/clientPortal/estimates/${estimateId}/payments/stripe-intent`, {
    method: 'POST',
    body: JSON.stringify({ scheduleEntryId: options?.scheduleEntryId }),
  });
};

export const createPaypalOrder = async (
  estimateId: string,
  options?: { scheduleEntryId?: string }
): Promise<{ orderId: string; paymentId: string }> => {
  return clientAuthRequest(`/clientPortal/estimates/${estimateId}/payments/paypal-order`, {
    method: 'POST',
    body: JSON.stringify({ scheduleEntryId: options?.scheduleEntryId }),
  });
};

export const capturePaypalOrder = async (
  estimateId: string,
  orderId: string,
  paymentId: string
): Promise<PaymentRecord> => {
  return clientAuthRequest(`/clientPortal/estimates/${estimateId}/payments/paypal-capture`, {
    method: 'POST',
    body: JSON.stringify({ orderId, paymentId }),
  });
};

export const submitCashClaim = async (
  estimateId: string,
  params: { amount: number; scheduleEntryId?: string; notes?: string }
): Promise<PaymentRecord> => {
  return clientAuthRequest(`/clientPortal/estimates/${estimateId}/payments/cash-claim`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

/** Client confirms they've sent a Check (mailed/in person) or a Zelle transfer. */
export const submitManualClaim = async (
  estimateId: string,
  params: { amount: number; method: 'Check' | 'Zelle'; scheduleEntryId?: string; notes?: string }
): Promise<PaymentRecord> => {
  return clientAuthRequest(`/clientPortal/estimates/${estimateId}/payments/manual-claim`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
};
