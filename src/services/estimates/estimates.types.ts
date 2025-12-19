// src/services/estimates/estimates.types.ts

import { Timestamp } from 'firebase/firestore';

// ============================================================================
// LINE ITEMS
// ============================================================================

/**
 * Line item for estimate/invoice
 */
export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  
  // ✅ ADDED: Optional fields for enhanced functionality
  notes?: string;
  productId?: string;  // Link to inventory
  laborId?: string;    // Link to labor items
  type?: 'product' | 'labor' | 'custom';

  isDuplicate?: boolean;  // Will be set dynamically for display
  itemId?: string;   
}

/**
 * ✅ ADDED: Data for updating a line item
 */
export interface LineItemUpdate {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  notes?: string;
}

/**
 * ✅ ADDED: Validation result for line items
 */
export interface LineItemValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

// ============================================================================
// REVISIONS
// ============================================================================

/**
 * View log entry for tracking customer engagement
 */
export interface ViewLog {
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  duration?: number; // Seconds spent viewing
}

/**
 * Revision entry for version control
 */
export interface Revision {
  revisionNumber: number;
  date: string;
  changes: string;
  modifiedBy: string;
  previousTotal: number;
  newTotal: number;
  
  // ✅ ADDED: Enhanced tracking fields
  changeType?: RevisionChangeType;  // For filtering/icons
  modifiedByName?: string;          // Cached name for display
  details?: RevisionDetails;        // Structured change data
}

/**
 * ✅ ADDED: Types of changes that can occur
 */
export type RevisionChangeType = 
  | 'line_item_added'
  | 'line_item_updated'
  | 'line_item_deleted'
  | 'discount_changed'
  | 'tax_changed'
  | 'status_changed'
  | 'customer_changed'
  | 'notes_changed'
  | 'created'
  | 'other';

/**
 * ✅ ADDED: Structured details about a revision
 */
export interface RevisionDetails {
  lineItemId?: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
}

// ============================================================================
// COMMUNICATION
// ============================================================================

/**
 * Communication log entry
 */
export interface Communication {
  id: string;
  date: string;
  content: string;
  createdBy: string;
  
  // ✅ ADDED: Enhanced communication tracking
  type?: 'email' | 'phone' | 'text' | 'in-person' | 'note';
  createdByName?: string;
}

// ============================================================================
// ESTIMATE
// ============================================================================

/**
 * Main Estimate interface
 */
export interface Estimate {
  id?: string;
  estimateNumber: string;
  projectId?: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  
  // Type
  type?: 'quick' | 'detailed';
  
  // Line Items
  lineItems: LineItem[];
  collectionId?: string;
  
  // Calculations
  subtotal: number;
  discount: number;
  discountType?: 'percentage' | 'fixed';
  tax: number;
  taxRate: number;
  total: number;
  
  // Status & Tracking
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  sentDate?: string;
  viewedDate?: string;
  viewCount?: number;
  viewHistory?: ViewLog[];
  acceptedDate?: string;
  rejectedDate?: string;
  rejectionReason?: string;
  
  // Validity
  validUntil?: string;
  
  // Change Tracking
  changeOrders?: string[]; // IDs of change orders
  currentRevision?: number;
  revisionsHistory?: Revision[];
  
  // Communication
  communications?: Communication[];
  
  // Metadata
  createdBy?: string;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
  createdDate?: string; // YYYY-MM-DD format
  notes?: string;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Data for creating a new estimate (without auto-generated fields)
 */
export interface EstimateData extends Omit<Estimate, 'id' | 'createdAt' | 'updatedAt' | 'estimateNumber'> {
  // status is already defined in Estimate, no override needed
}

/**
 * Estimate with guaranteed ID field
 */
export interface EstimateWithId extends Estimate {
  id: string;
}

/**
 * Standard response wrapper for service functions
 */
export interface EstimateResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * ✅ ADDED: Calculated totals structure
 */
export interface EstimateCalculations {
  subtotal: number;
  discountAmount: number;
  tax: number;
  total: number;
}