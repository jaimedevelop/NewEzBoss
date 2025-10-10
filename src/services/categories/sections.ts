// src/services/categories/sections.ts
// Section-level category operations - FIXED VERSION

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
import { getProductTrades } from './trades';

/**
 * Add a new product section
 * @param name - Section name
 * @param tradeIdOrName - Either the trade's document ID OR the trade's name (will lookup ID)
 * @param userId - User ID
 */
export const addProductSection = async (
  name: string,
  tradeIdOrName: string,
  userId: string
): Promise<DatabaseResult> => {
  try {
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

    // Determine if we received an ID or a name
    let tradeId = tradeIdOrName;
    
    // If it doesn't look like a Firebase ID (alphanumeric, 20+ chars), assume it's a name
    const isFirebaseId = /^[a-zA-Z0-9]{20,}$/.test(tradeIdOrName);
    
    if (!isFirebaseId) {
      console.log('🔍 Looking up trade ID for name:', tradeIdOrName);
      // It's a name, look up the ID
      const tradesResult = await getProductTrades(userId);
      if (!tradesResult.success || !tradesResult.data) {
        return { success: false, error: 'Could not find trade' };
      }
      
      const trade = tradesResult.data.find(t => t.name === tradeIdOrName);
      if (!trade || !trade.id) {
        return { success: false, error: `Trade "${tradeIdOrName}" not found` };
      }
      
      tradeId = trade.id;
      console.log('✅ Found trade ID:', tradeId, 'for name:', tradeIdOrName);
    }

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

    // Create section with the proper trade ID
    const sectionRef = await addDoc(
      collection(db, COLLECTIONS.PRODUCT_SECTIONS),
      {
        name: name.trim(),
        tradeId: tradeId, // ✅ Always stores the ID, never the name
        userId,
        createdAt: serverTimestamp()
      }
    );

    console.log('✅ Created section with tradeId:', tradeId);
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