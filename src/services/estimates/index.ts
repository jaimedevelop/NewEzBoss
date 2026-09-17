// src/services/estimates/index.ts
// Barrel export for estimates service module

// ============================================================================
// TYPES (EXISTING + ADDED)
// ============================================================================

export type {
  Estimate,
  EstimateData,
  EstimateWithId,
  EstimateResponse,
  LineItem,
  ViewLog,
  Revision,
  Communication,
  ClientComment,
  // ✅ ADDED: New types for line items functionality
  LineItemUpdate,
  LineItemValidation,
  RevisionChangeType,
  RevisionDetails,
  EstimateCalculations,
  Picture,
  EstimateDocument,
  PaymentRecord,
  PaymentStatus
} from './estimates.types';

// ============================================================================
// UTILITIES (EXISTING + ADDED)
// ============================================================================

export {
  // Existing Firebase utilities
  ESTIMATES_COLLECTION,
  generateChangeOrderNumber,
  getCurrentYear,
  formatDateForDB,
  calculateEstimateTotals,

  // ✅ ADDED: Line item utilities
  calculateLineItemTotal,
  validateLineItem,
  validateLineItemUpdate,

  // ✅ ADDED: Formatting utilities
  formatCurrency,
  formatDate,

  // ✅ ADDED: Revision helpers
  getRevisionIcon,
  getRevisionColor,

  // ✅ ADDED: Data sanitization
  removeUndefined
} from './estimates.utils';

// ============================================================================
// QUERIES (EXISTING - READ operations)
// ============================================================================

export {
  getAllEstimates,
  getNextEstimateNumber,
  getEstimate,
  getEstimateById,  // Alias for backward compatibility
  getEstimatesByStatus,
  getEstimatesByProject,
  getEstimatesByDateRange,
  searchEstimatesByCustomer,
  getChangeOrdersByParent,
  getParentEstimate,
  getEstimateByToken
} from './estimates.queries';

// ============================================================================
// MUTATIONS (EXISTING - WRITE operations)
// ============================================================================

export {
  createEstimate,
  createEstimateRow,
  createChangeOrder,
  updateEstimate,
  updateEstimateStatus,
  duplicateEstimate,
  deleteEstimate,
  addCommunication,
  addClientComment,
  addPayment,
  deletePayment,
  reviewPayment,
  incrementViewCount,
  trackEmailOpen,
  sendEstimateForDelivery,
  addClientCommentByToken,
  updateEstimateStatusByToken
} from './estimates.mutations';

// ============================================================================
// ✅ ADDED: LINE ITEM OPERATIONS (NEW)
// ============================================================================

export {
  addLineItem,
  bulkAppendLineItems,
  updateLineItem,
  deleteLineItem,
  reorderLineItems
} from './estimates.lineItems';

// Inventory helper functions
export {
  convertInventoryItemToLineItem,
  convertCollectionToLineItems,
  checkForDuplicates,
  findDuplicateLineItems
} from './estimates.inventory';

// Client view functions
export {
  updateClientViewSettings,
  updateLineItemsGroups
} from './estimates.clientView';

// Payment proof-image upload (contractor)
export {
  uploadPaymentProofImage
} from './estimates.files';
