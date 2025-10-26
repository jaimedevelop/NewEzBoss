// src/services/products/products.queries.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  QuerySnapshot,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import type { DatabaseResult } from '../../../firebase/database';
import { CategorySelection } from '../../collections';
import {
  InventoryProduct,
  ProductFilters,
  ProductsResponse,
  StockAlert,
} from './products.types';
import {
  COLLECTION_NAME,
  matchesSearchTerm,
  isLowStock,
  isOutOfStock,
  isInStock,
  getPrimarySKU,
  getStockSeverity,
} from './products.utils';

/**
 * Get a single product by ID
 */
export const getProduct = async (
  productId: string
): Promise<DatabaseResult<InventoryProduct>> => {
  try {
    const productRef = doc(db, COLLECTION_NAME, productId);
    const productSnap: DocumentSnapshot = await getDoc(productRef);

    if (productSnap.exists()) {
      const data = productSnap.data();
      return {
        success: true,
        data: {
          id: productSnap.id,
          ...data,
        } as InventoryProduct,
      };
    } else {
      return { success: false, error: 'Product not found' };
    }
  } catch (error) {
    console.error('Error getting product:', error);
    return { success: false, error };
  }
};

/**
 * Get products with filtering, sorting, and pagination
 */
export const getProducts = async (
  filters: ProductFilters = {},
  pageSize: number = 999,
  lastDocument?: DocumentSnapshot
): Promise<DatabaseResult<ProductsResponse>> => {
  try {
    let q = collection(db, COLLECTION_NAME);

    // Apply Firestore filters
    if (filters.trade) {
      q = query(q, where('trade', '==', filters.trade));
    }

    if (filters.section) {
      q = query(q, where('section', '==', filters.section));
    }

    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }

    if (filters.subcategory) {
      q = query(q, where('subcategory', '==', filters.subcategory));
    }

    if (filters.type) {
      q = query(q, where('type', '==', filters.type));
    }

    if (filters.size) {
      q = query(q, where('size', '==', filters.size));
    }

    if (filters.supplier) {
      q = query(q, where('supplier', '==', filters.supplier));
    }

    if (filters.location) {
      q = query(q, where('location', '==', filters.location));
    }

    // Sorting
    const sortField = filters.sortBy || 'name';
    const sortDirection = filters.sortOrder || 'asc';
    q = query(q, orderBy(sortField, sortDirection));

    // Pagination
    if (lastDocument) {
      q = query(q, startAfter(lastDocument));
    }

    // Limit results (get one extra to check if there are more)
    q = query(q, limit(pageSize + 1));

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const docs = querySnapshot.docs;

    // Check if there are more results
    const hasMore = docs.length > pageSize;
    const productsToReturn = hasMore ? docs.slice(0, -1) : docs;
    const lastDoc =
      productsToReturn.length > 0
        ? productsToReturn[productsToReturn.length - 1]
        : undefined;

    let products: InventoryProduct[] = productsToReturn.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as InventoryProduct[];

    // Apply client-side filters that can't be done in Firestore
    if (filters.lowStock) {
      products = products.filter(isLowStock);
    }

    if (filters.outOfStock) {
      products = products.filter(isOutOfStock);
    }

    if (filters.inStock) {
      products = products.filter(isInStock);
    }

    if (filters.searchTerm) {
      products = products.filter((product) =>
        matchesSearchTerm(product, filters.searchTerm!)
      );
    }

    return {
      success: true,
      data: {
        products,
        hasMore,
        lastDoc,
      },
    };
  } catch (error) {
    console.error('Error getting products:', error);
    return { success: false, error };
  }
};

/**
 * Get products by category selection (for Collections module)
 * Filters products through the entire hierarchy: Trade → Section → Category → Subcategory → Type
 */
