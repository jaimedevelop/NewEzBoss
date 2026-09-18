// src/services/estimates/estimates.mutations.ts

import { estimatesApiRequest, estimatesPublicApiRequest, ApiError } from './estimatesApi';
import {
  lineItemsToApiPayload,
  groupsToApiPayload,
  type ApiEstimateRow,
} from './estimates.mapper';
import type { Estimate, EstimateData } from './estimates.types';
import { removeUndefined } from './estimates.utils';
import { getEstimate } from './estimates.queries';

// Helper to get current date in YYYY-MM-DD format
const formatDateForDB = (): string => {
  const date = new Date();
  return date.toISOString().split('T')[0];
};

// Fields on EstimateData that map directly onto scalar columns the backend
// accepts on create/update (see UPDATABLE_COLUMNS in routes/estimates.ts).
// lineItems/groups are handled separately since the API expects them as
// nested arrays in the same request body.
const SCALAR_FIELDS = [
  'projectId', 'customerId', 'customerName', 'customerEmail', 'customerPhone',
  'serviceAddress', 'serviceAddress2', 'serviceCity', 'serviceState', 'serviceZipCode',
  'type', 'collectionId', 'subtotal', 'discount', 'discountType', 'tax', 'taxRate',
  'total', 'estimateState', 'clientState', 'parentEstimateId', 'status', 'createdDate', 'validUntil',
  'projectDescription', 'notes', 'accountId',
  'emailToken', 'clientViewUrl', 'contractorEmail', 'sentDate', 'viewedDate', 'lastEmailSent',
  'emailSentCount', 'clientApprovalStatus', 'clientApprovalDate', 'clientApprovalBy',
  'acceptedDate', 'rejectedDate', 'deniedDate', 'denialReason', 'onHoldDate',
  'onHoldReason', 'rejectionReason', 'changeOrderTotal',
] as const;

function buildScalarPayload(data: Record<string, any>): Record<string, any> {
  const payload: Record<string, any> = {};
  for (const field of SCALAR_FIELDS) {
    if (data[field] !== undefined) {
      payload[field] = data[field];
    }
  }
  return payload;
}

/**
 * Create a new estimate with initial revision tracking
 * @param estimateData - The estimate data
 * @returns The ID of the created estimate
 */
export const createEstimate = async (estimateData: EstimateData): Promise<string> => {
  const row = await createEstimateRow(estimateData);
  return String(row.id);
};

/**
 * Same as createEstimate, but returns the full created row (including the
 * server-assigned estimateNumber) so callers can display it without an
 * extra fetch.
 */
