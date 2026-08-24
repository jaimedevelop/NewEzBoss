import { type Estimate } from '../estimates/estimates.types';
import { apiRowToEstimate, type ApiEstimateRow } from '../estimates/estimates.mapper';

const API_URL = import.meta.env.VITE_API_URL as string;
const TOKEN_STORAGE_KEY = 'ezboss_client_portal_token';

export interface ClientUser {
  uid: string; // clientUsers.id, kept as string for parity with the old Firebase uid
  email: string;
  name: string;
  contractorUserId: string; // clientUsers.clientId (the owner's clients row this login belongs to)
  createdAt?: Date;
}

export interface CreateClientAccountParams {
  email: string;
  name: string;
  contractorUserId: string;
  temporaryPassword: string;
}

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

async function clientAuthRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

interface ClientUserDto {
  id: number;
  email: string;
  name: string;
  clientId: number;
  mustResetPassword: boolean;
}

function toClientUser(dto: ClientUserDto): ClientUser {
  return {
    uid: String(dto.id),
    email: dto.email,
    name: dto.name,
    contractorUserId: String(dto.clientId),
  };
}

export const createClientAccount = async ({
  email,
  name,
  contractorUserId,
  temporaryPassword,
}: CreateClientAccountParams): Promise<string | null> => {
  try {
    const result = await clientAuthRequest<{ id: number; alreadyExists: boolean }>('/clientAuth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, name, clientId: Number(contractorUserId), temporaryPassword }),
    });
    return String(result.id);
  } catch (err) {
    console.error('Error creating client account:', err);
    throw new Error('Failed to create client account');
  }
};

export const signInClient = async (email: string, password: string): Promise<ClientUser> => {
  try {
    const result = await clientAuthRequest<{ token: string; clientUser: ClientUserDto }>('/clientAuth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(result.token);
    return toClientUser(result.clientUser);
  } catch (err: any) {
    setStoredToken(null);
    throw new Error(err?.message || 'Invalid email or password.');
  }
};

export const signOutClient = async (): Promise<void> => {
  try {
    await clientAuthRequest('/clientAuth/logout', { method: 'POST' });
  } finally {
    setStoredToken(null);
  }
};

export const getClientUserByUid = async (_uid: string): Promise<ClientUser | null> => {
  try {
    const dto = await clientAuthRequest<ClientUserDto>('/clientAuth/me');
    return toClientUser(dto);
  } catch (err) {
    console.error('Error fetching client user:', err);
    return null;
  }
};

export const getClientUserByEmail = async (_email: string): Promise<ClientUser | null> => {
  // The backend only exposes "me" (the authenticated client), not
  // lookup-by-arbitrary-email; kept for API parity with the old export.
  return getClientUserByUid('');
};

export const getClientEstimates = async (
  _clientEmail: string,
  _contractorUserId: string
): Promise<(Estimate & { id: string })[]> => {
  try {
    const rows = await clientAuthRequest<ApiEstimateRow[]>('/clientPortal/estimates');
    return rows.map((row) => apiRowToEstimate(row) as Estimate & { id: string });
  } catch (err) {
    console.error('Error fetching client estimates:', err);
    throw new Error('Failed to load estimates');
  }
};
