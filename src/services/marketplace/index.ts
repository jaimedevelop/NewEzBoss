import { getApiAccessToken, getAuth0Client } from '../apiAuth';
import { companyCacheScope } from '../companySession';
import type { DirectoryPublicProfile } from '../directory';

export interface MarketplaceIdentity { id: string; email: string; name: string }
export interface MarketplaceCompany extends DirectoryPublicProfile { catalogFingerprint: string }
export interface ServiceAddress { address: string; address2: string; city: string; state: string; zipCode: string }
export interface Measurement { description: string; quantity: number; unit: 'sq-ft' | 'linear-ft' | 'each' | 'room' }
export interface RequestInput {
  title: string; scope: string; contactName: string; contactPhone: string;
  serviceAddress: ServiceAddress; selectedServiceNames: string[]; measurements: Measurement[];
}
export type RequestState = 'draft' | 'submitted' | 'under_review' | 'withdrawn' | 'declined' | 'converted';
export interface RequestAttachment { id: string; fileName: string; mimeType: string; size: number }
export interface EstimateRequest extends RequestInput {
  id: string; companySlug: string; companyName: string; state: RequestState; version: number;
  contactEmail: string; serviceSnapshot: { name: string; description: string }[];
  attachments: RequestAttachment[]; catalogFingerprint: string; declineReason: string;
  convertedEstimateId: string | null; createdAt: string; updatedAt: string; submittedAt: string | null;
}
export interface RequestPage { requests: EstimateRequest[]; total: number; page: number; pageSize: number }
export class MarketplaceApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string) { super(message); this.name = 'MarketplaceApiError'; }
}
const base = () => String(import.meta.env.VITE_API_URL).replace(/\/$/, '');
async function authenticatedFetch(path: string, options: RequestInit = {}, company = false) {
  const scope = companyCacheScope();
  const auth = getAuth0Client();
  const subject = (await auth.getUser())?.sub;
  const token = await getApiAccessToken();
  if (options.signal?.aborted || (await auth.getUser())?.sub !== subject || (company && scope !== companyCacheScope())) {
    throw new DOMException('Session changed or request cancelled', 'AbortError');
  }
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${base()}${company ? '/company/estimate-requests' : '/marketplace'}${path}`, { ...options, headers });
  if (options.signal?.aborted || (await auth.getUser())?.sub !== subject || (company && scope !== companyCacheScope())) {
    throw new DOMException('Session changed or request cancelled', 'AbortError');
  }
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new MarketplaceApiError(error?.error || 'Unable to complete this request. Please try again.', response.status, error?.code);
  }
  return response;
}
async function request<T>(path: string, options: RequestInit = {}, company = false): Promise<T> {
  const response = await authenticatedFetch(path, options, company);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
const json = (body: unknown, method = 'POST'): RequestInit => ({ method, body: JSON.stringify(body) });
const part = (value: string) => encodeURIComponent(value);
export const getMarketplaceIdentity = (signal?: AbortSignal) => request<MarketplaceIdentity>('/me', { signal });
export const searchMarketplaceCompanies = (input: { q?: string; industry?: string; page?: number } = {}, signal?: AbortSignal) => {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => { if (value) params.set(key, String(value)); });
  return request<{ companies: MarketplaceCompany[]; total: number; page: number; pageSize: number }>(`/companies?${params}`, { signal });
};
export const getMarketplaceCompany = (slug: string, signal?: AbortSignal) => request<MarketplaceCompany>(`/companies/${part(slug)}`, { signal });
export const listEstimateRequests = (page = 1, signal?: AbortSignal) => request<RequestPage>(`/estimate-requests?page=${page}`, { signal });
export const getEstimateRequest = (id: string, signal?: AbortSignal) => request<EstimateRequest>(`/estimate-requests/${part(id)}`, { signal });
export const createEstimateRequest = (companySlug: string, input: RequestInput) => request<EstimateRequest>('/estimate-requests', json({ companySlug, ...input }));
export const updateEstimateRequest = (id: string, version: number, input: RequestInput) => request<EstimateRequest>(`/estimate-requests/${part(id)}`, json({ version, ...input }, 'PATCH'));
export const deleteEstimateRequest = (id: string, version: number) => request<void>(`/estimate-requests/${part(id)}`, json({ version }, 'DELETE'));
export const submitEstimateRequest = (id: string, version: number, catalogFingerprint: string, idempotencyKey: string) => request<EstimateRequest>(`/estimate-requests/${part(id)}/submit`, json({ version, catalogFingerprint, acknowledgeSharing: true, idempotencyKey }));
export const withdrawEstimateRequest = (id: string, version: number) => request<EstimateRequest>(`/estimate-requests/${part(id)}/withdraw`, json({ version }));
export const uploadRequestPhoto = (id: string, version: number, file: File) => {
  const form = new FormData(); form.set('version', String(version)); form.set('file', file);
  return request<EstimateRequest>(`/estimate-requests/${part(id)}/attachments`, { method: 'POST', body: form });
};
export const deleteRequestPhoto = (id: string, attachmentId: string, version: number) => request<EstimateRequest>(`/estimate-requests/${part(id)}/attachments/${part(attachmentId)}`, json({ version }, 'DELETE'));
export const downloadRequestPhoto = async (id: string, attachmentId: string, company = false) => {
  const response = await authenticatedFetch(`${company ? '' : '/estimate-requests'}/${part(id)}/attachments/${part(attachmentId)}`, {}, company);
  return response.blob();
};
export const listCompanyRequests = (page = 1, signal?: AbortSignal) => request<RequestPage>(`?page=${page}`, { signal }, true);
export const getCompanyRequest = (id: string, signal?: AbortSignal) => request<EstimateRequest>(`/${part(id)}`, { signal }, true);
export const reviewCompanyRequest = (id: string, version: number, action: 'review' | 'decline', reason = '') => request<EstimateRequest>(`/${part(id)}/review`, json({ version, action, reason }), true);
export const convertCompanyRequest = (id: string, version: number, client: { createClient: true } | { clientId: number }) => request<{ request: EstimateRequest; estimateId: string }>(`/${part(id)}/convert`, json({ version, ...client }), true);
