// src/lib/apiClient.ts
import { useAuth0 } from '@auth0/auth0-react';
import { useMemo } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export function useApiClient() {
  const { getAccessTokenSilently } = useAuth0();

  return useMemo(() => {
    async function request(path: string, options: RequestInit = {}) {
      const token = await getAccessTokenSilently();
      const res = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed: ${res.status}`);
      }
      return res.json();
    }

    return { get: (p: string) => request(p), post: (p: string, body: any) => request(p, { method: 'POST', body: JSON.stringify(body) }), delete: (p: string) => request(p, { method: 'DELETE' }) };
  }, [getAccessTokenSilently]);
}