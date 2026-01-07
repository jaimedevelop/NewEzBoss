// src/services/employees/employees.mutations.ts

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { Employee, DatabaseResult } from './employees.types';
import { getNextEmployeeId } from './employees.queries';

/**
 * Validate employee data before saving
 */
export function validateEmployeeData(data: Partial<Employee>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!data.name?.trim()) {
    errors.push('Name is required');
  }
  if (!data.email?.trim()) {
    errors.push('Email is required');
  }
  if (!data.phoneMobile?.trim()) {
    errors.push('Mobile phone is required');
  }
  if (!data.employeeRole?.trim()) {
    errors.push('Employee role is required');
  }
  if (!data.hireDate?.trim()) {
    errors.push('Hire date is required');
  }
  if (!data.address?.trim()) {
    errors.push('Address is required');
  }
  if (!data.city?.trim()) {
    errors.push('City is required');
  }
  if (!data.state?.trim()) {
    errors.push('State is required');
  }
  if (!data.zipCode?.trim()) {
    errors.push('Zip code is required');
  }

  // Email format validation
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }

  // Hourly rate validation (if provided)
  if (data.hourlyRate !== undefined && data.hourlyRate !== null) {
    if (data.hourlyRate < 0) {
      errors.push('Hourly rate cannot be negative');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create a new employee
 */
export async function createEmployee(
  employeeData: Omit<Employee, 'id' | 'employeeId' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<DatabaseResult<string>> {
  try {
    // Generate the next employee ID
    const employeeId = await getNextEmployeeId(userId);

    const employeesRef = collection(db, 'employees');
    const docRef = await addDoc(employeesRef, {
      ...employeeData,
      employeeId,
      userId,
      isActive: employeeData.isActive ?? true, // Default to active
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true, data: docRef.id };
  } catch (error) {
    console.error('Error creating employee:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create employee',
    };
  }
}

/**
 * Update an existing employee
 */
export async function updateEmployee(
  employeeId: string,
  employeeData: Partial<Employee>
): Promise<DatabaseResult> {
  try {
    const employeeRef = doc(db, 'employees', employeeId);
    
    // Remove fields that shouldn't be updated
    const { id, employeeId: empId, createdAt, userId, ...updateData } = employeeData as any;

    await updateDoc(employeeRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating employee:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update employee',
    };
  }
}

/**
 * Delete an employee
 */
export async function deleteEmployee(employeeId: string): Promise<DatabaseResult> {
  try {
    const employeeRef = doc(db, 'employees', employeeId);
    await deleteDoc(employeeRef);

    return { success: true };
  } catch (error) {
    console.error('Error deleting employee:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete employee',
    };
  }
}

/**
 * Mark an employee as inactive (soft delete alternative)
 */
export async function deactivateEmployee(employeeId: string): Promise<DatabaseResult> {
  try {
    const employeeRef = doc(db, 'employees', employeeId);
    await updateDoc(employeeRef, {
      isActive: false,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error deactivating employee:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deactivate employee',
    };
  }
}
