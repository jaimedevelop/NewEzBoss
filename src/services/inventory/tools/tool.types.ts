// src/services/inventory/tools/tool.types.ts

/**
 * Tool item interface - represents a physical tool/equipment
 */
export interface ToolItem {
  id?: string;
  name: string;
  description: string;
  notes: string;
  
  // Hierarchy - Store IDs + cached names for display
  tradeId: string;
  tradeName: string;         // Cached for display
  sectionId: string;
  sectionName: string;       // Cached for display
  categoryId: string;
  categoryName: string;      // Cached for display
  subcategoryId: string;
  subcategoryName: string;   // Cached for display
  
  // Additional fields
  brand: string;
  location: string;
  status: 'available' | 'in-use' | 'maintenance';
  purchaseDate: string;      // YYYY-MM-DD format
  warrantyExpiration: string; // YYYY-MM-DD format
  
  // Pricing
  minimumCustomerCharge: number;
  
  // Image
  imageUrl: string;          // External URL
  
  // Project assignment (future)
  // TODO: Add assignedProjectId when project assignment is implemented
  // TODO: Add assignedEmployeeId when employee system is implemented
  // TODO: Add checkOutDate and checkInDate when check-out system is implemented
  // TODO: Add condition field (good/fair/poor) for maintenance tracking
  
  // Metadata
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Tool filters for queries
 */
export interface ToolFilters {
  tradeId?: string;
  sectionId?: string;
  categoryId?: string;
  subcategoryId?: string;
  status?: string;
  searchTerm?: string;
  sortBy?: 'name' | 'brand' | 'minimumCustomerCharge' | 'purchaseDate' | 'status';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Standard response structure
 */
export interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Tool Section interface (Level 2)
 */
export interface ToolSection {
  id?: string;
  name: string;
  tradeId: string;      // References productTrades collection
  userId: string;
  createdAt?: any;
}

/**
 * Tool Category interface (Level 3)
 */
export interface ToolCategory {
  id?: string;
  name: string;
  sectionId: string;    // References toolSections
  tradeId: string;      // For easier queries
  userId: string;
  createdAt?: any;
}

/**
 * Tool Subcategory interface (Level 4)
 */
export interface ToolSubcategory {
  id?: string;
  name: string;
  categoryId: string;   // References toolCategories
  sectionId: string;    // For easier queries
  tradeId: string;      // For easier queries
  userId: string;
  createdAt?: any;
}