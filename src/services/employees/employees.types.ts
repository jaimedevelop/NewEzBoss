// src/services/employees/employees.types.ts

import { Timestamp } from 'firebase/firestore';

export interface Employee {
  id?: string;
  employeeId: string; // Unique employee identifier (e.g., "EMP-001")
  name: string;
  email: string;
  phoneMobile: string;
  phoneOther?: string;
  employeeRole: string; // Job title/position
  hireDate: string; // ISO date string
  hourlyRate?: number; // Optional pay rate
  isActive: boolean; // Employment status
  notes?: string;
  
  // Emergency Contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  
  // Home Address
  address: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  
  // Metadata
  userId: string;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export interface EmployeeFilters {
  searchTerm?: string;
  employeeRole?: string;
  isActive?: boolean;
}

export interface EmployeesResponse {
  employees: Employee[];
  hasMore: boolean;
  lastDoc?: any;
}

export interface DatabaseResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}
