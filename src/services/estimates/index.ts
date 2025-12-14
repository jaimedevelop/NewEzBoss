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
  // ✅ ADDED: New types for line items functionality
  LineItemUpdate,
  LineItemValidation,
  RevisionChangeType,
  RevisionDetails,
  EstimateCalculations
} from './estimates.types';

// ============================================================================
// UTILITIES (EXISTING + ADDED)
// ============================================================================

export {
  // Existing Firebase utilities
  ESTIMATES_COLLECTION,
  generateEstimateNumber,
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
  getRevisionColor
} from './estimates.utils';

// ============================================================================
// QUERIES (EXISTING - READ operations)
// ============================================================================

export {
  getAllEstimates,
  getEstimate,
  getEstimateById,  // Alias for backward compatibility
  getEstimatesByStatus,
  getEstimatesByProject,
  getEstimatesByDateRange,
  searchEstimatesByCustomer
} from './estimates.queries';

// ============================================================================
// MUTATIONS (EXISTING - WRITE operations)
// ============================================================================

export {
  createEstimate,
  updateEstimate,
  updateEstimateStatus,
  duplicateEstimate,
  deleteEstimate,
  addCommunication,
  incrementViewCount
} from './estimates.mutations';

// ============================================================================
// ✅ ADDED: LINE ITEM OPERATIONS (NEW)
// ============================================================================

export {
  addLineItem,
  updateLineItem,
  deleteLineItem,
  reorderLineItems
} from './estimates.lineItems';