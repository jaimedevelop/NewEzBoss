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

    if (filters.trade) q = query(q, where('trade', '==', filters.trade));
    if (filters.section) q = query(q, where('section', '==', filters.section));
    if (filters.category) q = query(q, where('category', '==', filters.category));
    if (filters.subcategory) q = query(q, where('subcategory', '==', filters.subcategory));
    if (filters.type) q = query(q, where('type', '==', filters.type));
    if (filters.size) q = query(q, where('size', '==', filters.size));
    if (filters.supplier) q = query(q, where('supplier', '==', filters.supplier));
    if (filters.location) q = query(q, where('location', '==', filters.location));

    const sortField = filters.sortBy || 'name';
    const sortDirection = filters.sortOrder || 'asc';
    q = query(q, orderBy(sortField, sortDirection));

    if (filters.limit) {
      const { limit: firestoreLimit } = await import('firebase/firestore');
      q = query(q, firestoreLimit(filters.limit));
    }

    const querySnapshot: QuerySnapshot = await getDocs(q);

    let products: InventoryProduct[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as InventoryProduct[];

    if (filters.lowStock) products = products.filter(isLowStock);
    if (filters.outOfStock) products = products.filter(isOutOfStock);
    if (filters.inStock) products = products.filter(isInStock);
    if (filters.searchTerm) {
      products = products.filter((p) => matchesSearchTerm(p, filters.searchTerm!));
    }

    return { success: true, data: products };
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
  categorySelection: CategorySelection
): Promise<DatabaseResult<InventoryProduct[]>> => {
  try {
    const baseQuery = query(
      collection(db, COLLECTION_NAME),
      orderBy('name', 'asc')
    );

    const snapshot = await getDocs(baseQuery);

    // Legacy detection: sections array contains plain strings
    const isLegacy =
      categorySelection.sections.length > 0 &&
      typeof categorySelection.sections[0] === 'string';

    const filteredProducts: InventoryProduct[] = [];

    snapshot.docs.forEach((doc) => {
      const product = { id: doc.id, ...doc.data() } as InventoryProduct;
      const shouldInclude = isLegacy
        ? matchLegacyFlat(product, categorySelection as any)
        : matchHierarchical(product, categorySelection);

      if (shouldInclude) filteredProducts.push(product);
    });

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
  if (selection.trade && product.trade !== selection.trade) return false;
  if (selection.sections.length > 0 && !selection.sections.includes(product.section)) return false;
  if (selection.categories.length > 0 && !selection.categories.includes(product.category)) return false;

  if (selection.subcategories.length > 0) {
    const hasMatchingSubcategory = selection.subcategories.includes(product.subcategory);
    const hasNoSubcategory = !product.subcategory || product.subcategory === '' || product.subcategory === '(none)';
    if (!hasMatchingSubcategory) {
      if (hasNoSubcategory) {
        if (!selection.categories.includes(product.category)) return false;
      } else {
        return false;
      }
    }
  }

  if (selection.types.length > 0) {
    const hasMatchingType = selection.types.includes(product.type);
    const hasNoType = !product.type || product.type === '' || product.type === '(none)';
    if (!hasMatchingType) {
      if (hasNoType) {
        if (!selection.subcategories.includes(product.subcategory)) return false;
      } else {
        return false;
      }
    }
  }

  return true;
}

/**
 * ID-first match with name fallback. Skips the check entirely when the
 * selection has no constraint at that level (both id and name are absent).
 */
function matchField(
  productValue: string,
  productId: string | undefined,
  selectionId: string | undefined,
  selectionName: string | undefined
): boolean {
  if (!selectionId && !selectionName) return true; // no constraint — skip
  if (productId && selectionId) return productId === selectionId;
  return productValue === selectionName;
}

/**
 * Match product against hierarchical category selection.
 * A product matches if it satisfies ANY of the selected sections/categories/subcategories/types.
 * Each level uses ID-first matching with name fallback, and skips ancestor checks
 * when the ancestor info is absent (e.g. section selected without a resolved tradeName).
 */
function matchHierarchical(
  product: InventoryProduct,
  selection: CategorySelection
): boolean {
  const sections = selection.sections as any[];
  const categories = selection.categories as any[];
  const subcategories = selection.subcategories as any[];
  const types = (selection.types || []) as any[];

  const hasAnySelection =
    sections.length > 0 ||
    categories.length > 0 ||
    subcategories.length > 0 ||
    types.length > 0;

  // Trade-only selection
  if (!hasAnySelection) {
    if (selection.tradeId) return (product as any).tradeId === selection.tradeId;
    if (selection.trade) return product.trade === selection.trade;
    return true;
  }

  // Section-level: product.section matches s.name, ancestor checks skipped when absent
  if (sections.length > 0) {
    const match = sections.some((s: any) =>
      matchField(product.section, undefined, undefined, s.name) &&
      matchField(product.trade, undefined, s.tradeId, s.tradeName)
    );
    if (match) return true;
  }

  // Category-level
  if (categories.length > 0) {
    const match = categories.some((c: any) =>
      matchField(product.category, undefined, undefined, c.name) &&
      matchField(product.section, undefined, c.sectionId, c.sectionName) &&
      matchField(product.trade, undefined, c.tradeId, c.tradeName)
    );
    if (match) return true;
  }

  // Subcategory-level
  if (subcategories.length > 0) {
    const match = subcategories.some((sc: any) =>
      matchField(product.subcategory, undefined, undefined, sc.name) &&
      matchField(product.category, undefined, sc.categoryId, sc.categoryName) &&
      matchField(product.section, undefined, sc.sectionId, sc.sectionName) &&
      matchField(product.trade, undefined, sc.tradeId, sc.tradeName)
    );
    if (match) return true;
  }

  // Type-level
  if (types.length > 0) {
    const match = types.some((t: any) =>
      matchField(product.type, undefined, undefined, t.name) &&
      matchField(product.subcategory, undefined, t.subcategoryId, t.subcategoryName) &&
      matchField(product.category, undefined, t.categoryId, t.categoryName) &&
      matchField(product.section, undefined, t.sectionId, t.sectionName) &&
      matchField(product.trade, undefined, t.tradeId, t.tradeName)
    );
    if (match) return true;
  }

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