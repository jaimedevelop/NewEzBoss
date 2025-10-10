// src/services/categories/categories.ts
// Category-level operations

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
import { DatabaseResult, ProductCategory, COLLECTIONS } from './types';

/**
 * Add a new product category
 */
export const addProductCategory = async (
  name: string,
  sectionId: string,
  userId: string
): Promise<DatabaseResult> => {
  try {
    // Check for duplicates within this section
    const existingResult = await getProductCategories(sectionId, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(
        category => category.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { 
          success: false, 
          error: 'A category with this name already exists in this section' 
        };
      }
    }

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

    // Create category
    const categoryRef = await addDoc(
      collection(db, COLLECTIONS.PRODUCT_CATEGORIES),
      {
        name: name.trim(),
        sectionId,
        userId,
        createdAt: serverTimestamp()
      }
    );

    return { success: true, id: categoryRef.id };
  } catch (error) {
    console.error('Error adding product category:', error);
    return { success: false, error };
  }
};

/**
 * Get all categories for a specific section
 */
export const getProductCategories = async (
  sectionId: string,
  userId: string
): Promise<DatabaseResult<ProductCategory[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_CATEGORIES),
      where('sectionId', '==', sectionId),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const categories: ProductCategory[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductCategory[];

    return { success: true, data: categories };
  } catch (error) {
    console.error('Error getting product categories:', error);
    return { success: false, error };
  }
};