export const createEstimateRow = async (estimateData: EstimateData): Promise<ApiEstimateRow> => {
  try {
    // If the caller supplies estimateNumber (e.g. the user edited the
    // previewed number), the backend honors it and errors on a duplicate;
    // otherwise it assigns the next number atomically itself.
    const body = removeUndefined({
      estimateNumber: (estimateData as any).estimateNumber,
      ...buildScalarPayload(estimateData),
      status: estimateData.status || 'draft',
      lineItems: lineItemsToApiPayload(estimateData.lineItems ?? []),
      groups: groupsToApiPayload(estimateData.groups ?? []),
      paymentSchedule: (estimateData as any).paymentSchedule,
    });

    return await estimatesApiRequest<ApiEstimateRow>('/estimates', {
      method: 'POST',
      body: JSON.stringify(body),
    });
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
    const parentEstimate = await getEstimate(parentEstimateId);
    if (!parentEstimate) {
      throw new Error('Parent estimate not found');
    }

    const { generateChangeOrderNumber } = await import('./estimates.utils');
    const changeOrderNumber = await generateChangeOrderNumber(parentEstimateId, parentEstimate.estimateNumber);

    const body = removeUndefined({
      estimateNumber: changeOrderNumber,
      ...buildScalarPayload(changeOrderData),
      status: changeOrderData.status || 'draft',
      lineItems: lineItemsToApiPayload(changeOrderData.lineItems ?? []),
      groups: groupsToApiPayload(changeOrderData.groups ?? []),
      paymentSchedule: (changeOrderData as any).paymentSchedule,
    });

    const row = await estimatesApiRequest<ApiEstimateRow>(
      `/estimates/${parentEstimateId}/change-orders`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );

    return String(row.id);
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
    const body: Record<string, any> = buildScalarPayload(updates);

    if (updates.lineItems !== undefined) {
      body.lineItems = lineItemsToApiPayload(updates.lineItems);
    }
    if (updates.groups !== undefined) {
      body.groups = groupsToApiPayload(updates.groups);
    }
    if (updates.pictures !== undefined) {
      body.pictures = updates.pictures;
    }
    if (updates.documents !== undefined) {
      body.documents = updates.documents;
    }
    // Payment schedules are persisted as a nested relation, rather than an
    // estimate scalar. Keep it out of SCALAR_FIELDS, but include it in PATCH
    // requests so edits made from EstimateTab are not silently discarded.
    if (updates.paymentSchedule !== undefined) {
      body.paymentSchedule = updates.paymentSchedule;
    }

    await estimatesApiRequest<ApiEstimateRow>(`/estimates/${estimateId}`, {
      method: 'PATCH',
      body: JSON.stringify(removeUndefined(body)),
    });


    return { success: true };
  } catch (error: any) {
    console.error('Error updating estimate:', error);
    return {
      success: false,
      error: {
        code: error instanceof ApiError ? 'update-failed' : (error.code || 'update-failed'),
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
    const row = await estimatesApiRequest<ApiEstimateRow>(`/estimates/${estimateId}/duplicate`, {
      method: 'POST',
    });
    return String(row.id);
  } catch (error) {
    console.error('Error duplicating estimate:', error);
    throw error;
  }
};

/**
 * Delete an estimate and all its related records (cascaded delete)
 * @param estimateId - The ID of the estimate to delete
 */
export const deleteEstimate = async (estimateId: string): Promise<void> => {
  try {
    console.log(`🗑️ [Delete Estimate] Starting deletion for estimate ${estimateId}`);

    // Purchase orders tied to this estimate (and its change orders, which the
    // backend cascades on delete) still need explicit cleanup — POs aren't
    // FK'd to estimates in the new schema.
    const { getChangeOrdersByParent } = await import('./estimates.queries');
    const changeOrders = await getChangeOrdersByParent(estimateId);
    const allEstimateIds = [estimateId, ...changeOrders.map(co => co.id)];

    const { getPurchaseOrdersByEstimate } = await import('../purchasing/purchasing.queries');
    const { deletePurchaseOrder } = await import('../purchasing/purchasing.mutations');

    for (const id of allEstimateIds) {
      const poResult = await getPurchaseOrdersByEstimate(id);
      if (poResult.success && poResult.data) {
        for (const po of poResult.data) {
          console.log(`🗑️ [Delete Estimate] Deleting related purchase order ${po.id} for estimate ${id}`);
          await deletePurchaseOrder(po.id);
        }
      }
    }

    // Change orders cascade-delete via parentEstimateId ON DELETE CASCADE
    await estimatesApiRequest<void>(`/estimates/${estimateId}`, { method: 'DELETE' });

    console.log(`✅ [Delete Estimate] Deletion complete for estimate ${estimateId}`);
  } catch (error) {
    console.error('Error deleting estimate:', error);
    throw error;
  }
};

/**
 * Add a payment record to an estimate
 * @param estimateId - The estimate ID
 * @param payment - The payment data
 */
export const addPayment = async (
  estimateId: string,
  payment: Omit<import('./estimates.types').PaymentRecord, 'id' | 'createdAt'>
): Promise<void> => {
  try {
    await estimatesApiRequest(`/estimates/${estimateId}/payments`, {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  } catch (error) {
    console.error('Error adding payment:', error);
    throw error;
  }
};

/**
 * Delete a payment record from an estimate
 * @param estimateId - The estimate ID
 * @param paymentId - The payment ID to delete
 */
export const deletePayment = async (
  estimateId: string,
  paymentId: string
): Promise<void> => {
  try {
    await estimatesApiRequest<void>(`/estimates/${estimateId}/payments/${paymentId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error deleting payment:', error);
    throw error;
  }
};

/**
 * Contractor approves or rejects a pending client-submitted cash claim.
 * Gateway (Stripe/PayPal) payments are rejected by the backend if attempted
 * here — those only resolve via webhook/capture, never manual review.
 */
export const reviewPayment = async (
  estimateId: string,
  paymentId: string,
  decision: 'approve' | 'reject',
  rejectionReason?: string
): Promise<import('./estimates.types').PaymentRecord> => {
  try {
    return await estimatesApiRequest(`/estimates/${estimateId}/payments/${paymentId}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, rejectionReason }),
    });
  } catch (error) {
    console.error('Error reviewing payment:', error);
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
    await estimatesApiRequest(`/estimates/${estimateId}/communications`, {
      method: 'POST',
      body: JSON.stringify({ content, createdBy }),
    });
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
    await estimatesApiRequest(`/estimates/${estimateId}/view-count`, {
      method: 'POST',
      body: JSON.stringify(viewLog ?? {}),
    });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    throw error;
  }
};

/**
 * Send an estimate through the authorized API flow. The client can adjust
 * presentation only; the API loads the owned estimate, recipient, identity,
 * template data, and tracking link itself.
 */
export const sendEstimateForDelivery = async (
  estimateId: string,
  options: { subject?: string; message?: string; cc?: string } = {}
): Promise<{ accepted: true; delivery: 'accepted_by_mailgun'; emailLogId: number }> => {
  return estimatesApiRequest(`/estimates/${encodeURIComponent(estimateId)}/send-email`, {
    method: 'POST',
    body: JSON.stringify(options),
  });
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

  await estimatesApiRequest(`/estimates/${estimateId}/client-comments`, {
    method: 'POST',
    body: JSON.stringify(comment),
  });

};

/**
 * Update client response status (approve/decline/hold) via public email
 * token — see routes/estimates.ts PATCH /public/by-token/:token/status.
 */
export const updateEstimateStatusByToken = async (
  token: string,
  update: {
    clientState: 'accepted' | 'denied' | 'on-hold';
    denialReason?: string;
    onHoldReason?: string;
  }
): Promise<Estimate & { id: string }> => {
  return estimatesPublicApiRequest(`/estimates/public/by-token/${encodeURIComponent(token)}/status`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  });
};

