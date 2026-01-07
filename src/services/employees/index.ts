// src/services/employees/index.ts

// Types
export type { Employee, EmployeeFilters, EmployeesResponse, DatabaseResult } from './employees.types';

// Queries
export {
  getEmployeesGroupedByLetter,
  getEmployeeById,
  formatPhoneNumber,
  getNextEmployeeId,
} from './employees.queries';

// Mutations
export {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  deactivateEmployee,
  validateEmployeeData,
} from './employees.mutations';
