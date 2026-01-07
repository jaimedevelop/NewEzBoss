// src/services/employees/employees.queries.ts

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import type { Employee, DatabaseResult } from './employees.types';

/**
 * Get all employees for a user, grouped by first letter of last name
 */
export async function getEmployeesGroupedByLetter(
  userId: string
): Promise<DatabaseResult<Record<string, Employee[]>>> {
  try {
    const employeesRef = collection(db, 'employees');
    const q = query(
      employeesRef,
      where('userId', '==', userId),
      orderBy('name')
    );

    const snapshot = await getDocs(q);
    const grouped: Record<string, Employee[]> = {};

    snapshot.forEach((doc) => {
      const employee = { id: doc.id, ...doc.data() } as Employee;
      
      // Get last name (assume format: "FirstName LastName")
      const nameParts = employee.name.trim().split(' ');
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
      const firstLetter = lastName.charAt(0).toUpperCase();

      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(employee);
    });

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
    const employeeRef = doc(db, 'employees', employeeId);
    const snapshot = await getDoc(employeeRef);

    if (!snapshot.exists()) {
      return { success: false, error: 'Employee not found' };
    }

    const employee = { id: snapshot.id, ...snapshot.data() } as Employee;
    return { success: true, data: employee };
  } catch (error) {
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
export async function getNextEmployeeId(userId: string): Promise<string> {
  try {
    const employeesRef = collection(db, 'employees');
    const q = query(
      employeesRef,
      where('userId', '==', userId),
      orderBy('employeeId', 'desc')
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return 'EMP-001';
    }

    // Get the highest employee ID and increment
    const lastEmployee = snapshot.docs[0].data() as Employee;
    const lastId = lastEmployee.employeeId;
    const match = lastId.match(/EMP-(\d+)/);
    
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `EMP-${nextNum.toString().padStart(3, '0')}`;
    }

    return 'EMP-001';
  } catch (error) {
    console.error('Error generating employee ID:', error);
    // Fallback to timestamp-based ID if there's an error
    return `EMP-${Date.now().toString().slice(-6)}`;
  }
}
