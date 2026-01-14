// src/pages/estimates/components/PaymentScheduleModal.types.ts

/**
 * Mode for payment schedule calculation
 */
export type PaymentScheduleMode = 'percentage' | 'sum';

/**
 * Individual payment entry in the schedule
 */
export interface PaymentScheduleEntry {
  id: string;
  description: string;
  value: number; // Either percentage (0-100) or dollar amount
  dueDate?: string; // Optional due date for the payment
}

/**
 * Complete payment schedule configuration
 */
export interface PaymentSchedule {
  mode: PaymentScheduleMode;
  entries: PaymentScheduleEntry[];
}
