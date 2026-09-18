// src/services/stripeConnect/stripeConnect.ts
//
// Contractor-side Stripe Connect (Express account) onboarding, mirrors
// profile.files.ts's fetch pattern (Auth0 bearer token via getApiAccessToken).
import { getApiAccessToken } from '../apiAuth';

const API_URL = import.meta.env.VITE_API_URL as string;

export type StripeConnectStatus = 'not_connected' | 'onboarding' | 'active' | 'restricted';

export interface StripeConnectStatusResponse {
  status: StripeConnectStatus;
  chargesEnabled: boolean;
  transfersEnabled: boolean;
  payoutsEnabled: boolean;
  paymentPolicy?: { basisPoints: number; fixedCents: number; currency: "usd"; creationEnabled: boolean };
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const accessToken = await getApiAccessToken();
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getConnectStatus(): Promise<StripeConnectStatusResponse> {
  const response = await authedFetch('/stripeConnect/status');
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Failed to fetch Stripe Connect status: ${response.status}`);
  }
  return response.json();
}

export async function getOnboardingLink(): Promise<string> {
  const response = await authedFetch('/stripeConnect/onboarding-link', { method: 'POST' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Failed to start Stripe onboarding: ${response.status}`);
  }
  const body = await response.json();
  return body.url;
}

export async function getManageLink(): Promise<string> {
  const response = await authedFetch('/stripeConnect/manage-link', { method: 'POST' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Failed to open Stripe account: ${response.status}`);
  }
  const body = await response.json();
  return body.url;
}
