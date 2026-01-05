// src/services/clients/clients.queries.ts

import { db } from '../../firebase/config';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getDoc,
  doc,
  startAfter,
} from 'firebase/firestore';
import type { Client, ClientFilters, ClientsResponse, DatabaseResult } from './clients.types';

const COLLECTION_NAME = 'clients';

/**
 * Get a single client by ID
 */
export const getClient = async (clientId: string): Promise<DatabaseResult<Client>> => {
  try {
    const clientDoc = await getDoc(doc(db, COLLECTION_NAME, clientId));
    
    if (!clientDoc.exists()) {
      return { success: false, error: 'Client not found' };
    }
    
    return {
      success: true,
      data: { id: clientDoc.id, ...clientDoc.data() } as Client
    };
  } catch (error) {
    console.error('Error fetching client:', error);
    return { success: false, error: 'Failed to fetch client' };
  }
};

/**
 * Get all clients for a user with optional filtering
 */
export const getClients = async (
  userId: string,
  filters?: ClientFilters,
  pageSize: number = 50,
  lastDoc?: any
): Promise<DatabaseResult<ClientsResponse>> => {
  try {
    let q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('name', 'asc'),
      limit(pageSize + 1)
    );
    
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    const snapshot = await getDocs(q);
    let clients = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Client[];
    
    // Client-side filtering for search
    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      clients = clients.filter(client =>
        client.name.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters?.clientType) {
      clients = clients.filter(client =>
        client.clientType === filters.clientType
      );
    }
    
    const hasMore = clients.length > pageSize;
    if (hasMore) {
      clients = clients.slice(0, pageSize);
    }
    
    return {
      success: true,
      data: {
        clients,
        hasMore,
        lastDoc: hasMore ? snapshot.docs[pageSize - 1] : undefined
      }
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
  userId: string
): Promise<DatabaseResult<Record<string, Client[]>>> => {
  try {
    const result = await getClients(userId, undefined, 1000);
    
    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }
    
    const grouped: Record<string, Client[]> = {};
    
    result.data.clients.forEach(client => {
      const firstLetter = client.name.charAt(0).toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(client);
    });
    
    return { success: true, data: grouped };
  } catch (error) {
    console.error('Error grouping clients:', error);
    return { success: false, error: 'Failed to group clients' };
  }
};