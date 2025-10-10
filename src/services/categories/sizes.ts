// src/services/categories/sizes.ts
// Size-level operations (trade-specific)

import {
  collection,
  doc,
  getDoc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { DatabaseResult, ProductSize, COLLECTIONS } from './types';

/**
 * Add a new product size
 * NOTE: Stores tradeName in tradeId field to match existing data structure
 */
export const addProductSize = async (
  name: string,
  tradeId: string,
  userId: string
): Promise<DatabaseResult> => {
  try {
    // Get the trade name from the trade ID
    const tradeDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_TRADES, tradeId));
    
    if (!tradeDoc.exists()) {
      return { 
        success: false, 
        error: 'Trade not found' 
      };
    }
    
    const tradeName = tradeDoc.data().name;
    console.log('🔍 [SIZES] Creating size for trade:', tradeName);

    // Check for duplicates within this trade (using trade name)
    const existingResult = await getProductSizes(tradeId, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(
        size => size.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { 
          success: false, 
          error: 'A size with this name already exists in this trade' 
        };
      }
    }

    // Validation
    if (!name.trim()) {
      return { success: false, error: 'Size name cannot be empty' };
    }

    if (name.length > 30) {
      return { 
        success: false, 
        error: 'Size name must be 30 characters or less' 
      };
    }

    // Create size (storing trade NAME to match existing structure)
    const sizeRef = await addDoc(
      collection(db, COLLECTIONS.PRODUCT_SIZES),
      {
        name: name.trim(),
        tradeId: tradeName,  // ← Store trade NAME (not ID)
        userId,
        createdAt: serverTimestamp()
      }
    );

    console.log('✅ [SIZES] Created size with trade name:', tradeName);

    return { success: true, id: sizeRef.id };
  } catch (error) {
    console.error('Error adding product size:', error);
    return { success: false, error };
  }
};

/**
 * Get all sizes for a specific trade
 * NOTE: Currently sizes in Firebase are stored with tradeName (not tradeId)
 * This function accepts tradeId but queries by the corresponding trade name
 */
export const getProductSizes = async (
  tradeId: string,
  userId: string
): Promise<DatabaseResult<ProductSize[]>> => {
  console.log('🔍 [SIZES] getProductSizes called with:', {
    tradeId,
    userId,
    collection: COLLECTIONS.PRODUCT_SIZES
  });

  try {
    // First, get the trade name from the trade ID
    const tradeDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_TRADES, tradeId));
    
    if (!tradeDoc.exists()) {
      console.log('⚠️ [SIZES] Trade document not found for ID:', tradeId);
      return { success: true, data: [] };
    }
    
    const tradeName = tradeDoc.data().name;
    console.log('🔍 [SIZES] Found trade name:', tradeName, 'for ID:', tradeId);

    // Query using the trade NAME (as stored in Firebase)
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_SIZES),
      where('tradeId', '==', tradeName),  // ← Changed to query by name
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    console.log('🔍 [SIZES] Executing query with filters:', {
      tradeId: tradeName,  // Now using trade name
      userId
    });

    const querySnapshot: QuerySnapshot = await getDocs(q);
    
    console.log('🔍 [SIZES] Query completed. Documents found:', querySnapshot.size);

    const sizes: ProductSize[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductSize[];

    console.log('🔍 [SIZES] Mapped sizes:', sizes);

    return { success: true, data: sizes };
  } catch (error) {
    console.error('❌ [SIZES] Error getting product sizes:', error);
    console.error('❌ [SIZES] Error details:', {
      tradeId,
      userId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    });
    return { success: false, error };
  }
};