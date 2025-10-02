// src/utils/productCache.ts

import type { InventoryProduct } from '../services/products';

const CACHE_KEY = 'products-cache-v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface ProductCache {
  timestamp: number;
  expiresAt: number;
  products: Record<string, InventoryProduct>;
  version: number;
}

/**
 * Check if cache exists and is still valid (not expired)
 */
export const isCacheValid = (): boolean => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return false;

    const cache: ProductCache = JSON.parse(cached);
    const now = Date.now();

    return cache.expiresAt > now;
  } catch (error) {
    console.error('Error checking cache validity:', error);
    return false;
  }
};

/**
 * Get cached products by their IDs
 * Returns { cachedProducts, missingIds }
 */
export const getCachedProducts = (
  productIds: string[]
): { cachedProducts: InventoryProduct[]; missingIds: string[] } => {
  const result = {
    cachedProducts: [] as InventoryProduct[],
    missingIds: [] as string[],
  };

  try {
    if (!isCacheValid()) {
      console.log('⚠️ Cache expired or invalid');
      return {
        cachedProducts: [],
        missingIds: productIds,
      };
    }

    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return {
        cachedProducts: [],
        missingIds: productIds,
      };
    }

    const cache: ProductCache = JSON.parse(cached);

    productIds.forEach(id => {
      if (cache.products[id]) {
        result.cachedProducts.push(cache.products[id]);
      } else {
        result.missingIds.push(id);
      }
    });

    const hitRate = ((result.cachedProducts.length / productIds.length) * 100).toFixed(1);
    
    if (result.cachedProducts.length > 0) {
      console.log(`✅ Cache hit: ${result.cachedProducts.length}/${productIds.length} products (${hitRate}%)`);
    }
    
    if (result.missingIds.length > 0) {
      console.log(`⚠️ Cache miss: ${result.missingIds.length} products need fetching`);
    }

    return result;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return {
      cachedProducts: [],
      missingIds: productIds,
    };
  }
};

/**
 * Store products in cache
 * Merges with existing cache instead of replacing
 */
export const setCachedProducts = (products: InventoryProduct[]): void => {
  try {
    const now = Date.now();
    
    // Get existing cache to merge
    let existingProducts: Record<string, InventoryProduct> = {};
    
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached && isCacheValid()) {
      const existingCache: ProductCache = JSON.parse(cached);
      existingProducts = existingCache.products;
    }

    // Merge new products
    const updatedProducts = { ...existingProducts };
    products.forEach(product => {
      if (product.id) {
        updatedProducts[product.id] = product;
      }
    });

    const cache: ProductCache = {
      timestamp: now,
      expiresAt: now + CACHE_TTL_MS,
      products: updatedProducts,
      version: 1,
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    
    console.log(`💾 Cached ${products.length} products (Total: ${Object.keys(updatedProducts).length})`);
    console.log(`⏰ Cache expires in ${(CACHE_TTL_MS / (1000 * 60 * 60)).toFixed(1)} hours`);
  } catch (error) {
    console.error('Error writing to cache:', error);
    
    // If localStorage is full, try to clear old cache
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.warn('Cache storage full, clearing old cache');
      invalidateCache();
    }
  }
};

/**
 * Add products to existing cache without replacing
 */
export const addProductsToCache = (products: InventoryProduct[]): void => {
  setCachedProducts(products); // Uses merge logic internally
};

/**
 * Manually invalidate/clear the cache
 */
export const invalidateCache = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY);
    console.log('🗑️ Product cache cleared');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

/**
 * Get cache statistics for debugging/monitoring
 */
export const getCacheStats = (): {
  exists: boolean;
  valid: boolean;
  productCount: number;
  ageHours: number;
  expiresInHours: number;
} | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return {
        exists: false,
        valid: false,
        productCount: 0,
        ageHours: 0,
        expiresInHours: 0,
      };
    }

    const cache: ProductCache = JSON.parse(cached);
    const now = Date.now();
    const ageMs = now - cache.timestamp;
    const expiresInMs = cache.expiresAt - now;

    return {
      exists: true,
      valid: expiresInMs > 0,
      productCount: Object.keys(cache.products).length,
      ageHours: ageMs / (1000 * 60 * 60),
      expiresInHours: Math.max(0, expiresInMs / (1000 * 60 * 60)),
    };
  } catch (error) {
    console.error('Error getting cache stats:', error);
    return null;
  }
};

/**
 * Get all cached products (for debugging)
 */
export const getAllCachedProducts = (): InventoryProduct[] => {
  try {
    if (!isCacheValid()) return [];

    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return [];

    const cache: ProductCache = JSON.parse(cached);
    return Object.values(cache.products);
  } catch (error) {
    console.error('Error getting all cached products:', error);
    return [];
  }
};

export default {
  isCacheValid,
  getCachedProducts,
  setCachedProducts,
  addProductsToCache,
  invalidateCache,
  getCacheStats,
  getAllCachedProducts,
};