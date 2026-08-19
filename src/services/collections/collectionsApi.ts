// src/services/collections/collectionsApi.ts
import { getApiAccessToken } from '../apiAuth';

const API_URL = import.meta.env.VITE_API_URL as string;

export class ApiError extends Error {}

export async function collectionsApiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getApiAccessToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.error || `Request failed: ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;
