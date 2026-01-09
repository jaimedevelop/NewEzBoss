// src/services/purchasing/purchasing.queries.ts

import { 
  collection, 
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { DatabaseResult } from '../../firebase/database';
import type { 
  PurchaseOrderWithId,
  PurchaseOrderFilters,
  PurchaseOrderStats
} from './purchasing.types';

const COLLECTION_NAME = 'purchaseOrders';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all purchase orders with optional filtering
 */
export const getAllPurchaseOrders = async (
  filters?: PurchaseOrderFilters
): Promise<DatabaseResult<PurchaseOrderWithId[]>> => {
  try {
    const constraints: QueryConstraint[] = [];

    // Apply filters
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        constraints.push(where('status', 'in', filters.status));
      } else {
        constraints.push(where('status', '==', filters.status));
      }
    }

    if (filters?.estimateId) {
      constraints.push(where('estimateId', '==', filters.estimateId));
    }

    if (filters?.supplier) {
      constraints.push(where('supplier', '==', filters.supplier));
    }

    if (filters?.dateFrom) {
      constraints.push(where('orderDate', '>=', filters.dateFrom));
    }

    if (filters?.dateTo) {
      constraints.push(where('orderDate', '<=', filters.dateTo));
    }

    // Default sorting
    const sortField = filters?.sortBy || 'orderDate';
    const sortDirection = filters?.sortOrder || 'desc';
    constraints.push(orderBy(sortField, sortDirection));

    const q = query(collection(db, COLLECTION_NAME), ...constraints);
    const snapshot = await getDocs(q);

    const purchaseOrders: PurchaseOrderWithId[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as PurchaseOrderWithId));

    // Apply search term filter (client-side since Firestore doesn't support full-text search)
    let filteredPOs = purchaseOrders;
    if (filters?.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filteredPOs = purchaseOrders.filter(po => 
        po.poNumber.toLowerCase().includes(searchLower) ||
        po.estimateNumber.toLowerCase().includes(searchLower) ||
        po.supplier?.toLowerCase().includes(searchLower)
      );
    }

    console.log(`✅ Retrieved ${filteredPOs.length} purchase orders`);
    return { success: true, data: filteredPOs };
  } catch (error) {
    console.error('❌ Error getting purchase orders:', error);
    return { success: false, error };
  }
};

/**
 * Get single purchase order by ID
 */
export const getPurchaseOrderById = async (
  poId: string
): Promise<DatabaseResult<PurchaseOrderWithId>> => {
  try {
    const poRef = doc(db, COLLECTION_NAME, poId);
    const poSnap = await getDoc(poRef);

    if (!poSnap.exists()) {
      return { success: false, error: 'Purchase order not found' };
    }

    const purchaseOrder: PurchaseOrderWithId = {
      id: poSnap.id,
      ...poSnap.data(),
    } as PurchaseOrderWithId;

    return { success: true, data: purchaseOrder };
  } catch (error) {
    console.error('❌ Error getting purchase order:', error);
    return { success: false, error };
  }
};

/**
 * Get all purchase orders for a specific estimate
 */
export const getPurchaseOrdersByEstimate = async (
  estimateId: string
): Promise<DatabaseResult<PurchaseOrderWithId[]>> => {
  return getAllPurchaseOrders({ estimateId });
};

/**
 * Get all purchase orders containing a specific product
 */
export const getPurchaseOrdersByProduct = async (
  productId: string
): Promise<DatabaseResult<PurchaseOrderWithId[]>> => {
  try {
    const allPOsResult = await getAllPurchaseOrders();
    
    if (!allPOsResult.success || !allPOsResult.data) {
      return allPOsResult;
    }

    // Filter POs that contain the product
    const filteredPOs = allPOsResult.data.filter(po =>
      po.items.some(item => item.productId === productId)
    );

    console.log(`✅ Found ${filteredPOs.length} purchase orders for product ${productId}`);
    return { success: true, data: filteredPOs };
  } catch (error) {
    console.error('❌ Error getting purchase orders by product:', error);
    return { success: false, error };
  }
};

/**
 * Get pending purchase orders (pending or ordered status)
 */
export const getPendingPurchaseOrders = async (): Promise<DatabaseResult<PurchaseOrderWithId[]>> => {
  return getAllPurchaseOrders({ 
    status: ['pending', 'ordered'],
    sortBy: 'orderDate',
    sortOrder: 'desc'
  });
};

/**
 * Get recent purchase orders
 */
export const getRecentPurchaseOrders = async (
  limitCount: number = 10
): Promise<DatabaseResult<PurchaseOrderWithId[]>> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('orderDate', 'desc'),
      firestoreLimit(limitCount)
    );

    const snapshot = await getDocs(q);

    const purchaseOrders: PurchaseOrderWithId[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as PurchaseOrderWithId));

    return { success: true, data: purchaseOrders };
  } catch (error) {
    console.error('❌ Error getting recent purchase orders:', error);
    return { success: false, error };
  }
};

/**
 * Get purchase order statistics
 */
export const getPurchaseOrderStats = async (): Promise<DatabaseResult<PurchaseOrderStats>> => {
  try {
    const allPOsResult = await getAllPurchaseOrders();
    
    if (!allPOsResult.success || !allPOsResult.data) {
      return { success: false, error: 'Failed to get purchase orders' };
    }

    const pos = allPOsResult.data;

    const stats: PurchaseOrderStats = {
      totalPOs: pos.length,
      pendingCount: pos.filter(po => po.status === 'pending').length,
      orderedCount: pos.filter(po => po.status === 'ordered').length,
      receivedCount: pos.filter(po => po.status === 'received').length,
      totalValue: pos.reduce((sum, po) => sum + po.total, 0),
      pendingValue: pos
        .filter(po => po.status === 'pending' || po.status === 'ordered')
        .reduce((sum, po) => sum + po.total, 0),
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('❌ Error getting purchase order stats:', error);
    return { success: false, error };
  }
};

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to purchase orders with real-time updates
 */
export const subscribeToPurchaseOrders = (
  callback: (purchaseOrders: PurchaseOrderWithId[]) => void,
  filters?: PurchaseOrderFilters
): (() => void) => {
  try {
    const constraints: QueryConstraint[] = [];

    // Apply filters (same as getAllPurchaseOrders)
    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        constraints.push(where('status', 'in', filters.status));
      } else {
        constraints.push(where('status', '==', filters.status));
      }
    }

    if (filters?.estimateId) {
      constraints.push(where('estimateId', '==', filters.estimateId));
    }

    const sortField = filters?.sortBy || 'orderDate';
    const sortDirection = filters?.sortOrder || 'desc';
    constraints.push(orderBy(sortField, sortDirection));

    const q = query(collection(db, COLLECTION_NAME), ...constraints);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const purchaseOrders: PurchaseOrderWithId[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as PurchaseOrderWithId));

      // Apply search term filter
      let filteredPOs = purchaseOrders;
      if (filters?.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredPOs = purchaseOrders.filter(po => 
          po.poNumber.toLowerCase().includes(searchLower) ||
          po.estimateNumber.toLowerCase().includes(searchLower) ||
          po.supplier?.toLowerCase().includes(searchLower)
        );
      }

      callback(filteredPOs);
    });

    return unsubscribe;
  } catch (error) {
    console.error('❌ Error subscribing to purchase orders:', error);
    return () => {};
  }
};
