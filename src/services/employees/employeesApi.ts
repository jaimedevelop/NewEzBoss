// src/services/employees/employeesApi.ts
import { getApiAccessToken } from '../apiAuth';

const API_URL = import.meta.env.VITE_API_URL as string;

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

export async function employeesApiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_URL) throw new Error('Employee API is not configured');
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
    throw new ApiError(body.error || `Request failed: ${response.status}`, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const errorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;
