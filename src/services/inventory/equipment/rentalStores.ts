// src/services/inventory/equipment/rentalStores.ts
// Rental store operations

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { EquipmentResponse } from './equipment.types';

const RENTAL_STORES_COLLECTION = 'equipment_rental_stores';

export interface RentalStore {
  id?: string;
  name: string;
  location: string;
  userId: string;
  createdAt?: any;
}

/**
 * Get all rental stores for a user
 */
export const getRentalStores = async (
  userId: string
): Promise<EquipmentResponse<RentalStore[]>> => {
  try {
    const q = query(
      collection(db, RENTAL_STORES_COLLECTION),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const stores: RentalStore[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as RentalStore[];

    return { success: true, data: stores };
  } catch (error) {
    console.error('Error getting rental stores:', error);
    return { success: false, error: 'Failed to fetch rental stores' };
  }
};

/**
 * Add a new rental store
 */
export const addRentalStore = async (
  name: string,
  location: string,
  userId: string
): Promise<EquipmentResponse<string>> => {
  try {
    // Validation
    if (!name.trim()) {
      return { success: false, error: 'Store name cannot be empty' };
    }

    if (name.length > 50) {
      return { 
        success: false, 
        error: 'Store name must be 50 characters or less' 
      };
    }

    if (!location.trim()) {
      return { success: false, error: 'Store location cannot be empty' };
    }

    if (location.length > 100) {
      return { 
        success: false, 
        error: 'Store location must be 100 characters or less' 
      };
    }

    // Check for duplicates (same name + location combo)
    const existingResult = await getRentalStores(userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(
        store => 
          store.name.toLowerCase() === name.toLowerCase() &&
          store.location.toLowerCase() === location.toLowerCase()
      );
      
      if (isDuplicate) {
        return { 
          success: false, 
          error: 'A rental store with this name and location already exists' 
        };
      }
    }

    // Create rental store
    const storeRef = await addDoc(
      collection(db, RENTAL_STORES_COLLECTION),
      {
        name: name.trim(),
        location: location.trim(),
        userId,
        createdAt: serverTimestamp()
      }
    );

    return { success: true, data: storeRef.id };
  } catch (error) {
    console.error('Error adding rental store:', error);
    return { success: false, error: 'Failed to add rental store' };
  }
};