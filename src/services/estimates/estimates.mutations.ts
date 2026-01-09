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
      modifiedByName: 'System'
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
 * Create a new change order linked to a parent estimate
 * @param parentEstimateId - ID of the parent estimate
 * @param changeOrderData - The change order data (similar to EstimateData)
 * @returns The ID of the created change order
 */
export const createChangeOrder = async (
  parentEstimateId: string,
  changeOrderData: Omit<EstimateData, 'estimateState' | 'parentEstimateId'>
): Promise<string> => {
  try {
    // 1. Verify parent estimate exists
    const parentEstimate = await getEstimate(parentEstimateId);
    if (!parentEstimate) {
      throw new Error('Parent estimate not found');
    }

    // 2. Verify parent is accepted (optional - you can remove this check if needed)
    // if (parentEstimate.clientState !== 'accepted') {
    //   throw new Error('Parent estimate must be accepted before creating change orders');
    // }

    // 3. Generate change order number (CHO-YEAR-PARENT#-SEQ format)
    const { generateChangeOrderNumber } = await import('./estimates.utils');
    const changeOrderNumber = await generateChangeOrderNumber(parentEstimate.estimateNumber);

    // 4. Create initial revision for change order creation
    const initialRevision: Revision = {
      revisionNumber: 1,
      date: new Date().toISOString(),
      changes: `Change order created with ${changeOrderData.lineItems?.length || 0} initial item(s)`,
      modifiedBy: changeOrderData.createdBy || 'system',
      previousTotal: 0,
      newTotal: changeOrderData.total || 0,
      changeType: 'created',
      modifiedByName: 'System'
    };

    // 5. Create change order document
    const changeOrder = {
      ...changeOrderData,
      estimateNumber: changeOrderNumber,
      estimateState: 'change-order' as const,
      parentEstimateId: parentEstimateId,
      status: changeOrderData.status || 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdDate: formatDateForDB(),
      // Initialize tracking fields
      viewCount: 0,
      viewHistory: [],
      currentRevision: 1,
      revisionsHistory: [initialRevision],
      communications: [],
      changeOrders: [], // Change orders can't have their own change orders
    };

    const docRef: DocumentReference = await addDoc(estimatesCollection, changeOrder);
    const changeOrderId = docRef.id;

    // 6. Update parent's changeOrders array
    const parentChangeOrders = parentEstimate.changeOrders || [];
    await updateEstimate(parentEstimateId, {
      changeOrders: [...parentChangeOrders, changeOrderId]
    });

    return changeOrderId;
  } catch (error) {
    console.error('Error creating change order:', error);
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
      status: estimate.status === 'sent' ? 'viewed' : estimate.status,
      // Update clientState to 'viewed' if currently 'sent'
      clientState: estimate.clientState === 'sent' ? 'viewed' : estimate.clientState
    });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    throw error;
  }
};

/**
 * Generate secure token and prepare estimate for sending
 * @param estimateId - The estimate ID
 * @param contractorEmail - Contractor's email for notifications
 * @returns Token and success status
 */
