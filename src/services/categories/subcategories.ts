// src/services/categories/subcategories.ts
// Subcategory-level operations - FIXED VERSION

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
 * @param name - Subcategory name
 * @param categoryIdOrName - Either the category's document ID OR the category's name (will lookup ID)
 * @param userId - User ID
 */
export const addProductSubcategory = async (
  name: string,
  categoryIdOrName: string,
  userId: string
): Promise<DatabaseResult> => {
  try {
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

    // Determine if we received an ID or a name
    let categoryId = categoryIdOrName;
    
    // If it doesn't look like a Firebase ID, assume it's a name
    const isFirebaseId = /^[a-zA-Z0-9]{20,}$/.test(categoryIdOrName);
    
    if (!isFirebaseId) {
      console.log('🔍 Category appears to be a name, looking up ID for:', categoryIdOrName);
      // It's a name, look up the ID
      const allCategoriesQuery = query(
        collection(db, COLLECTIONS.PRODUCT_CATEGORIES),
        where('userId', '==', userId)
      );
      const categoriesSnap = await getDocs(allCategoriesQuery);
      const categories = categoriesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const category = categories.find(c => c.name === categoryIdOrName);
      if (!category || !category.id) {
        return { success: false, error: `Category "${categoryIdOrName}" not found` };
      }
      
      categoryId = category.id;
      console.log('✅ Found category ID:', categoryId, 'for name:', categoryIdOrName);
    }

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

    // Create subcategory with the proper category ID
    const subcategoryRef = await addDoc(
      collection(db, COLLECTIONS.PRODUCT_SUBCATEGORIES),
      {
        name: name.trim(),
        categoryId: categoryId, // ✅ Always stores the ID, never the name
        userId,
        createdAt: serverTimestamp()
      }
    );

    console.log('✅ Created subcategory with categoryId:', categoryId);
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