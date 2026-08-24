// src/services/employees/employees.mutations.ts

import { employeesApiRequest } from './employeesApi';
import type { Employee, DatabaseResult } from './employees.types';

/**
 * Check if an employee has all required fields filled
 */
export function isEmployeeComplete(data: Partial<Employee>): boolean {
  // Check basic required fields
  const hasBasicInfo = !!(
    data.name?.trim() &&
    data.email?.trim() &&
    data.phoneMobile?.trim() &&
    data.employeeRole?.trim() &&
    data.hireDate?.trim()
  );

  // Check address
  const hasAddress = !!(
    data.address?.trim() &&
    data.city?.trim() &&
    data.state?.trim() &&
    data.zipCode?.trim()
  );

  return hasBasicInfo && hasAddress;
}

/**
 * Validate employee data before saving
 * Now allows partial data - only validates format of provided fields
 */
export function validateEmployeeData(data: Partial<Employee>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Email format validation (if provided)
  if (data.email && data.email.trim() !== '') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }
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

const SCALAR_FIELDS = [
  'name',
  'email',
  'phoneMobile',
  'phoneOther',
  'employeeRole',
  'hireDate',
  'hourlyRate',
  'isActive',
  'notes',
  'emergencyContactName',
  'emergencyContactPhone',
  'address',
  'address2',
  'city',
  'state',
  'zipCode',
] as const;

function pickScalarFields(data: Partial<Employee>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const key of SCALAR_FIELDS) {
    if (data[key] !== undefined) body[key] = data[key];
  }
  return body;
}

/**
 * Create a new employee
 */
export async function createEmployee(
  employeeData: Omit<Employee, 'id' | 'employeeId' | 'createdAt' | 'updatedAt'>,
  _userId: string
): Promise<DatabaseResult<string>> {
  try {
    const body = {
      ...pickScalarFields(employeeData),
      isActive: employeeData.isActive ?? true, // Default to active
    };

    const row = await employeesApiRequest<{ id: number }>('/employees', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return { success: true, data: String(row.id) };
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
    const body = pickScalarFields(employeeData);

    await employeesApiRequest(`/employees/${employeeId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
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
    await employeesApiRequest(`/employees/${employeeId}`, { method: 'DELETE' });

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
    await employeesApiRequest(`/employees/${employeeId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: false }),
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
