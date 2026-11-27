// src/services/inventory/inventoryApi.ts
import { getApiAccessToken } from '../apiAuth';
import { companyCacheScope } from '../companySession';

const API_URL = import.meta.env.VITE_API_URL as string;

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly details?: { code?: string; storeUrl?: string }) {
    super(message);
  }
}

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
    return `${typeof json.sub === 'string' && json.sub ? json.sub : 'unknown'}:${companyCacheScope()}`;
  } catch {
    // A malformed token will be rejected by the API; keeping it partitioned
    // avoids accidentally sharing a cache entry while that happens.
    return `unknown:${companyCacheScope()}`;
  }
}

export async function inventoryApiRequest<T>(
  path: string,
  options: RequestInit = {},
  expectedCompany?: string
): Promise<T> {
  const accessToken = await getApiAccessToken();

  if (expectedCompany !== undefined && companyCacheScope() !== expectedCompany) {
    throw new DOMException('Company session changed', 'AbortError');
  }
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
    throw new ApiError(body.error || `Request failed: ${response.status}`, response.status, body);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function deleteInventoryRecord(path: string): Promise<void> {
  const company = companyCacheScope();
  for (let attempt = 0; ; attempt++) {
    try {
      if (companyCacheScope() !== company) throw new DOMException('Company session changed', 'AbortError');
      await inventoryApiRequest<void>(path, {
        method: 'DELETE',
        keepalive: true,
        signal: AbortSignal.timeout(15000),
      }, company);
      return;
    } catch (error) {
      const status = error instanceof ApiError ? error.status : undefined;
      if (status === 404) return;
      const retryable = status === 408 || status === 429 || (status !== undefined && status >= 500)
        || error instanceof TypeError || (error instanceof DOMException && error.name === 'TimeoutError');
      if (!retryable || attempt >= 3) throw error;
      await new Promise(resolve => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
}
