// src/services/categories/subcategories.ts
// Subcategory-level operations

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
import { db } from '../../firebase/config';
import { DatabaseResult, ProductSubcategory, COLLECTIONS } from './types';

/**
 * Add a new product subcategory
 */
export const addProductSubcategory = async (
  name: string,
  categoryId: string,
  userId: string
): Promise<DatabaseResult> => {
  try {
    // Check for duplicates within this category
    const existingResult = await getProductSubcategories(categoryId, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(
        subcategory => subcategory.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { 
          success: false, 
          error: 'A subcategory with this name already exists in this category' 
        };
      }
    }

    // Validation
    if (!name.trim()) {
      return { success: false, error: 'Subcategory name cannot be empty' };
    }

    if (name.length > 30) {
      return { 
        success: false, 
        error: 'Subcategory name must be 30 characters or less' 
      };
    }

    // Create subcategory
    const subcategoryRef = await addDoc(
      collection(db, COLLECTIONS.PRODUCT_SUBCATEGORIES),
      {
        name: name.trim(),
        categoryId,
        userId,
        createdAt: serverTimestamp()
      }
    );

    return { success: true, id: subcategoryRef.id };
  } catch (error) {
    console.error('Error adding product subcategory:', error);
    return { success: false, error };
  }
};

/**
 * Get all subcategories for a specific category
 */
export const getProductSubcategories = async (
  categoryId: string,
  userId: string
): Promise<DatabaseResult<ProductSubcategory[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_SUBCATEGORIES),
      where('categoryId', '==', categoryId),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const subcategories: ProductSubcategory[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductSubcategory[];

    return { success: true, data: subcategories };
  } catch (error) {
    console.error('Error getting product subcategories:', error);
    return { success: false, error };
  }
};