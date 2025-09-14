// src/services/pricing.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Database result interface
export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  id?: string;
}

// Price entry interface
export interface PriceEntry {
  id?: string;
  productId: string;
  store: string;
  price: number;
  lastUpdated: string;
  userId: string;
  createdAt?: any;
  updatedAt?: any;
}

const COLLECTION_NAME = 'productPricing';

/**
 * Add a new price entry for a product
 */
export const addPriceEntry = async (
  productId: string,
  store: string,
  price: number,
  userId: string
): Promise<DatabaseResult> => {
  try {
    // Check if price already exists for this product/store combination
    const existingResult = await getProductPrices(productId, userId);
    if (existingResult.success && existingResult.data) {
      const isDuplicate = existingResult.data.some(priceEntry => 
        priceEntry.store.toLowerCase() === store.toLowerCase()
      );
      
      if (isDuplicate) {
        return { success: false, error: 'A price for this store already exists for this product' };
      }
    }

    // Validate price
    if (price < 0) {
      return { success: false, error: 'Price cannot be negative' };
    }

    if (!store.trim()) {
      return { success: false, error: 'Store name cannot be empty' };
    }

    const priceRef = await addDoc(collection(db, COLLECTION_NAME), {
      productId,
      store: store.trim(),
      price: Number(price),
      lastUpdated: new Date().toISOString().split('T')[0],
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { success: true, id: priceRef.id };
  } catch (error) {
    console.error('Error adding price entry:', error);
    return { success: false, error };
  }
};

/**
 * Update an existing price entry
 */
export const updatePriceEntry = async (
  priceId: string,
  updates: { store?: string; price?: number }
): Promise<DatabaseResult> => {
  try {
    const priceRef = doc(db, COLLECTION_NAME, priceId);
    
    const updateData: any = {
      lastUpdated: new Date().toISOString().split('T')[0],
      updatedAt: serverTimestamp()
    };

    if (updates.store !== undefined) {
      if (!updates.store.trim()) {
        return { success: false, error: 'Store name cannot be empty' };
      }
      updateData.store = updates.store.trim();
    }

    if (updates.price !== undefined) {
      if (updates.price < 0) {
        return { success: false, error: 'Price cannot be negative' };
      }
      updateData.price = Number(updates.price);
    }

    await updateDoc(priceRef, updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating price entry:', error);
    return { success: false, error };
  }
};

/**
 * Delete a price entry
 */
export const deletePriceEntry = async (priceId: string): Promise<DatabaseResult> => {
  try {
    const priceRef = doc(db, COLLECTION_NAME, priceId);
    await deleteDoc(priceRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting price entry:', error);
    return { success: false, error };
  }
};

/**
 * Get all price entries for a specific product
 */
export const getProductPrices = async (
  productId: string,
  userId: string
): Promise<DatabaseResult<PriceEntry[]>> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('productId', '==', productId),
      where('userId', '==', userId),
      orderBy('store', 'asc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const prices: PriceEntry[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PriceEntry[];

    return { success: true, data: prices };
  } catch (error) {
    console.error('Error getting product prices:', error);
    return { success: false, error };
  }
};

/**
 * Get all price entries for a user (for analytics/reporting)
 */
export const getAllUserPrices = async (userId: string): Promise<DatabaseResult<PriceEntry[]>> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const prices: PriceEntry[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PriceEntry[];

    return { success: true, data: prices };
  } catch (error) {
    console.error('Error getting user prices:', error);
    return { success: false, error };
  }
};

/**
 * Get price comparison data for a product
 */
export const getPriceComparison = async (
  productId: string,
  userId: string
): Promise<DatabaseResult<{
  prices: PriceEntry[];
  lowestPrice: PriceEntry | null;
  highestPrice: PriceEntry | null;
  averagePrice: number;
}>> => {
  try {
    const result = await getProductPrices(productId, userId);
    
    if (!result.success || !result.data || result.data.length === 0) {
      return {
        success: true,
        data: {
          prices: [],
          lowestPrice: null,
          highestPrice: null,
          averagePrice: 0
        }
      };
    }

    const prices = result.data;
    const lowestPrice = prices.reduce((min, price) => 
      price.price < min.price ? price : min
    );
    const highestPrice = prices.reduce((max, price) => 
      price.price > max.price ? price : max
    );
    const averagePrice = prices.reduce((sum, price) => sum + price.price, 0) / prices.length;

    return {
      success: true,
      data: {
        prices,
        lowestPrice,
        highestPrice,
        averagePrice: Math.round(averagePrice * 100) / 100
      }
    };
  } catch (error) {
    console.error('Error getting price comparison:', error);
    return { success: false, error };
  }
};