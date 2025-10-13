// src/services/products/products.subscriptions.ts
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  QuerySnapshot,
  DocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { InventoryProduct, ProductFilters } from './products.types';
import { COLLECTION_NAME, matchesSearchTerm, isLowStock } from './products.utils';

/**
 * Subscribe to products for real-time updates
 * Returns an unsubscribe function to clean up the listener
 */
export const subscribeToProducts = (
  callback: (products: InventoryProduct[]) => void,
  filters: ProductFilters = {}
): Unsubscribe | null => {
  try {
    let q = collection(db, COLLECTION_NAME);

    // Apply basic Firestore filters
    if (filters.trade) {
      q = query(q, where('trade', '==', filters.trade));
    }

    if (filters.section) {
      q = query(q, where('section', '==', filters.section));
    }

    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }

    if (filters.type) {
      q = query(q, where('type', '==', filters.type));
    }

    // Sorting
    const sortField = filters.sortBy || 'name';
    const sortDirection = filters.sortOrder || 'asc';
    q = query(q, orderBy(sortField, sortDirection));

    console.log('🔔 Setting up real-time subscription for products');

    return onSnapshot(
      q,
      (querySnapshot: QuerySnapshot) => {
        let products: InventoryProduct[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as InventoryProduct[];

        // Apply client-side filters
        if (filters.lowStock) {
          products = products.filter(isLowStock);
        }

        if (filters.searchTerm) {
          products = products.filter((product) =>
            matchesSearchTerm(product, filters.searchTerm!)
          );
        }

        console.log(`🔔 Real-time update: ${products.length} products`);
        callback(products);
      },
      (error) => {
        console.error('❌ Error in product subscription:', error);
      }
    );
  } catch (error) {
    console.error('❌ Error subscribing to products:', error);
    return null;
  }
};

/**
 * Subscribe to a single product for real-time updates
 */
export const subscribeToProduct = (
  productId: string,
  callback: (product: InventoryProduct | null) => void
): Unsubscribe | null => {
  try {
    const productRef = doc(db, COLLECTION_NAME, productId);

    console.log(`🔔 Setting up real-time subscription for product: ${productId}`);

    return onSnapshot(
      productRef,
      (docSnapshot: DocumentSnapshot) => {
        if (docSnapshot.exists()) {
          const product = {
            id: docSnapshot.id,
            ...docSnapshot.data(),
          } as InventoryProduct;

          console.log(`🔔 Real-time update for product: ${productId}`);
          callback(product);
        } else {
          console.log(`🔔 Product deleted: ${productId}`);
          callback(null);
        }
      },
      (error) => {
        console.error(`❌ Error in product subscription for ${productId}:`, error);
      }
    );
  } catch (error) {
    console.error('❌ Error subscribing to product:', error);
    return null;
  }
};

/**
 * Subscribe to low stock products for real-time alerts
 */
export const subscribeToLowStock = (
  callback: (products: InventoryProduct[]) => void
): Unsubscribe | null => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('onHand', 'asc'));

    console.log('🔔 Setting up real-time subscription for low stock products');

    return onSnapshot(
      q,
      (querySnapshot: QuerySnapshot) => {
        const products: InventoryProduct[] = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as InventoryProduct[];

        // Filter to only low stock products
        const lowStockProducts = products.filter(isLowStock);

        console.log(
          `🔔 Real-time low stock update: ${lowStockProducts.length} products below minimum`
        );
        callback(lowStockProducts);
      },
      (error) => {
        console.error('❌ Error in low stock subscription:', error);
      }
    );
  } catch (error) {
    console.error('❌ Error subscribing to low stock:', error);
    return null;
  }
};

/**
 * Subscribe to products by trade for real-time trade-specific updates
 */
export const subscribeToProductsByTrade = (
  trade: string,
  callback: (products: InventoryProduct[]) => void
): Unsubscribe | null => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('trade', '==', trade),
      orderBy('name', 'asc')
    );

    console.log(`🔔 Setting up real-time subscription for trade: ${trade}`);

    return onSnapshot(
      q,
      (querySnapshot: QuerySnapshot) => {
        const products: InventoryProduct[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as InventoryProduct[];

        console.log(`🔔 Real-time update for ${trade}: ${products.length} products`);
        callback(products);
      },
      (error) => {
        console.error(`❌ Error in subscription for trade ${trade}:`, error);
      }
    );
  } catch (error) {
    console.error('❌ Error subscribing to products by trade:', error);
    return null;
  }
};

/**
 * Subscribe to products by category for real-time category-specific updates
 */
export const subscribeToProductsByCategory = (
  category: string,
  callback: (products: InventoryProduct[]) => void
): Unsubscribe | null => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('category', '==', category),
      orderBy('name', 'asc')
    );

    console.log(`🔔 Setting up real-time subscription for category: ${category}`);

    return onSnapshot(
      q,
      (querySnapshot: QuerySnapshot) => {
        const products: InventoryProduct[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as InventoryProduct[];

        console.log(
          `🔔 Real-time update for ${category}: ${products.length} products`
        );
        callback(products);
      },
      (error) => {
        console.error(`❌ Error in subscription for category ${category}:`, error);
      }
    );
  } catch (error) {
    console.error('❌ Error subscribing to products by category:', error);
    return null;
  }
};

/**
 * Create a managed subscription that handles cleanup automatically
 * Returns an object with the unsubscribe function
 */
export const createManagedSubscription = (
  subscriptionFn: () => Unsubscribe | null
): { unsubscribe: () => void; isActive: boolean } => {
  let unsubscribeFn: Unsubscribe | null = null;
  let isActive = false;

  // Start subscription
  unsubscribeFn = subscriptionFn();
  isActive = unsubscribeFn !== null;

  if (!isActive) {
    console.warn('⚠️ Failed to create subscription');
  }

  return {
    unsubscribe: () => {
      if (unsubscribeFn && isActive) {
        unsubscribeFn();
        isActive = false;
        console.log('✅ Subscription cleaned up');
      }
    },
    isActive,
  };
};