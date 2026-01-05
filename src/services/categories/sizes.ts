// src/services/categories/sizes.ts
// Size-level operations (trade-specific)

import {
  collection,
  doc,
  getDoc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
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

  try {
    let queryConstraints;

    // If tradeId provided, filter by that trade's name
    if (tradeId) {
      // Get the trade name from the trade ID
      const tradeDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_TRADES, tradeId));

      if (!tradeDoc.exists()) {
        return { success: true, data: [] };
      }

      const tradeName = tradeDoc.data().name;

      // Query using the trade NAME (as stored in Firebase)
      queryConstraints = query(
        collection(db, COLLECTIONS.PRODUCT_SIZES),
        where('tradeId', '==', tradeName),  // Filter by trade name
        where('userId', '==', userId),
        orderBy('name', 'asc')
      );
    } else {
      // ✅ No trade filter - load ALL sizes for this user
      queryConstraints = query(
        collection(db, COLLECTIONS.PRODUCT_SIZES),
        where('userId', '==', userId),
        orderBy('name', 'asc')
      );

    }

    const querySnapshot: QuerySnapshot = await getDocs(queryConstraints);

    const sizes: ProductSize[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductSize[];

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

/**
 * Update a product size name
 * NOTE: Validates uniqueness within the same trade
 */
export const updateProductSizeName = async (
  sizeId: string,
  newName: string,
  tradeId: string,
  userId: string
): Promise<DatabaseResult> => {
  try {
    // Validation
    if (!newName.trim()) {
      return { success: false, error: 'Size name cannot be empty' };
    }

    if (newName.length > 30) {
      return {
        success: false,
        error: 'Size name must be 30 characters or less'
      };
    }

    // Check for duplicates within this trade (excluding current size)
    const existingResult = await getProductSizes(userId, tradeId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(
        size => size.id !== sizeId && 
                size.name.toLowerCase() === newName.toLowerCase()
      );

      if (isDuplicate) {
        return {
          success: false,
          error: 'A size with this name already exists in this trade'
        };
      }
    }

    // Update size
    const sizeRef = doc(db, COLLECTIONS.PRODUCT_SIZES, sizeId);
    await updateDoc(sizeRef, {
      name: newName.trim(),
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating product size:', error);
    return { success: false, error };
  }
};

/**
 * Delete a product size
 * NOTE: Should check usage before deletion
 */
export const deleteProductSize = async (
  sizeId: string,
  userId: string
): Promise<DatabaseResult> => {
  try {
    // Get the size to find its name for usage check
    const sizeDoc = await getDoc(doc(db, COLLECTIONS.PRODUCT_SIZES, sizeId));
    
    if (!sizeDoc.exists()) {
      return {
        success: false,
        error: 'Size not found'
      };
    }

    const sizeName = sizeDoc.data().name;

    // Check if size is in use
    const usageResult = await getSizeUsageCount(sizeName, userId);
    if (usageResult.success && usageResult.data && usageResult.data > 0) {
      return {
        success: false,
        error: `Cannot delete size: ${usageResult.data} products are using this size. Please reassign or delete those products first.`
      };
    }

    // Delete the size
    const sizeRef = doc(db, COLLECTIONS.PRODUCT_SIZES, sizeId);
    await deleteDoc(sizeRef);

    return { success: true };
  } catch (error) {
    console.error('Error deleting product size:', error);
    return { success: false, error };
  }
};

/**
 * Get count of products using a specific size
 * NOTE: Checks the 'products' collection for size usage
 */
export const getSizeUsageCount = async (
  sizeName: string,
  userId: string
): Promise<DatabaseResult<number>> => {
  try {
    const q = query(
      collection(db, 'products'),
      where('size', '==', sizeName),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    return { success: true, data: snapshot.size };
  } catch (error) {
    console.error('Error getting size usage count:', error);
    return { success: false, error };
  }
};
