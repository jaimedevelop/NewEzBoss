// src/services/products/products.queries.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  QuerySnapshot,
  DocumentSnapshot,
  Query,
  DocumentData
} from 'firebase/firestore';
import { db } from '../../../firebase/config';
import type { DatabaseResult } from '../../../firebase/database';
import { CategorySelection } from '../../collections';
import {
  InventoryProduct,
  ProductFilters,
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
 * Get products with filtering and sorting (no pagination)
 */
export const getProducts = async (
  filters: ProductFilters = {}
): Promise<DatabaseResult<InventoryProduct[]>> => {
  try {
    let q: Query<DocumentData> = query(collection(db, COLLECTION_NAME));

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

    const querySnapshot: QuerySnapshot = await getDocs(q);

    let products: InventoryProduct[] = querySnapshot.docs.map((doc) => ({
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
      data: products,
    };
  } catch (error) {
    console.error('Error getting products:', error);
    return { success: false, error };
  }
};

/**
 * Get products by category selection (for Collections module)
 * Filters products through the entire hierarchy: Trade → Section → Category → Subcategory → Type
 * Supports both legacy flat structure and new hierarchical structure
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

    // ✅ Check if this is legacy flat structure (backward compatibility)
    const isLegacy =
      categorySelection.sections.length > 0 &&
      typeof categorySelection.sections[0] === 'string';

    console.log('🔍 Selection structure:', isLegacy ? 'LEGACY (flat)' : 'HIERARCHICAL');

    const filteredProducts: InventoryProduct[] = [];

    snapshot.docs.forEach((doc) => {
      const product = { id: doc.id, ...doc.data() } as InventoryProduct;
      let shouldInclude = false;

      if (isLegacy) {
        // ✅ LEGACY FLAT STRUCTURE (backward compatibility)
        shouldInclude = matchLegacyFlat(product, categorySelection as any);
      } else {
        // ✅ NEW HIERARCHICAL STRUCTURE
        shouldInclude = matchHierarchical(product, categorySelection);
      }

      if (shouldInclude) {
        filteredProducts.push(product);
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
 * Match product against legacy flat category selection
 */
function matchLegacyFlat(
  product: InventoryProduct,
  selection: {
    trade?: string;
    sections: string[];
    categories: string[];
    subcategories: string[];
    types: string[]
  }
): boolean {
  // Trade must match if specified
  if (selection.trade && product.trade !== selection.trade) {
    return false;
  }

  // Sections must match if specified
  if (selection.sections.length > 0) {
    if (!selection.sections.includes(product.section)) {
      return false;
    }
  }

  // Categories must match if specified
  if (selection.categories.length > 0) {
    if (!selection.categories.includes(product.category)) {
      return false;
    }
  }

  // Subcategories must match if specified
  if (selection.subcategories.length > 0) {
    const hasMatchingSubcategory = selection.subcategories.includes(product.subcategory);
    const hasNoSubcategory = !product.subcategory || product.subcategory === '' || product.subcategory === '(none)';

    if (!hasMatchingSubcategory) {
      if (hasNoSubcategory) {
        // Include "no subcategory" products if their category was explicitly selected
        const categoryWasSelected = selection.categories.includes(product.category);
        if (!categoryWasSelected) {
          return false;
        }
      } else {
        return false;
      }
    }
  }

  // Types must match if specified
  if (selection.types.length > 0) {
    const hasMatchingType = selection.types.includes(product.type);
    const hasNoType = !product.type || product.type === '' || product.type === '(none)';

    if (!hasMatchingType) {
      if (hasNoType) {
        // Include "no type" products if their subcategory was explicitly selected
        const subcategoryWasSelected = selection.subcategories.includes(product.subcategory);
        if (!subcategoryWasSelected) {
          return false;
        }
      } else {
        return false;
      }
    }
  }

  return true;
}

/**
 * Match product against hierarchical category selection
 * Logic: Product matches if it's in ANY of the selected sections/categories/subcategories/types
 */
function matchHierarchical(
  product: InventoryProduct,
  selection: CategorySelection
): boolean {
  // Trade must match if specified
  if (selection.trade && product.trade !== selection.trade) {
    return false;
  }

  // If nothing specific is selected, match all items in the trade
  const hasAnySelection =
    selection.sections.length > 0 ||
    selection.categories.length > 0 ||
    selection.subcategories.length > 0 ||
    (selection.types && selection.types.length > 0);

  if (!hasAnySelection) {
    return true; // No specific filters, match everything in the trade
  }

  // Check if product matches ANY of the selected sections (with parent context)
  if (selection.sections.length > 0) {
    const sectionMatch = (selection.sections as any[]).some((s: any) =>
      s.name === product.section &&
      s.tradeName === product.trade
    );
    if (sectionMatch) return true;
  }

  // Check if product matches ANY of the selected categories (with parent context)
  if (selection.categories.length > 0) {
    const categoryMatch = (selection.categories as any[]).some((c: any) =>
      c.name === product.category &&
      c.sectionName === product.section &&
      c.tradeName === product.trade
    );
    if (categoryMatch) return true;
  }

  // Check if product matches ANY of the selected subcategories (with full parent chain)
  if (selection.subcategories.length > 0) {
    const subcategoryMatch = (selection.subcategories as any[]).some((sc: any) =>
      sc.name === product.subcategory &&
      sc.categoryName === product.category &&
      sc.sectionName === product.section &&
      sc.tradeName === product.trade
    );
    if (subcategoryMatch) return true;
  }

  // Check if product matches ANY of the selected types (full parent chain)
  if (selection.types && selection.types.length > 0) {
    const typeMatch = (selection.types as any[]).some((t: any) =>
      t.name === product.type &&
      t.subcategoryName === product.subcategory &&
      t.categoryName === product.category &&
      t.sectionName === product.section &&
      t.tradeName === product.trade
    );
    if (typeMatch) return true;
  }

  // No matches found
  return false;
}

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