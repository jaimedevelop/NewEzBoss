// src/services/categories/productTypes.ts
// Type-level operations (hierarchical types) - FIXED VERSION

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
import { DatabaseResult, ProductType, StandaloneProductType, COLLECTIONS } from './types';

/**
 * Add a new product type (hierarchical)
 * @param name - Type name
 * @param subcategoryIdOrName - Either the subcategory's document ID OR the subcategory's name (will lookup ID)
 * @param userId - User ID
 */
export const addProductType = async (
  name: string,
  subcategoryIdOrName: string,
  userId: string
): Promise<DatabaseResult> => {
  try {
    // Validation
    if (!name.trim()) {
      return { success: false, error: 'Type name cannot be empty' };
    }

    if (name.length > 30) {
      return { 
        success: false, 
        error: 'Type name must be 30 characters or less' 
      };
    }

    // Determine if we received an ID or a name
    let subcategoryId = subcategoryIdOrName;
    
    // If it doesn't look like a Firebase ID, assume it's a name
    const isFirebaseId = /^[a-zA-Z0-9]{20,}$/.test(subcategoryIdOrName);
    
    if (!isFirebaseId) {
      console.log('🔍 Subcategory appears to be a name, looking up ID for:', subcategoryIdOrName);
      // It's a name, look up the ID
      const allSubcategoriesQuery = query(
        collection(db, COLLECTIONS.PRODUCT_SUBCATEGORIES),
        where('userId', '==', userId)
      );
      const subcategoriesSnap = await getDocs(allSubcategoriesQuery);
      const subcategories = subcategoriesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const subcategory = subcategories.find(s => s.name === subcategoryIdOrName);
      if (!subcategory || !subcategory.id) {
        return { success: false, error: `Subcategory "${subcategoryIdOrName}" not found` };
      }
      
      subcategoryId = subcategory.id;
      console.log('✅ Found subcategory ID:', subcategoryId, 'for name:', subcategoryIdOrName);
    }

    // Check for duplicates within this subcategory
    const existingResult = await getProductTypes(subcategoryId, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(
        type => type.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { 
          success: false, 
          error: 'A type with this name already exists in this subcategory' 
        };
      }
    }

    // Create type with the proper subcategory ID
    const typeRef = await addDoc(
      collection(db, COLLECTIONS.PRODUCT_TYPES),
      {
        name: name.trim(),
        subcategoryId: subcategoryId, // ✅ Always stores the ID, never the name
        userId,
        createdAt: serverTimestamp()
      }
    );

    console.log('✅ Created type with subcategoryId:', subcategoryId);
    return { success: true, id: typeRef.id };
  } catch (error) {
    console.error('Error adding product type:', error);
    return { success: false, error };
  }
};

/**
 * Get all types for a specific subcategory
 */
export const getProductTypes = async (
  subcategoryId: string,
  userId: string
): Promise<DatabaseResult<ProductType[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_TYPES),
      where('subcategoryId', '==', subcategoryId),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const types: ProductType[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductType[];

    return { success: true, data: types };
  } catch (error) {
    console.error('Error getting product types:', error);
    return { success: false, error };
  }
};

// ============================================================
// STANDALONE PRODUCT TYPES (not part of hierarchy)
// ============================================================

/**
 * Add a standalone product type
 */
export const addStandaloneProductType = async (
  name: string,
  userId: string
): Promise<DatabaseResult> => {
  try {
    // Check for duplicates
    const existingResult = await getStandaloneProductTypes(userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(
        type => type.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { 
          success: false, 
          error: 'A product type with this name already exists' 
        };
      }
    }

    // Validation
    if (!name.trim()) {
      return { success: false, error: 'Product type name cannot be empty' };
    }

    if (name.length > 30) {
      return { 
        success: false, 
        error: 'Product type name must be 30 characters or less' 
      };
    }

    // Create standalone type
    const typeRef = await addDoc(
      collection(db, COLLECTIONS.STANDALONE_PRODUCT_TYPES),
      {
        name: name.trim(),
        userId,
        createdAt: serverTimestamp()
      }
    );

    return { success: true, id: typeRef.id };
  } catch (error) {
    console.error('Error adding standalone product type:', error);
    return { success: false, error };
  }
};

/**
 * Get all standalone product types for a user
 */
export const getStandaloneProductTypes = async (
  userId: string
): Promise<DatabaseResult<StandaloneProductType[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.STANDALONE_PRODUCT_TYPES),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const types: StandaloneProductType[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as StandaloneProductType[];

    return { success: true, data: types };
  } catch (error) {
    console.error('Error getting standalone product types:', error);
    return { success: false, error };
  }
};

/**
 * Get all available product type names (for dropdowns/filters)
 */
export const getAllAvailableProductTypes = async (
  userId: string
): Promise<DatabaseResult<string[]>> => {
  try {
    const typesResult = await getStandaloneProductTypes(userId);
    const types = typesResult.success ? typesResult.data || [] : [];
    const typeNames = types.map(type => type.name).sort();
    
    return { success: true, data: typeNames };
  } catch (error) {
    console.error('Error getting all available product types:', error);
    return { success: false, error };
  }
};