// src/services/employees/employees.queries.ts

import { employeesApiRequest, ApiError } from './employeesApi';
import type { Employee, DatabaseResult } from './employees.types';

interface ApiEmployeeRow {
  id: number;
  employeeId: string;
  name: string;
  email: string | null;
  phoneMobile: string | null;
  phoneOther: string | null;
  employeeRole: string | null;
  hireDate: string | null;
  hourlyRate: string | number | null;
  isActive: boolean;
  notes: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  address: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  isComplete: boolean;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

function apiRowToEmployee(row: ApiEmployeeRow): Employee {
  return {
    id: String(row.id),
    employeeId: row.employeeId,
    name: row.name,
    email: row.email ?? undefined,
    phoneMobile: row.phoneMobile ?? undefined,
    phoneOther: row.phoneOther ?? undefined,
    employeeRole: row.employeeRole ?? undefined,
    hireDate: row.hireDate ?? undefined,
    hourlyRate: row.hourlyRate !== null && row.hourlyRate !== undefined ? Number(row.hourlyRate) : undefined,
    isActive: row.isActive,
    notes: row.notes ?? undefined,
    emergencyContactName: row.emergencyContactName ?? undefined,
    emergencyContactPhone: row.emergencyContactPhone ?? undefined,
    address: row.address ?? undefined,
    address2: row.address2 ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    zipCode: row.zipCode ?? undefined,
    isComplete: row.isComplete,
    userId: String(row.userId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Get all employees for a user, grouped by first letter of last name
 */
export async function getEmployeesGroupedByLetter(
  _userId: string
): Promise<DatabaseResult<Record<string, Employee[]>>> {
  try {
    const rows = await employeesApiRequest<Record<string, ApiEmployeeRow[]>>('/employees');
    const grouped: Record<string, Employee[]> = {};
    for (const [letter, employees] of Object.entries(rows)) {
      grouped[letter] = employees.map(apiRowToEmployee);
    }
    return { success: true, data: grouped };
  } catch (error) {
    console.error('Error fetching employees:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch employees',
    };
  }
}

/**
 * Get a single employee by ID
 */
export async function getEmployeeById(
  employeeId: string
): Promise<DatabaseResult<Employee>> {
  try {
    const row = await employeesApiRequest<ApiEmployeeRow>(`/employees/${employeeId}`);
    return { success: true, data: apiRowToEmployee(row) };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, error: 'Employee not found' };
    }
    console.error('Error fetching employee:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch employee',
    };
  }
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  // Return original if not 10 digits
  return phone;
}

/**
 * Get the next available employee ID
 */
export async function getNextEmployeeId(_userId: string): Promise<string> {
  try {
    const result = await employeesApiRequest<{ employeeId: string }>('/employees/next-employee-id');
    return result.employeeId;
  } catch (error) {
    console.error('Error generating employee ID:', error);
    // Fallback to timestamp-based ID if there's an error
    return `EMP-${Date.now().toString().slice(-6)}`;
  }
}
