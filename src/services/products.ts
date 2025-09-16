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

// Product interface matching your ProductModal with section support
export interface InventoryProduct {
  id?: string;
  name: string;
  sku: string;
  section: string;
  category: string;
  subcategory: string;
  subsubcategory?: string;
  type: 'Material' | 'Tool' | 'Equipment' | 'Rental' | 'Consumable' | 'Safety';
  description: string;
  unitPrice: number;
  unit: string;
  onHand: number;
  assigned: number;
  available: number;
  minStock: number;
  maxStock: number;
  supplier: string;
  location: string;
  lastUpdated: string;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

// Filter interface for product queries with hierarchical support
export interface ProductFilters {
  section?: string;
  category?: string;
  subcategory?: string;
  type?: string;
  supplier?: string;
  location?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  inStock?: boolean;
  searchTerm?: string;
  sortBy?: 'name' | 'sku' | 'section' | 'category' | 'unitPrice' | 'onHand' | 'lastUpdated' | 'value';
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

// Unique values interface for filter dropdowns
export interface ProductFilterOptions {
  sections: string[];
  categories: string[];
  subcategories: string[];
  types: string[];
  suppliers: string[];
  locations: string[];
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
 * Get products with hierarchical filtering, sorting, and pagination
 */
export const getProducts = async (
  filters: ProductFilters = {},
  pageSize: number = 50,
  lastDocument?: DocumentSnapshot
): Promise<DatabaseResult<ProductsResponse>> => {
  try {
    let q = collection(db, COLLECTION_NAME);

    // Apply hierarchical filters
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
        product.sku.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower) ||
        product.supplier.toLowerCase().includes(searchLower) ||
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
 * Get unique filter options for dropdown menus (hierarchical)
 */
export const getProductFilterOptions = async (userId?: string): Promise<DatabaseResult<ProductFilterOptions>> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('section', 'asc'));
    const querySnapshot: QuerySnapshot = await getDocs(q);

    const sections = new Set<string>();
    const categories = new Set<string>();
    const subcategories = new Set<string>();
    const types = new Set<string>();
    const suppliers = new Set<string>();
    const locations = new Set<string>();

    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.section) sections.add(data.section);
      if (data.category) categories.add(data.category);
      if (data.subcategory) subcategories.add(data.subcategory);
      if (data.type) types.add(data.type);
      if (data.supplier) suppliers.add(data.supplier);
      if (data.location) locations.add(data.location);
    });

    return {
      success: true,
      data: {
        sections: Array.from(sections).sort(),
        categories: Array.from(categories).sort(),
        subcategories: Array.from(subcategories).sort(),
        types: Array.from(types).sort(),
        suppliers: Array.from(suppliers).sort(),
        locations: Array.from(locations).sort()
      }
    };
  } catch (error) {
    console.error('Error getting product filter options:', error);
    return { success: false, error };
  }
};

/**
 * Get all unique product categories
 */
export const getProductCategories = async (): Promise<DatabaseResult<string[]>> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('category', 'asc'));
    const querySnapshot: QuerySnapshot = await getDocs(q);

    const categories = new Set<string>();
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.category) {
        categories.add(data.category);
      }
    });

    return { success: true, data: Array.from(categories).sort() };
  } catch (error) {
    console.error('Error getting product categories:', error);
    return { success: false, error };
  }
};

/**
 * Get all unique product suppliers
 */
export const getProductSuppliers = async (): Promise<DatabaseResult<string[]>> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('supplier', 'asc'));
    const querySnapshot: QuerySnapshot = await getDocs(q);

    const suppliers = new Set<string>();
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.supplier) {
        suppliers.add(data.supplier);
      }
    });

    return { success: true, data: Array.from(suppliers).sort() };
  } catch (error) {
    console.error('Error getting product suppliers:', error);
    return { success: false, error };
  }
};

/**
 * Get all unique product locations
 */
export const getProductLocations = async (): Promise<DatabaseResult<string[]>> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('location', 'asc'));
    const querySnapshot: QuerySnapshot = await getDocs(q);

    const locations = new Set<string>();
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.location) {
        locations.add(data.location);
      }
    });

    return { success: true, data: Array.from(locations).sort() };
  } catch (error) {
    console.error('Error getting product locations:', error);
    return { success: false, error };
  }
};

/**
 * Get all unique product types
 */
export const getProductTypes = async (): Promise<DatabaseResult<string[]>> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('type', 'asc'));
    const querySnapshot: QuerySnapshot = await getDocs(q);

    const types = new Set<string>();
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.type) {
        types.add(data.type);
      }
    });

    return { success: true, data: Array.from(types).sort() };
  } catch (error) {
    console.error('Error getting product types:', error);
    return { success: false, error };
  }
};

/**
 * Get all unique product sections
 */
export const getProductSections = async (): Promise<DatabaseResult<string[]>> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('section', 'asc'));
    const querySnapshot: QuerySnapshot = await getDocs(q);

    const sections = new Set<string>();
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.section) {
        sections.add(data.section);
      }
    });

    return { success: true, data: Array.from(sections).sort() };
  } catch (error) {
    console.error('Error getting product sections:', error);
    return { success: false, error };
  }
};

/**
 * Get categories for a specific section
 */
export const getCategoriesForSection = async (section: string): Promise<DatabaseResult<string[]>> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('section', '==', section),
      orderBy('category', 'asc')
    );
    const querySnapshot: QuerySnapshot = await getDocs(q);

    const categories = new Set<string>();
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.category) {
        categories.add(data.category);
      }
    });

    return { success: true, data: Array.from(categories).sort() };
  } catch (error) {
    console.error('Error getting categories for section:', error);
    return { success: false, error };
  }
};

/**
 * Get subcategories for a specific section and category
 */
export const getSubcategoriesForCategory = async (section: string, category: string): Promise<DatabaseResult<string[]>> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('section', '==', section),
      where('category', '==', category),
      orderBy('subcategory', 'asc')
    );
    const querySnapshot: QuerySnapshot = await getDocs(q);

    const subcategories = new Set<string>();
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.subcategory) {
        subcategories.add(data.subcategory);
      }
    });

    return { success: true, data: Array.from(subcategories).sort() };
  } catch (error) {
    console.error('Error getting subcategories for category:', error);
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
        sku: product.sku,
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
          product.sku.toLowerCase().includes(searchLower) ||
          product.description.toLowerCase().includes(searchLower)
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
 * Check if SKU is unique
 */
export const isSkuUnique = async (sku: string, excludeId?: string): Promise<DatabaseResult<boolean>> => {
  try {
    const q = query(collection(db, COLLECTION_NAME), where('sku', '==', sku));
    const querySnapshot: QuerySnapshot = await getDocs(q);

    let isUnique = querySnapshot.empty;

    // If we're updating an existing product, exclude it from the check
    if (!isUnique && excludeId) {
      isUnique = querySnapshot.docs.every(doc => doc.id === excludeId);
    }

    return { success: true, data: isUnique };
  } catch (error) {
    console.error('Error checking SKU uniqueness:', error);
    return { success: false, error };
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
      bySection: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byType: {} as Record<string, number>,
    };

    // Count by section, category, and type
    products.forEach(product => {
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