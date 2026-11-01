// src/services/estimates/estimatesApi.ts
import { getApiAccessToken } from '../apiAuth';

const API_URL = import.meta.env.VITE_API_URL as string;

export const DOCUMENTS_UPDATED_EVENT = 'ezboss:documents-updated';
let documentsRevision = 0;
// Each browser tab retains the version it loaded. Financial writes compare it
// under the API's parent-row lock; stale tabs must reload before overwriting.
const documentVersions = new Map<string, string>();
export const getDocumentsRevision = () => documentsRevision;

export class ApiError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}

export async function estimatesApiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getApiAccessToken();

  const documentId = path.match(/^\/estimates\/(\d+)(?:\/|$)/)?.[1];
  const mutation = !['GET', 'HEAD'].includes((options.method || 'GET').toUpperCase());
  const version = documentId ? documentVersions.get(documentId) : undefined;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(mutation && version ? { 'X-Document-Version': version } : {}),
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

  const confirmedVersion = response.headers?.get?.('X-Document-Version');
  if (documentId && confirmedVersion && Number.isFinite(Date.parse(confirmedVersion))) {
    const prior = documentVersions.get(documentId);
    if (!prior || Date.parse(confirmedVersion) >= Date.parse(prior)) documentVersions.set(documentId, confirmedVersion);
  }
  if (!['GET', 'HEAD'].includes((options.method || 'GET').toUpperCase())) {
    documentsRevision += 1;
    window.dispatchEvent(new Event(DOCUMENTS_UPDATED_EVENT));
  }
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  if (documentId && result && String(result.id) === documentId && typeof result.updatedAt === 'string') {
    const prior = documentVersions.get(documentId);
    if (!prior || Date.parse(result.updatedAt) >= Date.parse(prior)) documentVersions.set(documentId, result.updatedAt);
  }
  return result;
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
