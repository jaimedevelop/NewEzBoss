// src/services/labor/labor.types.ts

/**
 * Labor item interface - represents a labor service
 */
export interface LaborItem {
  id?: string;
  name: string;
  description: string;
  
  // Hierarchy - Store IDs + cached names for display
  tradeId: string;           // References productTrades collection
  tradeName: string;         // Cached for display
  sectionId: string;         // References laborSections collection
  sectionName: string;       // Cached for display
  categoryId: string;        // References laborCategories collection
  categoryName: string;      // Cached for display
  
  isActive: boolean;
  
  // Flat Rate pricing
  estimatedHours?: number;
  flatRates?: FlatRate[];
  
  // Hourly Rate pricing
  hourlyRates?: HourlyRate[];
  
  // Tasks
  tasks?: Task[];
  
  // Metadata
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Flat rate entry
 */
export interface FlatRate {
  id: string;
  name: string;
  rate: number;
}

/**
 * Hourly rate entry
 */
export interface HourlyRate {
  id: string;
  name: string;
  skillLevel: string;
  hourlyRate: number;
}

/**
 * Task entry - used in both database and form state
 */
export interface Task {
  id: string;
  name: string;
  description: string;
}

/**
 * TaskEntry - Alias for Task (used in context/forms)
 * This allows both names to work interchangeably
 */
export type TaskEntry = Task;

/**
 * Trade interface (Level 1)
 */
export interface Trade {
  id?: string;
  name: string;
  userId: string;
  createdAt?: any;
}

/**
 * Section interface (Level 2)
 */
export interface Section {
  id?: string;
  name: string;
  trade: string; // Parent reference
  userId: string;
  createdAt?: any;
}

/**
 * Category interface (Level 3)
 */
export interface Category {
  id?: string;
  name: string;
  trade: string; // Grandparent reference
  section: string; // Parent reference
  userId: string;
  createdAt?: any;
}

/**
 * Labor filters for queries
 */
export interface LaborFilters {
  tradeId?: string;      // ← Changed from 'trade'
  sectionId?: string;    // ← Changed from 'section'
  categoryId?: string;   // ← Changed from 'category'
  isActive?: boolean;
  searchTerm?: string;
  tier?: string;
}

/**
 * Standard response structure
 */
export interface LaborResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
