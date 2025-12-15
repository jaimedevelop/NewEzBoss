// src/services/categories/trades.ts
// Trade-level category operations

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { DatabaseResult, ProductTrade, COLLECTIONS } from './types';

export type { ProductTrade } from './types';

/** 
 * Add a new product trade
 */
export const addProductTrade = async (
  name: string,
  userId: string
): Promise<DatabaseResult> => {
  try {
    // Check for duplicates
    const existingResult = await getProductTrades(userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(
        trade => trade.name.toLowerCase() === name.toLowerCase()
      );
      
      if (isDuplicate) {
        return { 
          success: false, 
          error: 'A trade with this name already exists' 
        };
      }
    }

    // Validation
    if (!name.trim()) {
      return { success: false, error: 'Trade name cannot be empty' };
    }

    if (name.length > 30) {
      return { 
        success: false, 
        error: 'Trade name must be 30 characters or less' 
      };
    }

    // Create trade
    const tradeRef = await addDoc(
      collection(db, COLLECTIONS.PRODUCT_TRADES),
      {
        name: name.trim(),
        userId,
        createdAt: serverTimestamp()
      }
    );

    return { success: true, id: tradeRef.id };
  } catch (error) {
    console.error('Error adding product trade:', error);
    return { success: false, error };
  }
};

/**
 * Get all product trades for a user
 */
export const getProductTrades = async (
  userId: string
): Promise<DatabaseResult<ProductTrade[]>> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.PRODUCT_TRADES),
      where('userId', '==', userId),
      orderBy('name', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const trades: ProductTrade[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ProductTrade[];

    return { success: true, data: trades };
  } catch (error) {
    console.error('Error getting product trades:', error);
    return { success: false, error };
  }
};

/**
 * Get all available trade names (for dropdowns/filters)
 */
export const getAllAvailableTrades = async (
  userId: string
): Promise<DatabaseResult<string[]>> => {
  try {
    const tradesResult = await getProductTrades(userId);
    const trades = tradesResult.success ? tradesResult.data || [] : [];
    const tradeNames = trades.map(trade => trade.name).sort();
    
    return { success: true, data: tradeNames };
  } catch (error) {
    console.error('Error getting all available trades:', error);
    return { success: false, error };
  }
};

/**
 * Update a product trade name
 */
export const updateProductTradeName = async (
  tradeId: string,
  newName: string,
  userId: string
): Promise<DatabaseResult> => {
  try {
    // Validation
    if (!newName.trim()) {
      return { success: false, error: 'Trade name cannot be empty' };
    }

    if (newName.length > 30) {
      return { 
        success: false, 
        error: 'Trade name must be 30 characters or less' 
      };
    }

    // Check for duplicates (excluding current trade)
    const existingResult = await getProductTrades(userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(
        trade => trade.id !== tradeId && 
                 trade.name.toLowerCase() === newName.toLowerCase()
      );
      
      if (isDuplicate) {
        return { 
          success: false, 
          error: 'A trade with this name already exists' 
        };
      }
    }

    // Update trade
    const tradeRef = doc(db, COLLECTIONS.PRODUCT_TRADES, tradeId);
    await updateDoc(tradeRef, {
      name: newName.trim(),
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating product trade:', error);
    return { success: false, error };
  }
};

/**
 * Get usage statistics for a trade
 * Returns counts of sections and items that depend on this trade
 */
export const getTradeUsageStats = async (
  tradeId: string,
  userId: string
): Promise<DatabaseResult<{ sectionCount: number; itemCount: number }>> => {
  try {
    let sectionCount = 0;
    let itemCount = 0;

    // Count sections across all types
    const sectionCollections = [
      COLLECTIONS.PRODUCT_SECTIONS,
      'labor_sections',
      'toolSections',
      'equipmentSections'
    ];

    for (const collectionName of sectionCollections) {
      try {
        const q = query(
          collection(db, collectionName),
          where('tradeId', '==', tradeId),
          where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        sectionCount += snapshot.size;
      } catch (error) {
        console.warn(`Collection ${collectionName} may not exist:`, error);
      }
    }

    // Count items across all types
    const itemCollections = [
      { name: COLLECTIONS.PRODUCTS, tradeField: 'trade' },
      { name: 'labor_items', tradeField: 'tradeName' },
      { name: 'tool_items', tradeField: 'tradeName' },
      { name: 'equipment_items', tradeField: 'tradeName' }
    ];

    // Get the trade name for matching
    const tradeDoc = await getDocs(
      query(
        collection(db, COLLECTIONS.PRODUCT_TRADES),
        where('__name__', '==', tradeId)
      )
    );
    const tradeName = tradeDoc.docs[0]?.data()?.name;

    if (tradeName) {
      for (const { name: collectionName, tradeField } of itemCollections) {
        try {
          const q = query(
            collection(db, collectionName),
            where(tradeField, '==', tradeName),
            where('userId', '==', userId)
          );
          const snapshot = await getDocs(q);
          itemCount += snapshot.size;
        } catch (error) {
          console.warn(`Collection ${collectionName} may not exist:`, error);
        }
      }
    }

    return { 
      success: true, 
      data: { 
        sectionCount, 
        itemCount 
      } 
    };
  } catch (error) {
    console.error('Error getting trade usage stats:', error);
    return { success: false, error };
  }
};

/**
 * Delete a product trade and all its children
 * WARNING: This cascades to all sections, categories, and subcategories under this trade
 */
export const deleteProductTradeWithChildren = async (
  tradeId: string,
  userId: string
): Promise<DatabaseResult> => {
  try {
    // Get usage stats
    const statsResult = await getTradeUsageStats(tradeId, userId);
    if (!statsResult.success) {
      return { success: false, error: 'Failed to check trade usage' };
    }

    const { itemCount } = statsResult.data!;

    // Prevent deletion if items exist
    if (itemCount > 0) {
      return {
        success: false,
        error: `Cannot delete trade: ${itemCount} items are using this trade. Please reassign or delete those items first.`
      };
    }

    // Delete all sections under this trade (across all types)
    const sectionCollections = [
      COLLECTIONS.PRODUCT_SECTIONS,
      'labor_sections',
      'toolSections',
      'equipmentSections'
    ];

    for (const collectionName of sectionCollections) {
      try {
        const q = query(
          collection(db, collectionName),
          where('tradeId', '==', tradeId),
          where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        
        // Delete each section
        const deletePromises = snapshot.docs.map(sectionDoc => 
          deleteDoc(doc(db, collectionName, sectionDoc.id))
        );
        await Promise.all(deletePromises);
      } catch (error) {
        console.warn(`Error deleting sections from ${collectionName}:`, error);
      }
    }

    // Finally, delete the trade itself
    const tradeRef = doc(db, COLLECTIONS.PRODUCT_TRADES, tradeId);
    await deleteDoc(tradeRef);

    return { success: true };
  } catch (error) {
    console.error('Error deleting product trade:', error);
    return { success: false, error };
  }
};