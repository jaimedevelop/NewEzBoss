// src/services/products.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  DocumentReference,
  QuerySnapshot,
  DocumentSnapshot,
  Unsubscribe,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { DatabaseResult } from '../firebase/database';
import { CategorySelection } from './collections';

// SKU entry interface for multiple supplier SKUs
export interface SKUEntry {
  id: string;
  store: string;
  sku: string;
}

export interface PriceEntry {
  id: string;
  store: string;
  price: number;
  lastUpdated?: string;
}

// Product interface matching your ProductModal - Updated with Trade hierarchy
export interface InventoryProduct {
  id?: string;
  name: string;
  sku: string; // This will be deprecated in favor of SKUs array
  trade: string; // NEW - Top level of hierarchy
  section: string;
  category: string;
  subcategory: string;
  type: string; // Changed from enum to string - now part of hierarchy
  size?: string;
  description: string;
  unit: string;
  onHand: number;
  assigned: number;
  available: number;
  minStock: number;
  maxStock: number;
  supplier: string;
  location: string;
  lastUpdated: string;
  priceEntries?: PriceEntry[];
  skus?: SKUEntry[];
  barcode?: string;
  imageUrl?: string;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

// Filter interface for product queries - Updated with Trade
export interface ProductFilters {
  trade?: string; // NEW
  section?: string;
  category?: string;
  subcategory?: string;
  type?: string;
  size?: string;
  supplier?: string;
  location?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  inStock?: boolean;
  searchTerm?: string;
  sortBy?: 'name' | 'trade' | 'section' | 'category' | 'unitPrice' | 'onHand' | 'lastUpdated';
  sortOrder?: 'asc' | 'desc';
}

// Pagination interface
export interface ProductsResponse {
  products: InventoryProduct[];
  hasMore: boolean;
  lastDoc?: DocumentSnapshot;
}

// Stock alert interface
export interface StockAlert {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  severity: 'low' | 'critical';
}

const COLLECTION_NAME = 'products';

/**
 * Create a new product
 */
export const createProduct = async (
  productData: Omit<InventoryProduct, 'id' | 'createdAt' | 'updatedAt' | 'available'>
): Promise<DatabaseResult> => {
  try {
    // Calculate available quantity
    const available = productData.onHand - productData.assigned;

    const docRef: DocumentReference = await addDoc(collection(db, COLLECTION_NAME), {
      ...productData,
      available,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating product:', error);
    return { success: false, error };
  }
};

/**
 * Get a single product by ID
 */
export const getProduct = async (productId: string): Promise<DatabaseResult<InventoryProduct>> => {
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
        } as InventoryProduct
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
  pageSize: number = 50,
  lastDocument?: DocumentSnapshot
): Promise<DatabaseResult<ProductsResponse>> => {
  try {
    let q = collection(db, COLLECTION_NAME);

    // Apply filters - Updated with Trade
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

    // Limit results
    q = query(q, limit(pageSize + 1)); // Get one extra to check if there are more

    const querySnapshot: QuerySnapshot = await getDocs(q);
    const docs = querySnapshot.docs;
    
    // Check if there are more results
    const hasMore = docs.length > pageSize;
    const productsToReturn = hasMore ? docs.slice(0, -1) : docs;
    const lastDoc = productsToReturn.length > 0 ? productsToReturn[productsToReturn.length - 1] : undefined;

    let products: InventoryProduct[] = productsToReturn.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as InventoryProduct[];

    // Apply client-side filters that can't be done in Firestore
    if (filters.lowStock) {
      products = products.filter(product => product.onHand <= product.minStock && product.onHand > 0);
    }

    if (filters.outOfStock) {
      products = products.filter(product => product.onHand === 0);
    }

    if (filters.inStock) {
      products = products.filter(product => product.onHand > product.minStock);
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      products = products.filter(product =>
        product.name.toLowerCase().includes(searchLower) ||
        (product.skus?.some(sku => sku.sku.toLowerCase().includes(searchLower))) ||
        product.description.toLowerCase().includes(searchLower) ||
        product.supplier.toLowerCase().includes(searchLower) ||
        product.trade.toLowerCase().includes(searchLower) ||
        product.section.toLowerCase().includes(searchLower) ||
        product.category.toLowerCase().includes(searchLower) ||
        product.subcategory.toLowerCase().includes(searchLower)
      );
    }

    return {
      success: true,
      data: {
        products,
        hasMore,
        lastDoc
      }
    };
  } catch (error) {
    console.error('Error getting products:', error);
    return { success: false, error };
  }
};

/**
 * Update a product
 */
export const updateProduct = async (
  productId: string,
  productData: Partial<InventoryProduct>
): Promise<DatabaseResult> => {
  try {
    const productRef = doc(db, COLLECTION_NAME, productId);

    // Calculate available if onHand or assigned changed
    const updateData = { ...productData };
    if ('onHand' in updateData || 'assigned' in updateData) {
      // Get current data to calculate available
      const currentDoc = await getDoc(productRef);
      if (currentDoc.exists()) {
        const currentData = currentDoc.data() as InventoryProduct;
        const newOnHand = updateData.onHand ?? currentData.onHand;
        const newAssigned = updateData.assigned ?? currentData.assigned;
        updateData.available = newOnHand - newAssigned;
      }
    }

    await updateDoc(productRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating product:', error);
    return { success: false, error };
  }
};

/**
 * Delete a product
 */
export const deleteProduct = async (productId: string): Promise<DatabaseResult> => {
  try {
    const productRef = doc(db, COLLECTION_NAME, productId);
    await deleteDoc(productRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, error };
  }
};

/**
 * Update product stock levels (for inventory management)
 */
export const updateProductStock = async (
  productId: string,
  onHandChange: number,
  assignedChange: number = 0,
  notes?: string
): Promise<DatabaseResult> => {
  try {
    const productRef = doc(db, COLLECTION_NAME, productId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      return { success: false, error: 'Product not found' };
    }

    const currentData = productSnap.data() as InventoryProduct;
    const newOnHand = Math.max(0, currentData.onHand + onHandChange);
    const newAssigned = Math.max(0, currentData.assigned + assignedChange);
    const newAvailable = newOnHand - newAssigned;

    await updateDoc(productRef, {
      onHand: newOnHand,
      assigned: newAssigned,
      available: newAvailable,
      lastUpdated: new Date().toISOString().split('T')[0],
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating product stock:', error);
    return { success: false, error };
  }
};

/**
 * Get products with low stock alerts
 */
export const getLowStockProducts = async (): Promise<DatabaseResult<StockAlert[]>> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('onHand', 'asc'));
    const querySnapshot: QuerySnapshot = await getDocs(q);

    const alerts: StockAlert[] = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as InventoryProduct))
      .filter(product => product.onHand <= product.minStock)
      .map(product => ({
        productId: product.id!,
        productName: product.name,
        sku: product.skus?.[0]?.sku || product.sku || 'N/A',
        currentStock: product.onHand,
        minStock: product.minStock,
        severity: product.onHand === 0 ? 'critical' : 'low'
      }));

    return { success: true, data: alerts };
  } catch (error) {
    console.error('Error getting low stock products:', error);
    return { success: false, error };
  }
};

