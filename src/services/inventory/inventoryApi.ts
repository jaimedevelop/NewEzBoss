// src/services/inventory/inventoryApi.ts
import { getApiAccessToken } from '../apiAuth';

const API_URL = import.meta.env.VITE_API_URL as string;

export class ApiError extends Error {}

/**
 * The API is the authority for ownership, but services need a stable, local
 * partition key before issuing a read.  `sub` is deliberately used only for
 * client cache partitioning; it is never sent as a user id to the API.
 */
export async function getAuthenticatedInventoryOwner(): Promise<string> {
  const token = await getApiAccessToken();
  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.sub === 'string' && json.sub ? json.sub : `token:${token.slice(-24)}`;
  } catch {
    // A malformed token will be rejected by the API; keeping it partitioned
    // avoids accidentally sharing a cache entry while that happens.
    return `token:${token.slice(-24)}`;
  }
}

export async function inventoryApiRequest<T>(
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
