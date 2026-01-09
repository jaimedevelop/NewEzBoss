// src/services/estimates/estimates.queries.ts

import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { EstimateWithId } from './estimates.types';
import { ESTIMATES_COLLECTION } from './estimates.utils';

const estimatesCollection = collection(db, ESTIMATES_COLLECTION);

/**
 * Get all estimates
 * @returns Array of estimates with IDs
 */
export const getAllEstimates = async (): Promise<EstimateWithId[]> => {
  try {
    const q = query(estimatesCollection, orderBy('createdAt', 'desc'));
    const snapshot: QuerySnapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EstimateWithId[];
  } catch (error) {
    console.error('Error getting estimates:', error);
    throw error;
  }
};

/**
 * Get a single estimate by ID
 * @param estimateId - The estimate ID
 * @returns The estimate data or null if not found
 */
export const getEstimate = async (estimateId: string): Promise<EstimateWithId | null> => {
  try {
    const estimateRef = doc(db, ESTIMATES_COLLECTION, estimateId);
    const snapshot: DocumentSnapshot = await getDoc(estimateRef);

    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data()
      } as EstimateWithId;
    }

    return null;
  } catch (error) {
    console.error('Error getting estimate by ID:', error);
    throw error;
  }
};

/**
 * Alias for getEstimate for backward compatibility
 */
export const getEstimateById = getEstimate;

/**
 * Get estimates by status
 * @param status - The status to filter by
 * @returns Array of estimates with the specified status
 */
export const getEstimatesByStatus = async (status: string): Promise<EstimateWithId[]> => {
  try {
    const q = query(
      estimatesCollection,
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const snapshot: QuerySnapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EstimateWithId[];
  } catch (error) {
    console.error('Error getting estimates by status:', error);
    throw error;
  }
};

/**
 * Get estimates for a specific project
 * @param projectId - The project ID
 * @returns Array of estimates for the project
 */
export const getEstimatesByProject = async (projectId: string): Promise<EstimateWithId[]> => {
  try {
    const q = query(
      estimatesCollection,
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    );
    const snapshot: QuerySnapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EstimateWithId[];
  } catch (error) {
    console.error('Error getting estimates by project:', error);
    throw error;
  }
};

/**
 * Get estimates created within a date range
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of estimates within the date range
 */
export const getEstimatesByDateRange = async (
  startDate: string,
  endDate: string
): Promise<EstimateWithId[]> => {
  try {
    const q = query(
      estimatesCollection,
      where('createdDate', '>=', startDate),
      where('createdDate', '<=', endDate),
      orderBy('createdDate', 'desc')
    );
    const snapshot: QuerySnapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EstimateWithId[];
  } catch (error) {
    console.error('Error getting estimates by date range:', error);
    throw error;
  }
};

/**
 * Search estimates by customer name
 * @param customerName - The customer name to search for
 * @returns Array of estimates matching the customer name
 */
export const searchEstimatesByCustomer = async (customerName: string): Promise<EstimateWithId[]> => {
  try {
    // Note: Firestore doesn't support case-insensitive search well
    // For better search functionality, consider using Algolia or similar
    const q = query(
      estimatesCollection,
      where('customerName', '>=', customerName),
      where('customerName', '<=', customerName + '\uf8ff'),
      orderBy('customerName'),
      orderBy('createdAt', 'desc')
    );
    const snapshot: QuerySnapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EstimateWithId[];
  } catch (error) {
    console.error('Error searching estimates by customer:', error);
    throw error;
  }
};

/**
 * Get estimate by secure token (for client view)
 * @param token - The email token
 * @returns The estimate data or null if not found
 */
export const getEstimateByToken = async (
  token: string
): Promise<EstimateWithId | null> => {
  try {
    const q = query(
      estimatesCollection,
      where('emailToken', '==', token),
      limit(1)
    );

    const snapshot: QuerySnapshot = await getDocs(q);

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as EstimateWithId;
  } catch (error) {
    console.error('Error fetching estimate by token:', error);
    return null;
  }
};

/**
 * Get all change orders for a parent estimate
 * @param parentEstimateId - The parent estimate ID
 * @returns Array of change orders for the parent
 */
export const getChangeOrdersByParent = async (
  parentEstimateId: string
): Promise<EstimateWithId[]> => {
  try {
    const q = query(
      estimatesCollection,
      where('parentEstimateId', '==', parentEstimateId),
      where('estimateState', '==', 'change-order'),
      orderBy('createdAt', 'desc')
    );
    const snapshot: QuerySnapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EstimateWithId[];
  } catch (error) {
    console.error('Error getting change orders by parent:', error);
    throw error;
  }
};

/**
 * Get parent estimate for a change order
 * @param changeOrderId - The change order ID
 * @returns The parent estimate or null if not found
 */
export const getParentEstimate = async (
  changeOrderId: string
): Promise<EstimateWithId | null> => {
  try {
    const changeOrder = await getEstimate(changeOrderId);
    if (!changeOrder || !changeOrder.parentEstimateId) {
      return null;
    }

    return await getEstimate(changeOrder.parentEstimateId);
  } catch (error) {
    console.error('Error getting parent estimate:', error);
    throw error;
  }
};
