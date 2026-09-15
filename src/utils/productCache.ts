import type { InventoryProduct } from '../services/inventory/products';

// Collection product reads are short-lived UI acceleration, not an offline
// store. Keeping this bounded and in memory avoids persisting one account's
// inventory into another account's browser session.
const MAX_OWNERS = 8;
const MAX_PRODUCTS_PER_OWNER = 500;
const productCaches = new Map<string, Map<string, InventoryProduct>>();
let generation = 0;

function ownerCache(owner: string): Map<string, InventoryProduct> {
  let cache = productCaches.get(owner);
  if (!cache) {
    cache = new Map();
    productCaches.set(owner, cache);
    while (productCaches.size > MAX_OWNERS) {
      const oldest = productCaches.keys().next().value;
      if (!oldest) break;
      productCaches.delete(oldest);
    }
  }
  return cache;
}

export const getProductCacheGeneration = (): number => generation;

export const getCachedProducts = (productIds: string[], owner: string) => {
  const cache = productCaches.get(owner);
  const cachedProducts: InventoryProduct[] = [];
  const missingIds: string[] = [];
  for (const id of productIds) {
    const product = cache?.get(id);
    if (product) cachedProducts.push(product);
    else missingIds.push(id);
  }
  return { cachedProducts, missingIds };
};

/** A stale request may pass its captured generation; it is intentionally ignored. */
export const setCachedProducts = (
  products: InventoryProduct[], owner: string, expectedGeneration = generation
): void => {
  if (expectedGeneration !== generation) return;
  const cache = ownerCache(owner);
  for (const product of products) if (product.id) cache.set(product.id, product);
  while (cache.size > MAX_PRODUCTS_PER_OWNER) {
    const oldest = cache.keys().next().value;
    if (!oldest) break;
    cache.delete(oldest);
  }
};

export const addProductsToCache = setCachedProducts;

/** Invalidate all owners on logout/account change or an inventory mutation. */
export const invalidateCache = (): void => {
  generation += 1;
  productCaches.clear();
};

export const getCacheStats = () => ({
  ownerCount: productCaches.size,
  productCount: Array.from(productCaches.values()).reduce((count, cache) => count + cache.size, 0),
});

export const getAllCachedProducts = (owner: string): InventoryProduct[] =>
  Array.from(productCaches.get(owner)?.values() ?? []);

export default { getProductCacheGeneration, getCachedProducts, setCachedProducts, addProductsToCache, invalidateCache, getCacheStats, getAllCachedProducts };
