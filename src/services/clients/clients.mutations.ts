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
 * Validate client data before submission
 */
export const validateClientData = (client: Partial<Client>): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!client.name || client.name.trim() === '') {
    errors.push('Name is required');
  }
  
  if (!client.email || client.email.trim() === '') {
    errors.push('Email is required');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
    errors.push('Invalid email format');
  }
  
  if (!client.phoneMobile || client.phoneMobile.trim() === '') {
    errors.push('Mobile phone is required');
  } else if (!validatePhoneNumber(client.phoneMobile)) {
    errors.push('Invalid mobile phone number (must be 10 digits)');
  }
  
  if (client.phoneOther && !validatePhoneNumber(client.phoneOther)) {
    errors.push('Invalid other phone number (must be 10 digits)');
  }
  
  // Billing address validation
  if (!client.billingAddress || client.billingAddress.trim() === '') {
    errors.push('Billing address is required');
  }
  
  if (!client.billingCity || client.billingCity.trim() === '') {
    errors.push('Billing city is required');
  }
  
  if (!client.billingState || client.billingState.trim() === '') {
    errors.push('Billing state is required');
  }
  
  if (!client.billingZipCode || client.billingZipCode.trim() === '') {
    errors.push('Billing zip code is required');
  }
  
  // Service address validation (if different from billing)
  if (!client.billingEqualToService) {
    if (!client.serviceAddress || client.serviceAddress.trim() === '') {
      errors.push('Service address is required');
    }
    
    if (!client.serviceCity || client.serviceCity.trim() === '') {
      errors.push('Service city is required');
    }
    
    if (!client.serviceState || client.serviceState.trim() === '') {
      errors.push('Service state is required');
    }
    
    if (!client.serviceZipCode || client.serviceZipCode.trim() === '') {
      errors.push('Service zip code is required');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};