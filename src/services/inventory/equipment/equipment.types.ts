// src/services/inventory/equipment/equipment.types.ts

/**
 * Rental entry for equipment - allows multiple rental store options
 */
export interface RentalEntry {
  id: string;
  storeName: string;
  storeLocation: string;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  pickupFee: number;
  deliveryFee: number;
  extraFees: number;
}

/**
 * Equipment item interface - represents physical equipment (owned or rented)
 */
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
  searchTerm?: string;
  sortBy?: 'name' | 'equipmentType' | 'dueDate' | 'minimumCustomerCharge' | 'status';
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
 * Equipment Section interface (Level 2)
 */
export interface EquipmentSection {
  id?: string;
  name: string;
  tradeId: string;
  userId: string;
  createdAt?: any;
}

/**
 * Equipment Category interface (Level 3)
 */
export interface EquipmentCategory {
  id?: string;
  name: string;
  sectionId: string;
  tradeId: string;
  userId: string;
  createdAt?: any;
}

/**
 * Equipment Subcategory interface (Level 4)
 */
export interface EquipmentSubcategory {
  id?: string;
  name: string;
  categoryId: string;
  sectionId: string;
  tradeId: string;
  userId: string;
  createdAt?: any;
}