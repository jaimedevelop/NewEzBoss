// src/services/estimates.ts
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  DocumentReference,
  QuerySnapshot,
  DocumentSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Estimate, LineItem, Picture } from '../firebase/database';

// Collection reference
const estimatesCollection = collection(db, 'estimates');

// Types
export interface EstimateData extends Omit<Estimate, 'id' | 'createdAt' | 'updatedAt' | 'estimateNumber'> {
  status?: 'draft' | 'sent' | 'approved' | 'rejected';
}

export interface EstimateWithId extends Estimate {
  id: string;
}

/**
 * Generate the next estimate number for the given year
 * @param year - The year for which to generate the estimate number
 * @returns The next estimate number (e.g., "EST-2025-001")
 */
export const generateEstimateNumber = async (year: number): Promise<string> => {
  try {
    // Query for estimates from the current year
    const yearStart = `EST-${year}-`;
    const yearEnd = `EST-${year}-ZZZ`;
    
    const q = query(
      estimatesCollection,
      where('estimateNumber', '>=', yearStart),
      where('estimateNumber', '<', yearEnd),
      orderBy('estimateNumber', 'desc'),
      limit(1)
    );
    
    const snapshot: QuerySnapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // First estimate of the year
      return `EST-${year}-001`;
    }
    
    // Get the last estimate number and increment
    const lastEstimate = snapshot.docs[0].data();
    const lastNumber = parseInt(lastEstimate.estimateNumber.split('-')[2]);
    const nextNumber = (lastNumber + 1).toString().padStart(3, '0');
    
    return `EST-${year}-${nextNumber}`;
  } catch (error) {
    console.error('Error generating estimate number:', error);
    throw error;
  }
};

/**
 * Create a new estimate
 * @param estimateData - The estimate data
 * @returns The ID of the created estimate
 */
export const createEstimate = async (estimateData: EstimateData): Promise<string> => {
  try {
    const currentYear = new Date().getFullYear();
    const estimateNumber = await generateEstimateNumber(currentYear);
    
    const estimate = {
      ...estimateData,
      estimateNumber,
      status: estimateData.status || 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    };
    
    const docRef: DocumentReference = await addDoc(estimatesCollection, estimate);
    return docRef.id;
  } catch (error) {
    console.error('Error creating estimate:', error);
    throw error;
  }
};

/**
 * Update an existing estimate
 * @param estimateId - The ID of the estimate to update
 * @param updateData - The data to update
 */
export const updateEstimate = async (estimateId: string, updateData: Partial<EstimateData>): Promise<void> => {
  try {
    const estimateRef = doc(db, 'estimates', estimateId);
    await updateDoc(estimateRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating estimate:', error);
    throw error;
  }
};

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
 * Get a single estimate by ID
 * @param estimateId - The estimate ID
 * @returns The estimate data or null if not found
 */
export const getEstimateById = async (estimateId: string): Promise<EstimateWithId | null> => {
  try {
    const estimateRef = doc(db, 'estimates', estimateId);
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
 * Update estimate status
 * @param estimateId - The estimate ID
 * @param status - The new status
 */
export const updateEstimateStatus = async (estimateId: string, status: string): Promise<void> => {
  try {
    await updateEstimate(estimateId, { status });
  } catch (error) {
    console.error('Error updating estimate status:', error);
    throw error;
  }
};

/**
 * Duplicate an estimate
 * @param estimateId - The ID of the estimate to duplicate
 * @returns The ID of the new estimate
 */
export const duplicateEstimate = async (estimateId: string): Promise<string> => {
  try {
    const originalEstimate = await getEstimateById(estimateId);
    if (!originalEstimate) {
      throw new Error('Estimate not found');
    }
    
    // Remove ID and timestamps, reset status
    const { id, createdAt, updatedAt, estimateNumber, ...estimateData } = originalEstimate;
    
    // Create new estimate with duplicated data
    const newEstimateId = await createEstimate({
      ...estimateData,
      status: 'draft',
      // Clear some fields that should be unique
      customerName: estimateData.customerName + ' (Copy)',
    });
    
    return newEstimateId;
  } catch (error) {
    console.error('Error duplicating estimate:', error);
    throw error;
  }
};

/**
 * Delete an estimate
 * @param estimateId - The ID of the estimate to delete
 */
export const deleteEstimate = async (estimateId: string): Promise<void> => {
  try {
    const estimateRef = doc(db, 'estimates', estimateId);
    await deleteDoc(estimateRef);
  } catch (error) {
    console.error('Error deleting estimate:', error);
    throw error;
  }
};

/**
 * Get estimates created within a date range
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of estimates within the date range
 */
export const getEstimatesByDateRange = async (startDate: string, endDate: string): Promise<EstimateWithId[]> => {
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