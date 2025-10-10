// src/services/categories/sections.ts
// Section-level category operations

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
import { DatabaseResult, ProductSection, COLLECTIONS } from './types';

/**
 * Add a new product section
 */
export const addProductSection = async (
  name: string,
  tradeId: string,
  userId: string
): Promise<DatabaseResult> => {
  try {
    // Check for duplicates within this trade
    const existingResult = await getProductSections(tradeId, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(
        section => section.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { 
          success: false, 
          error: 'A section with this name already exists in this trade' 
        };
      }
    }

    // Validation
    if (!name.trim()) {
      return { success: false, error: 'Section name cannot be empty' };
    }

    if (name.length > 30) {
      return { 
        success: false, 
        error: 'Section name must be 30 characters or less' 
      };
    }

    // Create section
    const sectionRef = await addDoc(
      collection(db, COLLECTIONS.PRODUCT_SECTIONS),
      {
        name: name.trim(),
        tradeId,
        userId,
        createdAt: serverTimestamp()
      }
    );

    return { success: true, id: sectionRef.id };
  } catch (error) {
    console.error('Error adding product section:', error);
    return { success: false, error };
  }
};

/**
 * Get all sections for a specific trade
 */
export const getProductSections = async (
  tradeId: string,
  userId: string
): Promise<DatabaseResult<ProductSection[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_SECTIONS),
      where('tradeId', '==', tradeId),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const sections: ProductSection[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductSection[];

    return { success: true, data: sections };
  } catch (error) {
    console.error('Error getting product sections:', error);
    return { success: false, error };
  }
};

/**
 * Get all available section names across all trades (for dropdowns/filters)
 */
export const getAllAvailableSections = async (
  userId: string
): Promise<DatabaseResult<string[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_SECTIONS),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const sections = querySnapshot.docs.map(doc => doc.data().name as string);
    const uniqueSections = Array.from(new Set(sections)).sort();
    
    return { success: true, data: uniqueSections };
  } catch (error) {
    console.error('Error getting all available sections:', error);
    return { success: false, error };
  }
};