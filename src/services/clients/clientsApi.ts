// src/services/clients/clientsApi.ts
import { getApiAccessToken } from '../apiAuth';

const API_URL = import.meta.env.VITE_API_URL as string;

export const CLIENTS_UPDATED_EVENT = 'ezboss:clients-updated';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function clientsApiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getApiAccessToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.error || `Request failed: ${response.status}`, response.status);
  }

  if (!['GET', 'HEAD'].includes((options.method || 'GET').toUpperCase())) {
    window.dispatchEvent(new Event(CLIENTS_UPDATED_EVENT));
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;
