// src/services/inventory/equipment/rentalStores.ts
import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../../firebase/config';

const RENTAL_STORES_COLLECTION = 'rental_stores';

export interface RentalStore {
  id?: string;
  name: string;
  userId: string;
  createdAt?: Timestamp;
}

interface RentalStoreResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Get all rental stores for a user
 */
export const getRentalStores = async (
  userId: string
): Promise<RentalStoreResponse<RentalStore[]>> => {
  try {
    const q = query(
      collection(db, RENTAL_STORES_COLLECTION),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const snapshot = await getDocs(q);
    const stores = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as RentalStore[];

    return {
      success: true,
      data: stores
    };
  } catch (error) {
    console.error('Error getting rental stores:', error);
    return {
      success: false,
      error: 'Failed to load rental stores'
    };
  }
};

/**
 * Add a new rental store
 */
export const addRentalStore = async (
  name: string,
  userId: string
): Promise<RentalStoreResponse<string>> => {
  try {
    // Check for duplicate
    const q = query(
      collection(db, RENTAL_STORES_COLLECTION),
      where('userId', '==', userId),
      where('name', '==', name)
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return {
        success: false,
        error: 'A rental store with this name already exists'
      };
    }

    // Add new store
    const docRef = await addDoc(collection(db, RENTAL_STORES_COLLECTION), {
      name,
      userId,
      createdAt: Timestamp.now()
    });

    return {
      success: true,
      data: docRef.id
    };
  } catch (error) {
    console.error('Error adding rental store:', error);
    return {
      success: false,
      error: 'Failed to add rental store'
    };
  }
};