/**
 * Bulk update products
 */
export const bulkUpdateProducts = async (
  updates: Array<{ id: string; data: Partial<InventoryProduct> }>
): Promise<DatabaseResult> => {
  try {
    const batch = writeBatch(db);

    for (const update of updates) {
      const productRef = doc(db, COLLECTION_NAME, update.id);
      
      // Calculate available if needed
      const updateData = { ...update.data };
      if ('onHand' in updateData || 'assigned' in updateData) {
        const currentDoc = await getDoc(productRef);
        if (currentDoc.exists()) {
          const currentData = currentDoc.data() as InventoryProduct;
          const newOnHand = updateData.onHand ?? currentData.onHand;
          const newAssigned = updateData.assigned ?? currentData.assigned;
          updateData.available = newOnHand - newAssigned;
        }
      }

      batch.update(productRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error bulk updating products:', error);
    return { success: false, error };
  }
};

/**
 * Subscribe to products for real-time updates
 */
export const subscribeToProducts = (
  callback: (products: InventoryProduct[]) => void,
  filters: ProductFilters = {}
): Unsubscribe | null => {
  try {
    let q = collection(db, COLLECTION_NAME);

    // Apply basic filters (complex filtering will be done client-side)
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

    return onSnapshot(q, (querySnapshot: QuerySnapshot) => {
      let products: InventoryProduct[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as InventoryProduct[];

      // Apply client-side filters
      if (filters.lowStock) {
        products = products.filter(product => product.onHand <= product.minStock);
      }

      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        products = products.filter(product =>
          product.name.toLowerCase().includes(searchLower) ||
          (product.skus?.some(sku => sku.sku.toLowerCase().includes(searchLower))) ||
          product.description.toLowerCase().includes(searchLower) ||
          product.trade.toLowerCase().includes(searchLower)
        );
      }

      callback(products);
    });
  } catch (error) {
    console.error('Error subscribing to products:', error);
    return null;
  }
};

/**
 * Get product statistics for dashboard
 */
export const getProductStats = async (): Promise<DatabaseResult<{
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  byTrade: Record<string, number>; // NEW
  bySection: Record<string, number>;
  byCategory: Record<string, number>;
  byType: Record<string, number>;
}>> => {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnapshot: QuerySnapshot = await getDocs(q);

    const products: InventoryProduct[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as InventoryProduct[];

    const stats = {
      totalProducts: products.length,
      totalValue: products.reduce((sum, product) => sum + (product.onHand * product.unitPrice), 0),
      lowStockCount: products.filter(p => p.onHand <= p.minStock && p.onHand > 0).length,
      outOfStockCount: products.filter(p => p.onHand === 0).length,
      byTrade: {} as Record<string, number>, // NEW
      bySection: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byType: {} as Record<string, number>,
    };

    // Count by trade, section, category, and type
    products.forEach(product => {
      stats.byTrade[product.trade] = (stats.byTrade[product.trade] || 0) + 1;
      stats.bySection[product.section] = (stats.bySection[product.section] || 0) + 1;
      stats.byCategory[product.category] = (stats.byCategory[product.category] || 0) + 1;
      stats.byType[product.type] = (stats.byType[product.type] || 0) + 1;
    });

    return { success: true, data: stats };
  } catch (error) {
    console.error('Error getting product stats:', error);
    return { success: false, error };
  }
};

/**
 * Get products based on category selection from collections
 * Uses AND logic to respect the full hierarchical path
 * INCLUDES products without subcategories/types when parent categories are selected
 */
export const getProductsByCategories = async (
  categorySelection: CategorySelection,
  userId: string
): Promise<DatabaseResult<InventoryProduct[]>> => {
  console.log('🔍 getProductsByCategories called with:', categorySelection);
  
  try {
    // Start by getting all products
    const baseQuery = query(
      collection(db, COLLECTION_NAME),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(baseQuery);
    console.log(`📊 Total products in database: ${snapshot.size}`);
    
    // Filter products based on hierarchical selection (AND logic with inclusive edges)
    const filteredProducts: InventoryProduct[] = [];
    
    snapshot.docs.forEach(doc => {
      const product = { id: doc.id, ...doc.data() } as InventoryProduct;
      let shouldInclude = true; // Start with true, fail on any mismatch
      
      // Check trade (top level) - must match if specified
      if (categorySelection.trade && product.trade !== categorySelection.trade) {
        shouldInclude = false;
      }
      
      // Check sections - must match if specified AND previous levels match
      if (shouldInclude && categorySelection.sections && categorySelection.sections.length > 0) {
        if (!categorySelection.sections.includes(product.section)) {
          shouldInclude = false;
        }
      }
      
      // Check categories - must match if specified AND previous levels match
      if (shouldInclude && categorySelection.categories && categorySelection.categories.length > 0) {
        if (!categorySelection.categories.includes(product.category)) {
          shouldInclude = false;
        }
      }
      
      // Check subcategories - INCLUSIVE: match selected subcategories OR have no subcategory
      if (shouldInclude && categorySelection.subcategories && categorySelection.subcategories.length > 0) {
        const hasMatchingSubcategory = categorySelection.subcategories.includes(product.subcategory);
        const hasNoSubcategory = !product.subcategory || product.subcategory === '';
        
        // Include if either matches a selected subcategory OR has no subcategory
        if (!hasMatchingSubcategory && !hasNoSubcategory) {
          shouldInclude = false;
        }
      }
      
      // Check types - INCLUSIVE: match selected types OR have no type
      if (shouldInclude && categorySelection.types && categorySelection.types.length > 0) {
        const hasMatchingType = categorySelection.types.includes(product.type);
        const hasNoType = !product.type || product.type === '';
        
        // Include if either matches a selected type OR has no type
        if (!hasMatchingType && !hasNoType) {
          shouldInclude = false;
        }
      }
      
      // Only include if all specified levels matched
      if (shouldInclude) {
        filteredProducts.push(product);
        console.log(`✅ Including "${product.name}" - full path matches:`, {
          trade: product.trade,
          section: product.section,
          category: product.category,
          subcategory: product.subcategory || '(none)',
          type: product.type || '(none)'
        });
      }
    });
    
    console.log(`✅ Filtered to ${filteredProducts.length} products from ${snapshot.size} total`);
    console.log('📋 Sample filtered products:', filteredProducts.slice(0, 3).map(p => ({
      name: p.name,
      trade: p.trade,
      section: p.section,
      category: p.category,
      subcategory: p.subcategory || '(none)',
      type: p.type || '(none)'
    })));
    
    return { success: true, data: filteredProducts };
  } catch (error) {
    console.error('💥 Error getting products by categories:', error);
    return { success: false, error };
  }
};