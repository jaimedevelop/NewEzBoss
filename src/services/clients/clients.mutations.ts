// src/services/clients/clients.mutations.ts

import { db } from '../../firebase/config';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import type { Client, DatabaseResult } from './clients.types';

const COLLECTION_NAME = 'clients';

/**
 * Create a new client
 */
export const createClient = async (
  clientData: Partial<Client>,
  userId: string
): Promise<DatabaseResult<string>> => {
  try {
    // Prepare client data
    const newClient = {
      ...clientData,
      userId,
      isComplete: isClientComplete(clientData),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // If billing equals service, don't store service address fields
    if (newClient.billingEqualToService) {
      delete newClient.serviceAddress;
      delete newClient.serviceAddress2;
      delete newClient.serviceCity;
      delete newClient.serviceState;
      delete newClient.serviceZipCode;
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), newClient);

    return { success: true, data: docRef.id };
  } catch (error) {
    console.error('Error creating client:', error);
    return { success: false, error: 'Failed to create client' };
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
    const updateData = {
      ...clientData,
      isComplete: isClientComplete(clientData),
      updatedAt: serverTimestamp(),
    };

    // If billing equals service, remove service address fields
    if (updateData.billingEqualToService) {
      updateData.serviceAddress = "";
      updateData.serviceAddress2 = "";
      updateData.serviceCity = "";
      updateData.serviceState = "";
      updateData.serviceZipCode = "";
    }

    await updateDoc(doc(db, COLLECTION_NAME, clientId), updateData);

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
    await deleteDoc(doc(db, COLLECTION_NAME, clientId));
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