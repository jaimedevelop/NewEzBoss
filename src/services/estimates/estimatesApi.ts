// src/services/estimates/estimatesApi.ts
import { getApiAccessToken } from '../apiAuth';

const API_URL = import.meta.env.VITE_API_URL as string;

export const DOCUMENTS_UPDATED_EVENT = 'ezboss:documents-updated';
let documentsRevision = 0;
export const getDocumentsRevision = () => documentsRevision;

export class ApiError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}

export async function estimatesApiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getApiAccessToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      // The browser supplies the multipart boundary for FormData uploads.
      // Setting JSON here makes file uploads unreadable by the API.
      ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.error || `Request failed: ${response.status}`, response.status);
  }

  if (!['GET', 'HEAD'].includes((options.method || 'GET').toUpperCase())) {
    documentsRevision += 1;
    window.dispatchEvent(new Event(DOCUMENTS_UPDATED_EVENT));
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

// Public/token-authenticated requests (client view) — no JWT.
export async function estimatesPublicApiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(body.error || `Request failed: ${response.status}`, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;
