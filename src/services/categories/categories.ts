// src/services/categories/categories.ts
// Category-level operations - FIXED VERSION

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
import { getProductSections } from './sections';

/**
 * Add a new product category
 * @param name - Category name
 * @param sectionIdOrName - Either the section's document ID OR the section's name (will lookup ID)
 * @param userId - User ID
 */
export const addProductCategory = async (
  name: string,
  sectionIdOrName: string,
  userId: string
): Promise<DatabaseResult> => {
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

    // Determine if we received an ID or a name
    let sectionId = sectionIdOrName;
    
    // If it doesn't look like a Firebase ID, assume it's a name
    const isFirebaseId = /^[a-zA-Z0-9]{20,}$/.test(sectionIdOrName);
    
    if (!isFirebaseId) {
      console.log('🔍 Section appears to be a name, looking up ID for:', sectionIdOrName);
      // It's a name, look up the ID
      // We need to get all sections for this user and find the matching one
      const allSectionsQuery = query(
        collection(db, COLLECTIONS.PRODUCT_SECTIONS),
        where('userId', '==', userId)
      );
      const sectionsSnap = await getDocs(allSectionsQuery);
      const sections = sectionsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const section = sections.find(s => s.name === sectionIdOrName);
      if (!section || !section.id) {
        return { success: false, error: `Section "${sectionIdOrName}" not found` };
      }
      
      sectionId = section.id;
      console.log('✅ Found section ID:', sectionId, 'for name:', sectionIdOrName);
    }

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

    // Create category with the proper section ID
    const categoryRef = await addDoc(
      collection(db, COLLECTIONS.PRODUCT_CATEGORIES),
      {
        name: name.trim(),
        sectionId: sectionId, // ✅ Always stores the ID, never the name
        userId,
        createdAt: serverTimestamp()
      }
    );

    console.log('✅ Created category with sectionId:', sectionId);
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