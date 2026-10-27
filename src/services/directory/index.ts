import { getApiAccessToken } from '../apiAuth';
import { companyCacheScope } from '../companySession';

export interface DirectoryIndustry { slug: string; name: string }
export interface DirectoryService { name: string; description: string; published: boolean }
export interface DirectoryProfile {
  slug: string;
  displayName: string;
  description: string;
  industries: string[];
  trades: string[];
  services: DirectoryService[];
  serviceArea: string;
  publicEmail: string;
  publicPhone: string;
  website: string;
  published: boolean;
}
export type DirectoryPublicProfile = Omit<DirectoryProfile, 'published'>;
export interface DirectorySearch { q?: string; industry?: string; page?: number; pageSize?: number }
export interface DirectorySearchResults { companies: DirectoryPublicProfile[]; total: number; page: number; pageSize: number }
export class DirectoryApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = 'DirectoryApiError'; }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const scope = companyCacheScope();
  const token = await getApiAccessToken();
  if (options.signal?.aborted || scope !== companyCacheScope()) throw new DOMException('Company session changed or request cancelled', 'AbortError');
  const response = await fetch(`${String(import.meta.env.VITE_API_URL).replace(/\/$/, '')}/directory${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new DirectoryApiError(data?.error || 'Unable to load the company directory. Please try again.', response.status);
  if (!data) throw new DirectoryApiError('The directory returned an unexpected response. Please try again.', response.status);
  return data as T;
}

export function getDirectoryIndustries(signal?: AbortSignal) {
  return request<{ industries: DirectoryIndustry[] }>('/industries', { signal });
}
export function searchDirectoryCompanies(search: DirectorySearch = {}, signal?: AbortSignal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) if (value !== undefined && value !== '') params.set(key, String(value));
  return request<DirectorySearchResults>(`/companies?${params}`, { signal });
}
export function getDirectoryCompany(slug: string, signal?: AbortSignal) {
  return request<DirectoryPublicProfile>(`/companies/${encodeURIComponent(slug)}`, { signal });
}
export function getDirectoryProfile(signal?: AbortSignal) { return request<DirectoryProfile>('/profile', { signal }); }
export function saveDirectoryProfile(profile: Omit<DirectoryProfile, 'slug'>, signal?: AbortSignal) {
  return request<DirectoryProfile>('/profile', { method: 'PUT', body: JSON.stringify(profile), signal });
}
