// src/services/clients/clients.queries.ts

import { clientsApiRequest, ApiError } from './clientsApi';
import type { Client, ClientFilters, ClientsResponse, DatabaseResult } from './clients.types';

interface ApiClientRow {
  id: number;
  name: string;
  email: string | null;
  phoneMobile: string | null;
  phoneOther: string | null;
  companyName: string | null;
  clientType: string | null;
  notes: string | null;
  billingAddress: string | null;
  billingAddress2: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingZipCode: string | null;
  billingEqualToService: boolean;
  serviceAddress: string | null;
  serviceAddress2: string | null;
  serviceCity: string | null;
  serviceState: string | null;
  serviceZipCode: string | null;
  isComplete: boolean;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

function apiRowToClient(row: ApiClientRow): Client {
  return {
    id: String(row.id),
    name: row.name,
    email: row.email ?? undefined,
    phoneMobile: row.phoneMobile ?? undefined,
    phoneOther: row.phoneOther ?? undefined,
    companyName: row.companyName ?? undefined,
    clientType: row.clientType ?? undefined,
    notes: row.notes ?? undefined,
    billingAddress: row.billingAddress ?? undefined,
    billingAddress2: row.billingAddress2 ?? undefined,
    billingCity: row.billingCity ?? undefined,
    billingState: row.billingState ?? undefined,
    billingZipCode: row.billingZipCode ?? undefined,
    billingEqualToService: row.billingEqualToService,
    serviceAddress: row.serviceAddress ?? undefined,
    serviceAddress2: row.serviceAddress2 ?? undefined,
    serviceCity: row.serviceCity ?? undefined,
    serviceState: row.serviceState ?? undefined,
    serviceZipCode: row.serviceZipCode ?? undefined,
    isComplete: row.isComplete,
    userId: String(row.userId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Get a single client by ID
 */
export const getClient = async (clientId: string): Promise<DatabaseResult<Client>> => {
  try {
    const row = await clientsApiRequest<ApiClientRow>(`/clients/${clientId}`);
    return { success: true, data: apiRowToClient(row) };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: 'Client not found' };
    }
    console.error('Error fetching client:', error);
    return { success: false, error: 'Failed to fetch client' };
  }
};

/**
 * Get all clients for a user with optional filtering
 */
export const getClients = async (
  _userId: string,
  filters?: ClientFilters,
  pageSize: number = 50,
  offset: number = 0
): Promise<DatabaseResult<ClientsResponse>> => {
  try {
    const params = new URLSearchParams();
    if (filters?.searchTerm) params.set('searchTerm', filters.searchTerm);
    if (filters?.clientType) params.set('clientType', filters.clientType);
    params.set('pageSize', String(pageSize));
    params.set('offset', String(offset));

    const result = await clientsApiRequest<{ clients: ApiClientRow[]; hasMore: boolean; totalCount?: number }>(
      `/clients/list?${params.toString()}`
    );

    return {
      success: true,
      data: {
        clients: result.clients.map(apiRowToClient),
        hasMore: result.hasMore,
        totalCount: result.totalCount,
      },
    };
  } catch (error) {
    console.error('Error fetching clients:', error);
    return { success: false, error: 'Failed to fetch clients' };
  }
};

/**
 * Search clients by name (case-insensitive)
 */
export const searchClients = async (
  userId: string,
  searchTerm: string
): Promise<DatabaseResult<Client[]>> => {
  try {
    const result = await getClients(userId, { searchTerm });

    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.clients
      };
    }

    return { success: false, error: result.error };
  } catch (error) {
    console.error('Error searching clients:', error);
    return { success: false, error: 'Failed to search clients' };
  }
};

/**
 * Get clients grouped by first letter of name (for alphabetical tabs)
 */
export const getClientsGroupedByLetter = async (
  _userId: string
): Promise<DatabaseResult<Record<string, Client[]>>> => {
  try {
    const rows = await clientsApiRequest<Record<string, ApiClientRow[]>>('/clients');
    const grouped: Record<string, Client[]> = {};
    for (const [letter, clients] of Object.entries(rows)) {
      grouped[letter] = clients.map(apiRowToClient);
    }
    return { success: true, data: grouped };
  } catch (error) {
    console.error('Error grouping clients:', error);
    return { success: false, error: 'Failed to group clients' };
  }
};
