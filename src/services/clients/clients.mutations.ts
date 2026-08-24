// src/services/clients/clients.mutations.ts

import { clientsApiRequest } from './clientsApi';
import type { Client, DatabaseResult } from './clients.types';

const SCALAR_FIELDS = [
  'name',
  'email',
  'phoneMobile',
  'phoneOther',
  'companyName',
  'clientType',
  'notes',
  'billingAddress',
  'billingAddress2',
  'billingCity',
  'billingState',
  'billingZipCode',
  'billingEqualToService',
  'serviceAddress',
  'serviceAddress2',
  'serviceCity',
  'serviceState',
  'serviceZipCode',
] as const;

function pickScalarFields(data: Partial<Client>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const key of SCALAR_FIELDS) {
    if (data[key] !== undefined) body[key] = data[key];
  }
  return body;
}

/**
 * Create a new client
 */
export const createClient = async (
  clientData: Partial<Client>,
  _userId: string
): Promise<DatabaseResult<string>> => {
  try {
    const body = pickScalarFields(clientData);

    const row = await clientsApiRequest<{ id: number }>('/clients', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return { success: true, data: String(row.id) };
  } catch (error) {
    console.error('Error creating client:', error);
    return { success: false, error: 'Failed to create client' };
  }
};

/**
 * Bulk-create clients (e.g. from a file import). Rows without a name are
 * skipped server-side; the response reports how many were skipped.
 */
export const bulkCreateClients = async (
  clientsData: Partial<Client>[]
): Promise<DatabaseResult<{ created: Client[]; skipped: number }>> => {
  try {
    const clients = clientsData.map(pickScalarFields);

    const result = await clientsApiRequest<{ clients: Client[]; skipped: number }>('/clients/bulk', {
      method: 'POST',
      body: JSON.stringify({ clients }),
    });

    return { success: true, data: { created: result.clients, skipped: result.skipped } };
  } catch (error) {
    console.error('Error bulk creating clients:', error);
    return { success: false, error: 'Failed to import clients' };
  }
};

/**
 * Update an existing client
 */
export const updateClient = async (
  clientId: string,
  clientData: Partial<Client>
): Promise<DatabaseResult> => {
  try {
    const body = pickScalarFields(clientData);

    await clientsApiRequest(`/clients/${clientId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating client:', error);
    return { success: false, error: 'Failed to update client' };
  }
};

/**
 * Delete a client
 */
export const deleteClient = async (clientId: string): Promise<DatabaseResult> => {
  try {
    await clientsApiRequest(`/clients/${clientId}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    console.error('Error deleting client:', error);
    return { success: false, error: 'Failed to delete client' };
  }
};

/**
 * Validate phone number (basic US format validation)
 */
export const validatePhoneNumber = (phone: string): boolean => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Check if it's 10 digits (US phone number)
  return cleaned.length === 10;
};

/**
 * Format phone number for display (XXX) XXX-XXXX
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length !== 10) {
    return phone;
  }

  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
};

/**
 * Check if a client has all required fields filled
 */
export const isClientComplete = (client: Partial<Client>): boolean => {
  // Check basic required fields
  const hasBasicInfo = !!(
    client.name?.trim() &&
    client.email?.trim() &&
    client.phoneMobile?.trim()
  );

  // Check billing address
  const hasBillingAddress = !!(
    client.billingAddress?.trim() &&
    client.billingCity?.trim() &&
    client.billingState?.trim() &&
    client.billingZipCode?.trim()
  );

  // Check service address if different from billing
  let hasServiceAddress = true;
  if (client.billingEqualToService === false) {
    hasServiceAddress = !!(
      client.serviceAddress?.trim() &&
      client.serviceCity?.trim() &&
      client.serviceState?.trim() &&
      client.serviceZipCode?.trim()
    );
  }

  return hasBasicInfo && hasBillingAddress && hasServiceAddress;
};

/**
 * Validate client data before submission
 * Now allows partial data - only validates format of provided fields
 */
export const validateClientData = (client: Partial<Client>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Only validate email format if provided
  if (client.email && client.email.trim() !== '') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
      errors.push('Invalid email format');
    }
  }

  // Only validate phone format if provided
  if (client.phoneMobile && client.phoneMobile.trim() !== '') {
    if (!validatePhoneNumber(client.phoneMobile)) {
      errors.push('Invalid mobile phone number (must be 10 digits)');
    }
  }

  if (client.phoneOther && client.phoneOther.trim() !== '') {
    if (!validatePhoneNumber(client.phoneOther)) {
      errors.push('Invalid other phone number (must be 10 digits)');
    }
  }



  return {
    isValid: errors.length === 0,
    errors
  };
};
