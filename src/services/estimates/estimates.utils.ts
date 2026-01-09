// src/services/estimates/estimates.utils.ts

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { LineItem, LineItemUpdate, LineItemValidation } from './estimates.types';

// ============================================================================
// FIREBASE SETUP (EXISTING - KEEP AS-IS)
// ============================================================================

// Collection reference
export const ESTIMATES_COLLECTION = 'estimates';
const estimatesCollection = collection(db, ESTIMATES_COLLECTION);

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
 * Generate the next change order number for a parent estimate
 * Format: CHO-YEAR-PARENT#-SEQ (e.g., "CHO-2026-042-01")
 * @param parentEstimateNumber - The parent estimate number (e.g., "EST-2026-042")
 * @returns The next change order number
 */
export const generateChangeOrderNumber = async (parentEstimateNumber: string): Promise<string> => {
  try {
    // Extract year and parent number from parent estimate
    // Format: EST-YEAR-NUMBER -> extract YEAR and NUMBER
    const parts = parentEstimateNumber.split('-');
    if (parts.length !== 3 || parts[0] !== 'EST') {
      throw new Error(`Invalid parent estimate number format: ${parentEstimateNumber}`);
    }
    
    const year = parts[1];
    const parentNumber = parts[2];
    
    // Query for existing change orders for this parent
    // Format: CHO-YEAR-PARENT#-
    const choPrefix = `CHO-${year}-${parentNumber}-`;
    const choEnd = `CHO-${year}-${parentNumber}-ZZZ`;
    
    const q = query(
      estimatesCollection,
      where('estimateNumber', '>=', choPrefix),
      where('estimateNumber', '<', choEnd),
      orderBy('estimateNumber', 'desc'),
      limit(1)
    );
    
    const snapshot: QuerySnapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // First change order for this parent
      return `CHO-${year}-${parentNumber}-01`;
    }
    
    // Get the last change order number and increment
    const lastCO = snapshot.docs[0].data();
    const lastSeq = parseInt(lastCO.estimateNumber.split('-')[3]);
    const nextSeq = (lastSeq + 1).toString().padStart(2, '0');
    
    return `CHO-${year}-${parentNumber}-${nextSeq}`;
  } catch (error) {
    console.error('Error generating change order number:', error);
    throw error;
  }
};

/**
 * Get current year for estimate numbering
 */
export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

/**
 * Format date to YYYY-MM-DD
 */
export const formatDateForDB = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Calculate estimate totals
 */
export const calculateEstimateTotals = (
  lineItems: Array<{ quantity: number; unitPrice: number }>,
  discount: number = 0,
  discountType: 'percentage' | 'fixed' = 'fixed',
  taxRate: number = 0
) => {
  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  
  const discountAmount = discountType === 'percentage' 
    ? subtotal * (discount / 100)
    : discount;
  
  const afterDiscount = subtotal - discountAmount;
  const tax = afterDiscount * (taxRate / 100);
  const total = afterDiscount + tax;
  
  return {
    subtotal,
    discountAmount,
    tax,
    total
  };
};

// ============================================================================
// ✅ ADDED: LINE ITEM UTILITIES
// ============================================================================

/**
 * Calculate line item total (quantity × unit price)
 */
export const calculateLineItemTotal = (quantity: number, unitPrice: number): number => {
  return quantity * unitPrice;
};

/**
 * Validate line item data
 */
export const validateLineItem = (item: Partial<LineItem>): LineItemValidation => {
  const errors: Record<string, string> = {};
  
  if (!item.description || item.description.trim() === '') {
    errors.description = 'Description is required';
  }
  
  if (item.quantity === undefined || item.quantity <= 0) {
    errors.quantity = 'Quantity must be greater than 0';
  }
  
  if (item.unitPrice === undefined || item.unitPrice < 0) {
    errors.unitPrice = 'Unit price cannot be negative';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate line item update
 */
export const validateLineItemUpdate = (updates: LineItemUpdate): LineItemValidation => {
  const errors: Record<string, string> = {};
  
  if (updates.description !== undefined && updates.description.trim() === '') {
    errors.description = 'Description cannot be empty';
  }
  
  if (updates.quantity !== undefined && updates.quantity <= 0) {
    errors.quantity = 'Quantity must be greater than 0';
  }
  
  if (updates.unitPrice !== undefined && updates.unitPrice < 0) {
    errors.unitPrice = 'Unit price cannot be negative';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// ============================================================================
// ✅ ADDED: FORMATTING UTILITIES
// ============================================================================

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

/**
 * Format date for display
 */
export const formatDate = (date: Date | string | { seconds: number }): string => {
  let jsDate: Date;
  
  if (date instanceof Date) {
    jsDate = date;
  } else if (typeof date === 'string') {
    jsDate = new Date(date);
  } else if (typeof date === 'object' && 'seconds' in date) {
    jsDate = new Date(date.seconds * 1000);
  } else {
    jsDate = new Date();
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(jsDate);
};

// ============================================================================
// ✅ ADDED: REVISION HELPERS (for UI components)
// ============================================================================

/**
 * Get icon name for revision type (used in UI)
 */
export const getRevisionIcon = (changeType?: string): string => {
  switch (changeType) {
    case 'line_item_added':
      return 'Plus';
    case 'line_item_updated':
      return 'Edit';
    case 'line_item_deleted':
      return 'Trash2';
    case 'discount_changed':
    case 'tax_changed':
      return 'DollarSign';
    case 'status_changed':
      return 'Activity';
    default:
      return 'FileText';
  }
};

/**
 * Get color class for revision type (used in UI)
 */
export const getRevisionColor = (changeType?: string): string => {
  switch (changeType) {
    case 'line_item_added':
      return 'text-green-600 bg-green-50';
    case 'line_item_updated':
      return 'text-blue-600 bg-blue-50';
    case 'line_item_deleted':
      return 'text-red-600 bg-red-50';
    case 'discount_changed':
    case 'tax_changed':
      return 'text-orange-600 bg-orange-50';
    case 'status_changed':
      return 'text-purple-600 bg-purple-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};