/**
 * Add client comment to estimate via public email token (unauthenticated
 * client view — see routes/estimates.ts POST /public/by-token/:token/comments).
 */
export const addClientCommentByToken = async (
  token: string,
  comment: {
    text: string;
    authorName: string;
    authorEmail: string;
    isContractor: boolean;
  }
): Promise<void> => {
  await estimatesPublicApiRequest(`/estimates/public/by-token/${encodeURIComponent(token)}/comments`, {
    method: 'POST',
    body: JSON.stringify(comment),
  });
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
  const currentEstimate = await getEstimate(estimateId);

  const updates: any = {
    clientApprovalStatus: response === 'on-hold' ? 'pending' : response,
    clientApprovalDate: new Date().toISOString(),
    clientApprovalBy: `${clientName} (${clientEmail})`,
  };

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
      updates.denialReason = reason;
    }
  } else if (response === 'on-hold') {
    updates.clientState = 'on-hold';
    updates.onHoldDate = new Date().toISOString();
    if (reason) {
      updates.onHoldReason = reason;
    }
  }

  if (currentEstimate?.estimateState === 'draft') {
    updates.estimateState = 'estimate';
  }

  await updateEstimate(estimateId, updates);

  const estimate = await getEstimate(estimateId);

  console.log(`\n🎯 [Estimate Response] Client ${response} estimate ${estimateId}`);

  if (response === 'approved' && estimate) {
    console.log('🔄 [Estimate Response] Estimate approved - checking if PO needed');
    await generatePurchaseOrderForEstimate(estimateId);
  } else if (response === 'approved') {
    console.warn('⚠️ [Estimate Response] Estimate approved but estimate object not found');
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

  await estimatesPublicApiRequest(`/estimates/public/by-token/${encodeURIComponent(token)}/track-open`, {
    method: 'POST',
  });

};

/**
 * Generate a purchase order for an estimate if one doesn't already exist
 * @param estimateId - The estimate ID
 */
export const generatePurchaseOrderForEstimate = async (
  estimateId: string
): Promise<{ success: boolean; error?: string; poId?: string }> => {
  try {
    const estimate = await getEstimate(estimateId);
    if (!estimate) {
      return { success: false, error: 'Estimate not found' };
    }

    // Check if PO already exists to prevent duplicates
    const { getPurchaseOrdersByEstimate } = await import('../purchasing/purchasing.queries');
    const existingPOs = await getPurchaseOrdersByEstimate(estimateId);
    if (existingPOs.success && existingPOs.data && existingPOs.data.length > 0) {
      console.log(`ℹ️ [PO Generation] PO already exists for estimate ${estimate.estimateNumber}. Skipping.`);
      return { success: true, poId: existingPOs.data[0].id };
    }

    const { generatePOFromEstimate } = await import('../purchasing/purchasing.inventory');
    const { createPurchaseOrder } = await import('../purchasing/purchasing.mutations');

    console.log(`📦 [PO Generation] Starting for estimate ${estimate.estimateNumber}`);
    const poResult = await generatePOFromEstimate(estimate);

    if (poResult.success && poResult.data) {
      const createResult = await createPurchaseOrder(poResult.data);

      if (createResult.success && createResult.data) {
        console.log(`✅ [PO Generation] Purchase order ${createResult.data} created for estimate ${estimate.estimateNumber}`);
        return { success: true, poId: createResult.data };
      } else {
        return { success: false, error: createResult.error };
      }
    } else if (poResult.success && !poResult.data) {
      return { success: true, error: 'No product line items found in estimate' };
    } else {
      return { success: false, error: poResult.error as string };
    }
  } catch (error: any) {
    console.error('❌ [PO Generation] Error:', error);
    return { success: false, error: error.message };
  }
};
