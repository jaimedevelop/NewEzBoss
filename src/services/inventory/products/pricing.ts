// src/services/pricing.ts - Simplified to work with embedded prices
import { 
  getProduct, 
  updateProduct, 
  type InventoryProduct 
} from './';

export interface PriceEntry {
  id: string;
  store: string;
  price: number;
  lastUpdated?: string;
}

export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  id?: string;
}

/**
 * Get all price entries for a product
 */
export const getProductPrices = async (
  productId: string
): Promise<DatabaseResult<PriceEntry[]>> => {
  try {
    const result = await getProduct(productId);
    if (result.success && result.data) {
      const product = result.data as InventoryProduct;
      return { 
        success: true, 
        data: product.priceEntries || [] 
      };
    }
    return { success: false, error: 'Product not found' };
  } catch (error) {
    console.error('Error getting product prices:', error);
    return { success: false, error };
  }
};

/**
 * Update all price entries for a product
 */
export const updateProductPrices = async (
  productId: string,
  priceEntries: PriceEntry[]
): Promise<DatabaseResult> => {
  try {
    // Ensure each price entry has an ID
    const pricesWithIds = priceEntries.map(entry => ({
      ...entry,
      id: entry.id || `price-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lastUpdated: new Date().toISOString().split('T')[0]
    }));

    const result = await updateProduct(productId, {
      priceEntries: pricesWithIds
    });

    return result;
  } catch (error) {
    console.error('Error updating product prices:', error);
    return { success: false, error };
  }
};

/**
 * Get price comparison data for a product
 */
export const getPriceComparison = async (
  productId: string
): Promise<DatabaseResult<{
  prices: PriceEntry[];
  lowestPrice: PriceEntry | null;
  highestPrice: PriceEntry | null;
  averagePrice: number;
}>> => {
  try {
    const result = await getProductPrices(productId);
    
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