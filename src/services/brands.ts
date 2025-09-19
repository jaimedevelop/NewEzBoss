// src/services/brands.ts
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

// Brand interface
export interface Brand {
  id?: string;
  name: string;
  userId: string;
  createdAt?: any;
}

const COLLECTION_NAME = 'brands';

/**
 * Add a new brand
 */
export const addBrand = async (name: string, userId: string): Promise<DatabaseResult> => {
  try {
    // Check for duplicates (case-insensitive)
    const existingResult = await getBrands(userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(brand => 
        brand.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { success: false, error: 'A brand with this name already exists' };
      }
    }

    // Validate length
    if (name.length > 50) {
      return { success: false, error: 'Brand name must be 50 characters or less' };
    }

    if (!name.trim()) {
      return { success: false, error: 'Brand name cannot be empty' };
    }

    const brandRef = await addDoc(collection(db, COLLECTION_NAME), {
      name: name.trim(),
      userId,
      createdAt: serverTimestamp()
    });

    return { success: true, id: brandRef.id };
  } catch (error) {
    console.error('Error adding brand:', error);
    return { success: false, error };
  }
};

/**
 * Get all brands for a user
 */
export const getBrands = async (userId: string): Promise<DatabaseResult<Brand[]>> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const brands: Brand[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Brand[];

    return { success: true, data: brands };
  } catch (error) {
    console.error('Error getting brands:', error);
    return { success: false, error };
  }
};