// src/services/locations.ts
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
import { db } from '../../../firebase/config';

// Database result interface
export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  id?: string;
}

// Location interface
export interface Location {
  id?: string;
  name: string;
  userId: string;
  createdAt?: any;
}

const COLLECTION_NAME = 'locations';

/**
 * Add a new storage location
 */
export const addLocation = async (name: string, userId: string): Promise<DatabaseResult> => {
  try {
    // Check for duplicates (case-insensitive)
    const existingResult = await getLocations(userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(location => 
        location.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { success: false, error: 'A location with this name already exists' };
      }
    }

    // Validate length
    if (name.length > 50) {
      return { success: false, error: 'Location name must be 50 characters or less' };
    }

    if (!name.trim()) {
      return { success: false, error: 'Location name cannot be empty' };
    }

    const locationRef = await addDoc(collection(db, COLLECTION_NAME), {
      name: name.trim(),
      userId,
      createdAt: serverTimestamp()
    });

    return { success: true, id: locationRef.id };
  } catch (error) {
    console.error('Error adding location:', error);
    return { success: false, error };
  }
};

/**
 * Get all storage locations for a user
 */
export const getLocations = async (userId: string): Promise<DatabaseResult<Location[]>> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const locations: Location[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Location[];

    return { success: true, data: locations };
  } catch (error) {
    console.error('Error getting locations:', error);
    return { success: false, error };
  }
};