// src/services/estimates/estimates.types.ts

import { Timestamp } from 'firebase/firestore';
import { PaymentSchedule } from './PaymentScheduleModal.types';

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
  type?: 'product' | 'labor' | 'tool' | 'equipment' | 'custom' | 'manual';

  isDuplicate?: boolean;  // Will be set dynamically for display
  itemId?: string;
  groupId?: string;    // Link to a group in estimate.groups
  collectionId?: string;   // ID of the collection it was imported from
  collectionName?: string; // Name of the collection it was imported from
}

/**
 * ✅ ADDED: Data for updating a line item
 */
export interface LineItemUpdate {
  description?: string;
  quantity?: number;
  unitPrice?: number;
  notes?: string;
  type?: 'product' | 'labor' | 'tool' | 'equipment' | 'custom' | 'manual';
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

/**
 * Client comment for estimate feedback
 */
export interface ClientComment {
  id: string;
  date: string;
  text: string;
  authorName: string;
  authorEmail: string;
  isContractor: boolean;        // Distinguish contractor vs client comments
}

/**
 * Change order item for tracking additions during job
 */
export interface ChangeOrderItem {
  id: string;
  dateAdded: string;
  description: string;
  lineItems: LineItem[];
  subtotal: number;
  approved: boolean;
  approvedDate?: string;
  notes?: string;
}

/**
 * Email log entry for tracking email engagement
 */
export interface EmailLog {
  id: string;
  sentDate: string;
  sentTo: string;
  emailType: 'initial_send' | 'reminder' | 'status_update';
  opened: boolean;
  openedDate?: string;
  clickedLink: boolean;
  clickedDate?: string;
}

// ============================================================================
// CLIENT VIEW & GROUPING
// ============================================================================

/**
 * Custom group for organizing line items
 */
export interface EstimateGroup {
  id: string;
  name: string;
  description?: string;
  showPrice: boolean;
}

/**
 * Settings for how the client sees the estimate
 */
export interface ClientViewSettings {
  displayMode: 'list' | 'byType' | 'byGroup';
  showItemPrices: boolean;
  showGroupPrices: boolean;
  showSubtotal: boolean;
  showTax: boolean;
  showTotal: boolean;
  hiddenLineItems?: string[]; // item ids that are hidden from client view
}


// ============================================================================
// ESTIMATE STATES
// ============================================================================

/**
 * Estimate state - represents the type/stage of the estimate
 */
export type EstimateState = 'draft' | 'estimate' | 'invoice' | 'change-order';

/**
 * Client state - represents the client interaction status
 */
export type ClientState = 'sent' | 'viewed' | 'accepted' | 'denied' | 'on-hold' | 'expired' | null;

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
  serviceAddress?: string;
  serviceAddress2?: string;
  serviceCity?: string;
  serviceState?: string;
  serviceZipCode?: string;

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

  // Status & Tracking (NEW STRUCTURE)
  estimateState: EstimateState;      // Type: draft, estimate, invoice, change-order
  clientState?: ClientState;          // Client interaction: sent, viewed, accepted, denied, on-hold, expired
  parentEstimateId?: string;          // For change orders - links to parent estimate

  // Legacy status field (DEPRECATED - use estimateState and clientState instead)
  status?: 'draft' | 'estimate' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'change-order' | 'quote' | 'expired';

  sentDate?: string;
  viewedDate?: string;
  viewCount?: number;
  viewHistory?: ViewLog[];
  acceptedDate?: string;
  rejectedDate?: string;
  deniedDate?: string;                // Replaces rejectedDate
  denialReason?: string;              // Replaces rejectionReason
  onHoldDate?: string;                // New field for on-hold status
  onHoldReason?: string;              // New field for on-hold reason
  rejectionReason?: string;           // DEPRECATED - use denialReason

  // Validity
  validUntil?: string;

  // Payment Schedule
  paymentSchedule?: PaymentSchedule;  // Payment schedule configuration
  requestSchedule?: boolean;          // DEPRECATED - use paymentSchedule instead


  // Email Tracking
  emailToken?: string;           // Secure token for client access
  clientViewUrl?: string;        // Full URL for client viewing
  lastEmailSent?: string;        // Timestamp of last email sent
  emailSentCount?: number;       // How many times estimate was emailed
  contractorEmail?: string;      // Contractor email for notifications

  // Client Interaction
  clientComments?: ClientComment[];
  clientApprovalStatus?: 'pending' | 'approved' | 'rejected';
  clientApprovalDate?: string;
  clientApprovalBy?: string;     // Client name/email who approved

  // Change Tracking
  changeOrders?: string[]; // IDs of change orders
  changeOrderAdditions?: ChangeOrderItem[];
  changeOrderTotal?: number;
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

  // Purchase Orders
  purchaseOrderIds?: string[];  // IDs of generated purchase orders

  // Client View & Grouping
  groups?: EstimateGroup[];
  clientViewSettings?: ClientViewSettings;
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