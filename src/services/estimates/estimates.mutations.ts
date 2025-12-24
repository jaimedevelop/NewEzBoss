// src/services/estimates/estimates.mutations.ts

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  DocumentReference
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { EstimateData, Revision } from './estimates.types';
import { 
  ESTIMATES_COLLECTION, 
  generateEstimateNumber, 
  getCurrentYear
} from './estimates.utils';
import { getEstimate } from './estimates.queries';

const estimatesCollection = collection(db, ESTIMATES_COLLECTION);

// Helper to get current date in YYYY-MM-DD format
const formatDateForDB = (): string => {
  const date = new Date();
  return date.toISOString().split('T')[0];
};

/**
 * Create a new estimate with initial revision tracking
 * @param estimateData - The estimate data
 * @returns The ID of the created estimate
 */
export const createEstimate = async (estimateData: EstimateData): Promise<string> => {
  try {
    const currentYear = getCurrentYear();
    const estimateNumber = await generateEstimateNumber(currentYear);
    
    // Create initial revision for estimate creation
    const initialRevision: Revision = {
      revisionNumber: 1,
      date: new Date().toISOString(), // Full ISO timestamp
      changes: `Estimate created with ${estimateData.lineItems?.length || 0} initial item(s)`,
      modifiedBy: estimateData.createdBy || 'system',
      previousTotal: 0,
      newTotal: estimateData.total || 0,
      changeType: 'created',
      modifiedByName: 'System',
      details: {
        initialItemCount: estimateData.lineItems?.length || 0
      }
    };
    
    const estimate = {
      ...estimateData,
      estimateNumber,
      status: estimateData.status || 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdDate: formatDateForDB(),
      // Initialize tracking fields
      viewCount: 0,
      viewHistory: [],
      currentRevision: 1,
      revisionsHistory: [initialRevision],
      communications: [],
      changeOrders: [],
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
 * @param updates - The data to update
 */
export async function updateEstimate(
  estimateId: string,
  updates: {
    taxRate?: number;
    tax?: number;
    total?: number;
    subtotal?: number;
    discount?: number;
    status?: string;
    communications?: any[];
    [key: string]: any;
  }
): Promise<{ success: boolean; error?: { code: string; message: string } }> {
  try {
    const estimateRef = doc(db, 'estimates', estimateId);
    
    await updateDoc(estimateRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating estimate:', error);
    return {
      success: false,
      error: {
        code: error.code || 'update-failed',
        message: error.message || 'Failed to update estimate'
      }
    };
  }
}

/**
 * Update estimate status
 * @param estimateId - The estimate ID
 * @param status - The new status
 */
export const updateEstimateStatus = async (
  estimateId: string, 
  status: string
): Promise<void> => {
  try {
    const updates: any = { status };
    
    // Add timestamp for status changes
    switch (status) {
      case 'sent':
        updates.sentDate = formatDateForDB();
        break;
      case 'viewed':
        if (!updates.viewedDate) {
          updates.viewedDate = formatDateForDB();
        }
        break;
      case 'accepted':
        updates.acceptedDate = formatDateForDB();
        break;
      case 'rejected':
        updates.rejectedDate = formatDateForDB();
        break;
    }
    
    await updateEstimate(estimateId, updates);
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
    const originalEstimate = await getEstimate(estimateId);
    if (!originalEstimate) {
      throw new Error('Estimate not found');
    }
    
    // Remove ID and timestamps, reset status
    const { 
      id, 
      createdAt, 
      updatedAt, 
      estimateNumber,
      viewCount,
      viewHistory,
      viewedDate,
      sentDate,
      acceptedDate,
      rejectedDate,
      currentRevision,
      revisionsHistory,
      communications,
      changeOrders,
      ...estimateData 
    } = originalEstimate;
    
    // Create new estimate with duplicated data
    const newEstimateId = await createEstimate({
      ...estimateData,
      status: 'draft',
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
    const estimateRef = doc(db, ESTIMATES_COLLECTION, estimateId);
    await deleteDoc(estimateRef);
  } catch (error) {
    console.error('Error deleting estimate:', error);
    throw error;
  }
};

/**
 * Add a communication entry to an estimate
 * @param estimateId - The estimate ID
 * @param content - The communication content
 * @param createdBy - Who created the entry
 */
export const addCommunication = async (
  estimateId: string,
  content: string,
  createdBy: string
): Promise<void> => {
  try {
    const estimate = await getEstimate(estimateId);
    if (!estimate) {
      throw new Error('Estimate not found');
    }
    
    const newCommunication = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      content,
      createdBy
    };
    
    const communications = estimate.communications || [];
    communications.push(newCommunication);
    
    await updateEstimate(estimateId, { communications });
  } catch (error) {
    console.error('Error adding communication:', error);
    throw error;
  }
};

/**
 * Increment view count for an estimate
 * @param estimateId - The estimate ID
 * @param viewLog - Optional view log data
 */
export const incrementViewCount = async (
  estimateId: string,
  viewLog?: {
    ipAddress?: string;
    userAgent?: string;
    duration?: number;
  }
): Promise<void> => {
  try {
    const estimate = await getEstimate(estimateId);
    if (!estimate) {
      throw new Error('Estimate not found');
    }
    
    const newViewLog = {
      timestamp: new Date().toISOString(),
      ...viewLog
    };
    
    const viewHistory = estimate.viewHistory || [];
    viewHistory.push(newViewLog);
    
    const viewCount = (estimate.viewCount || 0) + 1;
    const viewedDate = estimate.viewedDate || formatDateForDB();
    
    await updateEstimate(estimateId, {
      viewCount,
      viewedDate,
      viewHistory,
      status: estimate.status === 'sent' ? 'viewed' : estimate.status
    });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    throw error;
  }
};