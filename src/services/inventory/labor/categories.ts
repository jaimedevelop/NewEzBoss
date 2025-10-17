// src/services/labor/categories.ts
// Labor category operations (Level 3 - under Section)

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
import { LaborResponse } from './labor.types';

const LABOR_CATEGORIES_COLLECTION = 'laborCategories';

export interface LaborCategory {
  id?: string;
  name: string;
  sectionId: string;    // References laborSections collection
  tradeId: string;      // References productTrades (for easier queries)
  userId: string;
  createdAt?: any;
}

/**
 * Get all labor categories for a section
 */
export const getLaborCategories = async (
  sectionId: string,
  userId: string
): Promise<LaborResponse<LaborCategory[]>> => {
  try {
    const q = query(
      collection(db, LABOR_CATEGORIES_COLLECTION),
      where('userId', '==', userId),
      where('sectionId', '==', sectionId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const categories: LaborCategory[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LaborCategory[];

    return { success: true, data: categories };
  } catch (error) {
    console.error('Error getting labor categories:', error);
    return { success: false, error: 'Failed to fetch labor categories' };
  }
};

/**
 * Add a new labor category
 */
export const addLaborCategory = async (
  name: string,
  sectionId: string,
  tradeId: string,
  userId: string
): Promise<LaborResponse<string>> => {
  try {
    // Validation
    if (!name.trim()) {
      return { success: false, error: 'Category name cannot be empty' };
    }

    if (name.length > 30) {
      return { 
        success: false, 
        error: 'Category name must be 30 characters or less' 
      };
    }

    // Check for duplicates within this section
    const existingResult = await getLaborCategories(sectionId, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(
        category => category.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { 
          success: false, 
          error: 'A category with this name already exists for this section' 
        };
      }
    }

    // Create category
    const categoryRef = await addDoc(
      collection(db, LABOR_CATEGORIES_COLLECTION),
      {
        name: name.trim(),
        sectionId,
        tradeId,
        userId,
        createdAt: serverTimestamp()
      }
    );

    return { success: true, data: categoryRef.id };
  } catch (error) {
    console.error('Error adding labor category:', error);
    return { success: false, error: 'Failed to add labor category' };
  }
};