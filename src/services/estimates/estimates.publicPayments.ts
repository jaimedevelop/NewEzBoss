// src/services/estimates/estimates.publicPayments.ts
//
// Public, token-authenticated payment actions for the no-login guest
// estimate view (ClientEstimateView.tsx). Mirrors estimates.clientPayments.ts
// but is keyed by the estimate's emailToken instead of a client-portal JWT,
// hitting the unauthenticated /estimates/public/by-token/:token routes.
import { estimatesPublicApiRequest } from './estimatesApi';
import type { PaymentRecord } from './estimates.types';

const basePath = (token: string) => `/estimates/public/by-token/${encodeURIComponent(token)}`;

export const createPublicStripeIntent = async (
  token: string,
  options?: { scheduleEntryId?: string }
): Promise<{ clientSecret: string; paymentId: string }> => {
  return estimatesPublicApiRequest(`${basePath(token)}/payments/stripe-intent`, {
    method: 'POST',
    body: JSON.stringify({ scheduleEntryId: options?.scheduleEntryId }),
  });
};

export const createPublicPaypalOrder = async (
  token: string,
  options?: { scheduleEntryId?: string }
): Promise<{ orderId: string; paymentId: string }> => {
  return estimatesPublicApiRequest(`${basePath(token)}/payments/paypal-order`, {
    method: 'POST',
    body: JSON.stringify({ scheduleEntryId: options?.scheduleEntryId }),
  });
};

export const capturePublicPaypalOrder = async (
  token: string,
  orderId: string,
  paymentId: string
): Promise<PaymentRecord> => {
  return estimatesPublicApiRequest(`${basePath(token)}/payments/paypal-capture`, {
    method: 'POST',
    body: JSON.stringify({ orderId, paymentId }),
  });
};

export const submitPublicCashClaim = async (
  token: string,
  params: { amount: number; scheduleEntryId?: string; notes?: string }
): Promise<PaymentRecord> => {
  return estimatesPublicApiRequest(`${basePath(token)}/payments/cash-claim`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
};

/** Guest confirms they've sent a Check (mailed/in person) or a Zelle transfer. */
export const submitPublicManualClaim = async (
  token: string,
  params: { amount: number; method: 'Check' | 'Zelle'; scheduleEntryId?: string; notes?: string }
): Promise<PaymentRecord> => {
  return estimatesPublicApiRequest(`${basePath(token)}/payments/manual-claim`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
};