export const getProductsByCategories = async (
  categorySelection: CategorySelection,
  userId: string
): Promise<DatabaseResult<InventoryProduct[]>> => {
  console.log('🔍 getProductsByCategories called with:', categorySelection);

  try {
    const baseQuery = query(
      collection(db, COLLECTION_NAME),
      orderBy('name', 'asc')
    );

    const snapshot = await getDocs(baseQuery);
    console.log(`📊 Total products in database: ${snapshot.size}`);

    const filteredProducts: InventoryProduct[] = [];

    snapshot.docs.forEach((doc) => {
      const product = { id: doc.id, ...doc.data() } as InventoryProduct;
      let shouldInclude = true;

      // 1. Check trade (must match if specified)
      if (categorySelection.trade && product.trade !== categorySelection.trade) {
        shouldInclude = false;
      }

      // 2. Check sections (must match if specified)
      if (
        shouldInclude &&
        categorySelection.sections &&
        categorySelection.sections.length > 0
      ) {
        if (!categorySelection.sections.includes(product.section)) {
          shouldInclude = false;
        }
      }

      // 3. Check categories (must match if specified) - CRITICAL!
      if (
        shouldInclude &&
        categorySelection.categories &&
        categorySelection.categories.length > 0
      ) {
        if (!categorySelection.categories.includes(product.category)) {
          shouldInclude = false;
        }
      }

      // 4. Check subcategories (ONLY if categories matched or weren't specified)
      if (
        shouldInclude &&
        categorySelection.subcategories &&
        categorySelection.subcategories.length > 0
      ) {
        const hasMatchingSubcategory = categorySelection.subcategories.includes(
          product.subcategory
        );
        const hasNoSubcategory =
          !product.subcategory ||
          product.subcategory === '' ||
          product.subcategory === '(none)';

        // Only include "no subcategory" products if their category was explicitly selected
        if (!hasMatchingSubcategory) {
          if (hasNoSubcategory) {
            const categoryWasSelected =
              categorySelection.categories &&
              categorySelection.categories.includes(product.category);
            if (!categoryWasSelected) {
              shouldInclude = false;
            }
          } else {
            shouldInclude = false;
          }
        }
      }

      // 5. Check types (ONLY if subcategories matched or weren't specified)
      if (
        shouldInclude &&
        categorySelection.types &&
        categorySelection.types.length > 0
      ) {
        const hasMatchingType = categorySelection.types.includes(product.type);
        const hasNoType =
          !product.type || product.type === '' || product.type === '(none)';

        // Only include "no type" products if their subcategory was explicitly selected
        if (!hasMatchingType) {
          if (hasNoType) {
            const subcategoryWasSelected =
              categorySelection.subcategories &&
              categorySelection.subcategories.includes(product.subcategory);
            if (!subcategoryWasSelected) {
              shouldInclude = false;
            }
          } else {
            shouldInclude = false;
          }
        }
      }

      if (shouldInclude) {
        filteredProducts.push(product);
        console.log(`✅ Including "${product.name}" - full path matches:`, {
          trade: product.trade,
          section: product.section,
          category: product.category,
          subcategory: product.subcategory || '(none)',
          type: product.type || '(none)',
        });
      }
    });

    console.log(
      `✅ Filtered to ${filteredProducts.length} products from ${snapshot.size} total`
    );
    console.log('📋 Sample filtered products:', filteredProducts.slice(0, 3));

    return { success: true, data: filteredProducts };
  } catch (error) {
    console.error('💥 Error getting products by categories:', error);
    return { success: false, error };
  }
};

/**
 * Get products with low stock alerts
 */
export const getLowStockProducts = async (): Promise<
  DatabaseResult<StockAlert[]>
> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('onHand', 'asc'));
    const querySnapshot: QuerySnapshot = await getDocs(q);

    const alerts: StockAlert[] = querySnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as InventoryProduct))
      .filter(isLowStock)
      .map((product) => ({
        productId: product.id!,
        productName: product.name,
        sku: getPrimarySKU(product),
        currentStock: product.onHand,
        minStock: product.minStock,
        severity: getStockSeverity(product) as 'low' | 'critical',
      }));

    return { success: true, data: alerts };
  } catch (error) {
    console.error('Error getting low stock products:', error);
    return { success: false, error };
  }
};