export const prepareEstimateForSending = async (
  estimateId: string,
  contractorEmail?: string
): Promise<{ success: boolean; token?: string; error?: string }> => {
  try {
    const token = crypto.randomUUID();
    const viewUrl = `${import.meta.env.VITE_APP_URL}/client/estimate/${token}`;

    const updates: any = {
      emailToken: token,
      clientViewUrl: viewUrl,
      status: 'sent',
      sentDate: new Date().toISOString(),
      emailSentCount: 1,
      lastEmailSent: new Date().toISOString()
    };

    // Store contractor email if provided
    if (contractorEmail) {
      updates.contractorEmail = contractorEmail;
    }

    await updateEstimate(estimateId, updates);

    return { success: true, token };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

/**
 * Add client comment to estimate
 * @param estimateId - The estimate ID
 * @param comment - Comment data
 */
export const addClientComment = async (
  estimateId: string,
  comment: {
    text: string;
    authorName: string;
    authorEmail: string;
    isContractor: boolean;
  }
): Promise<void> => {
  const estimate = await getEstimate(estimateId);
  if (!estimate) throw new Error('Estimate not found');

  const newComment = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    ...comment
  };

  const clientComments = estimate.clientComments || [];
  clientComments.push(newComment);

  await updateEstimate(estimateId, { clientComments });

  // Notify contractor if comment is from client (non-blocking)
  if (!comment.isContractor) {
    try {
      // Use stored contractor email from estimate
      if (estimate.contractorEmail) {
        const { sendContractorNotification } = await import('../email');
        await sendContractorNotification(
          estimate.contractorEmail,
          'commented',
          estimate,
          comment.text
        );
      }
    } catch (error) {
      // Don't block comment submission if notification fails
      console.error('Failed to send contractor notification:', error);
    }
  }
};

/**
 * Handle client approval/rejection/on-hold
 * @param estimateId - The estimate ID
 * @param response - 'approved', 'rejected', or 'on-hold'
 * @param clientName - Client name
 * @param clientEmail - Client email
 * @param reason - Optional reason for rejection or putting on hold
 */
export const handleClientResponse = async (
  estimateId: string,
  response: 'approved' | 'rejected' | 'on-hold',
  clientName: string,
  clientEmail: string,
  reason?: string
): Promise<void> => {
  const updates: any = {
    clientApprovalStatus: response === 'on-hold' ? 'pending' : response,
    clientApprovalDate: new Date().toISOString(),
    clientApprovalBy: `${clientName} (${clientEmail})`,
  };

  // Set appropriate status and clientState based on response
  if (response === 'approved') {
    updates.status = 'accepted';
    updates.clientState = 'accepted';
    updates.acceptedDate = new Date().toISOString();
  } else if (response === 'rejected') {
    updates.status = 'rejected';
    updates.clientState = 'denied';
    updates.deniedDate = new Date().toISOString();
    if (reason) {
      updates.rejectionReason = reason;
      updates.denialReason = reason; // Also set new field
    }
  } else if (response === 'on-hold') {
    updates.clientState = 'on-hold';
    updates.onHoldDate = new Date().toISOString();
    if (reason) {
      updates.onHoldReason = reason;
    }
  }

  await updateEstimate(estimateId, updates);

  // Get estimate for P.O. generation and notifications
  const estimate = await getEstimate(estimateId);
  
  // Generate purchase order if estimate is accepted
  if (response === 'approved' && estimate) {
    try {
      const { generatePOFromEstimate } = await import('../purchasing/purchasing.inventory');
      const { createPurchaseOrder } = await import('../purchasing/purchasing.mutations');
      
      const poResult = await generatePOFromEstimate(estimate);
      
      if (poResult.success && poResult.data) {
        // P.O. data was generated, create it
        const createResult = await createPurchaseOrder(poResult.data);
        
        if (createResult.success && createResult.data) {
          // Update estimate with P.O. ID
          const purchaseOrderIds = estimate.purchaseOrderIds || [];
          await updateEstimate(estimateId, {
            purchaseOrderIds: [...purchaseOrderIds, createResult.data],
          });
          
          console.log(`✅ Purchase order created for estimate ${estimate.estimateNumber}`);
        } else {
          console.error('⚠️ Failed to create purchase order:', createResult.error);
        }
      } else if (poResult.success && !poResult.data) {
        console.log('ℹ️ No purchase order needed - all items in stock');
      } else {
        console.error('⚠️ Failed to generate purchase order:', poResult.error);
      }
    } catch (error) {
      // Don't block estimate acceptance if P.O. generation fails
      console.error('❌ Error generating purchase order:', error);
    }
  }

  // Notify contractor (non-blocking)
  if (estimate) {
    try {
      // Use stored contractor email from estimate
      if (estimate.contractorEmail) {
        const { sendContractorNotification } = await import('../email');
        await sendContractorNotification(
          estimate.contractorEmail,
          response,
          estimate,
          reason
        );
      }
    } catch (error) {
      // Don't block approval/rejection/on-hold if notification fails
      console.error('Failed to send contractor notification:', error);
    }
  }
};

/**
 * Track email open via tracking pixel
 * @param token - The email token
 */
export const trackEmailOpen = async (token: string): Promise<void> => {
  const { getEstimateByToken } = await import('./estimates.queries');
  const estimate = await getEstimateByToken(token);
  if (!estimate || !estimate.id) return;

  const now = new Date().toISOString();

  await updateEstimate(estimate.id, {
    viewedDate: estimate.viewedDate || now,
    viewCount: (estimate.viewCount || 0) + 1,
    status: estimate.status === 'sent' ? 'viewed' : estimate.status,
    // Update clientState to 'viewed' if currently 'sent'
    clientState: estimate.clientState === 'sent' ? 'viewed' : estimate.clientState
  });

  // Send notification to contractor on FIRST open (non-blocking)
  if (!estimate.viewedDate) {
    try {
      // Use stored contractor email from estimate
      if (estimate.contractorEmail) {
        const { sendContractorNotification } = await import('../email');
        await sendContractorNotification(
          estimate.contractorEmail,
          'opened',
          estimate
        );
      }
    } catch (error) {
      // Don't block the client portal if notification fails
      console.error('Failed to send contractor notification:', error);
    }
  }
};

