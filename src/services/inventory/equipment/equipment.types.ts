// src/services/inventory/equipment/equipment.types.ts

/**
 * Equipment item interface - represents physical equipment (owned or rented)
 */
export interface EquipmentItem {
  id?: string;
  name: string;
  description: string;
  notes: string;
  
  // Equipment Type Distinction
  equipmentType: 'owned' | 'rented';  // Owned by company or rented from store
  
  // Hierarchy - Store IDs + cached names for display
  tradeId: string;
  tradeName: string;         // Cached for display
  sectionId: string;
  sectionName: string;       // Cached for display
  categoryId: string;
  categoryName: string;      // Cached for display
  subcategoryId: string;
  subcategoryName: string;   // Cached for display
  
  // Status
  status: 'available' | 'in-use' | 'maintenance';
  
  // Rental Information (for rented equipment)
  rentalStoreName?: string;      // Store where equipment is rented from
  rentalStoreLocation?: string;  // Store location
  dueDate?: string;              // YYYY-MM-DD format - when rental is due back
  
  // Rental Pricing
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  pickupDeliveryPrice?: number;
  
  // Customer Pricing
  minimumCustomerCharge: number;  // Minimum to charge customers
  
  // Loan Information (for owned equipment with loans)
  isPaidOff: boolean;            // true = paid off, false = still paying
  loanAmount?: number;           // Original loan amount
  monthlyPayment?: number;       // Monthly loan payment
  loanStartDate?: string;        // YYYY-MM-DD format
  loanPayoffDate?: string;       // YYYY-MM-DD format
  remainingBalance?: number;     // Current balance owed
  
  // Image
  imageUrl: string;              // External URL
  
  // Future Fields (not implemented yet - will be greyed out in UI)
  // assignedPickupDeliveryPerson?: string;  // Employee ID
  // pickupDeliveryStatus?: 'pending' | 'picked-up' | 'delivered' | 'returned';
  // assignedProjectId?: string;            // Project this equipment is assigned to
  
  // Metadata
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
}

// src/services/inventory/equipment/equipment.types.ts

/**
 * Rental entry for equipment - allows multiple rental store options
 */
export interface RentalEntry {
  id: string;
  storeName: string;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  pickupFee: number;
  deliveryFee: number;
  extraFees: number;
}

// Update the EquipmentItem interface to include rentalEntries:
export interface EquipmentItem {
  id?: string;
  name: string;
  description: string;
  notes: string;
  
  // Equipment Type Distinction
  equipmentType: 'owned' | 'rented';
  
  // Hierarchy - Store IDs + cached names for display
  tradeId: string;
  tradeName: string;
  sectionId: string;
  sectionName: string;
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  
  // Status
  status: 'available' | 'in-use' | 'maintenance';
  
  // Due Date (for rented equipment)
  dueDate?: string;  // YYYY-MM-DD format - when rental is due back
  
  // Rental Entries - Multiple rental store options
  rentalEntries?: RentalEntry[];
  
  // Customer Pricing
  minimumCustomerCharge: number;
  
  // Loan Information (for owned equipment with loans)
  isPaidOff: boolean;
  loanAmount?: number;
  monthlyPayment?: number;
  loanStartDate?: string;
  loanPayoffDate?: string;
  remainingBalance?: number;
  
  // Image
  imageUrl: string;
  
  // Metadata
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Equipment filters for queries
 */
export interface EquipmentFilters {
  tradeId?: string;
  sectionId?: string;
  categoryId?: string;
  subcategoryId?: string;
  equipmentType?: 'owned' | 'rented';
  status?: string;
  rentalStoreName?: string;
  searchTerm?: string;
  sortBy?: 'name' | 'equipmentType' | 'rentalStoreName' | 'dueDate' | 'minimumCustomerCharge' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Standard response structure
 */
export interface EquipmentResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Paginated response structure
 */
export interface PaginatedEquipmentResponse {
  equipment: EquipmentItem[];
  hasMore: boolean;
  lastDoc: any;
}

/**
 * Equipment Section interface (Level 2)
 */
export interface EquipmentSection {
  id?: string;
  name: string;
  tradeId: string;      // References productTrades collection
  userId: string;
  createdAt?: any;
}

/**
 * Equipment Category interface (Level 3)
 */
export interface EquipmentCategory {
  id?: string;
  name: string;
  sectionId: string;    // References equipmentSections
  tradeId: string;      // For easier queries
  userId: string;
  createdAt?: any;
}

/**
 * Equipment Subcategory interface (Level 4)
 */
export interface EquipmentSubcategory {
  id?: string;
  name: string;
  categoryId: string;   // References equipmentCategories
  sectionId: string;    // For easier queries
  tradeId: string;      // For easier queries
  userId: string;
  createdAt?: any;
}