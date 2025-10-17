// src/services/categories/trades.ts
// Trade-level category operations

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
import { DatabaseResult, ProductTrade, COLLECTIONS } from './types.ts';

export type { ProductTrade } from './types'

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