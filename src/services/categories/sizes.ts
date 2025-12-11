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
    const existingResult = await getProductSizes(userId, tradeId);
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
 * Get all sizes for a user, optionally filtered by trade
 * NOTE: Currently sizes in Firebase are stored with tradeName (not tradeId)
 * 
 * @param userId - Required: User ID to filter sizes
 * @param tradeId - Optional: Trade document ID (will be converted to trade name for query)
 * @returns DatabaseResult with ProductSize array
 */
export const getProductSizes = async (
  userId: string,      // ✅ userId is FIRST parameter
  tradeId?: string     // ✅ tradeId is SECOND parameter (optional)
): Promise<DatabaseResult<ProductSize[]>> => {
  console.log('🔍 [SIZES] getProductSizes called with:', {
    userId,              // ✅ Log correct parameter
    tradeId: tradeId || 'ALL',
    collection: COLLECTIONS.PRODUCT_SIZES
  });

  try {
    let queryConstraints;

    // If tradeId provided, filter by that trade's name
    if (tradeId) {
      // Get the trade name from the trade ID
      const tradeDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_TRADES, tradeId));
      
      if (!tradeDoc.exists()) {
        console.log('⚠️ [SIZES] Trade document not found for ID:', tradeId);
        return { success: true, data: [] };
      }
      
      const tradeName = tradeDoc.data().name;
      console.log('🔍 [SIZES] Found trade name:', tradeName, 'for ID:', tradeId);

      // Query using the trade NAME (as stored in Firebase)
      queryConstraints = query(
        collection(db, COLLECTIONS.PRODUCT_SIZES),
        where('tradeId', '==', tradeName),  // Filter by trade name
        where('userId', '==', userId),
        orderBy('name', 'asc')
      );

      console.log('🔍 [SIZES] Executing query with filters:', {
        tradeId: tradeName,
        userId
      });
    } else {
      // ✅ No trade filter - load ALL sizes for this user
      queryConstraints = query(
        collection(db, COLLECTIONS.PRODUCT_SIZES),
        where('userId', '==', userId),
        orderBy('name', 'asc')
      );

      console.log('🔍 [SIZES] Executing query for ALL sizes with userId:', userId);
    }

    const querySnapshot: QuerySnapshot = await getDocs(queryConstraints);
    
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
      userId,
      tradeId: tradeId || 'ALL',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    });
    return { success: false, error };
  }
};