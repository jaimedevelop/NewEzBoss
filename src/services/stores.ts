// src/services/stores.ts
import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Database result interface
export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  id?: string;
}

// Store interface
export interface Store {
  id?: string;
  name: string;
  userId: string;
  createdAt?: any;
}

const COLLECTION_NAME = 'stores';

/**
 * Add a new store
 */
export const addStore = async (name: string, userId: string): Promise<DatabaseResult> => {
  try {
    // Check for duplicates (case-insensitive)
    const existingResult = await getStores(userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(store => 
        store.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { success: false, error: 'A store with this name already exists' };
      }
    }

    // Validate length
    if (name.length > 30) {
      return { success: false, error: 'Store name must be 30 characters or less' };
    }

    if (!name.trim()) {
      return { success: false, error: 'Store name cannot be empty' };
    }

    const storeRef = await addDoc(collection(db, COLLECTION_NAME), {
      name: name.trim(),
      userId,
      createdAt: serverTimestamp()
    });

    return { success: true, id: storeRef.id };
  } catch (error) {
    console.error('Error adding store:', error);
    return { success: false, error };
  }
};

/**
 * Get all stores for a user
 */
export const getStores = async (userId: string): Promise<DatabaseResult<Store[]>> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const stores: Store[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Store[];

    return { success: true, data: stores };
  } catch (error) {
    console.error('Error getting stores:', error);
    return { success: false, error };
  }
};