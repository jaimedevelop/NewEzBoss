// src/services/estimates/paymentSchedule.utils.ts
//
// Pure helpers shared by PaymentsTab.tsx (and anything else) that need to
// resolve a PaymentScheduleEntry to a dollar amount and figure out how much
// of it has actually been paid/claimed, given the flat list of PaymentRecords
// an estimate carries.
import type { PaymentSchedule, PaymentScheduleEntry } from './PaymentScheduleModal.types';
import type { PaymentRecord } from './estimates.types';

export function getEntryAmount(
  entry: PaymentScheduleEntry,
  schedule: PaymentSchedule,
  estimateTotal: number
): number {
  return schedule.mode === 'percentage' ? (estimateTotal * entry.value) / 100 : entry.value;
}

export function getEntryPaidAmount(entry: PaymentScheduleEntry, payments: PaymentRecord[]): number {
  return payments
    .filter((p) => p.scheduleEntryId === entry.id && p.status === 'approved')
    .reduce((sum, p) => sum + p.amount, 0);
}

export function getEntryPendingAmount(entry: PaymentScheduleEntry, payments: PaymentRecord[]): number {
  return payments
    .filter((p) => p.scheduleEntryId === entry.id && p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Pending amount awaiting actual contractor sign-off (cash claims only).
 * Stripe/PayPal payments are auto-approved by the gateway webhook the moment
 * the charge succeeds — a contractor never signs off on those.
 */
export function getEntryPendingCashAmount(entry: PaymentScheduleEntry, payments: PaymentRecord[]): number {
  return payments
    .filter((p) => p.scheduleEntryId === entry.id && p.status === 'pending' && !p.stripePaymentIntentId && !p.paypalOrderId)
    .reduce((sum, p) => sum + p.amount, 0);
}

/** Pending amount still being processed by Stripe/PayPal (no contractor action needed). */
export function getEntryPendingGatewayAmount(entry: PaymentScheduleEntry, payments: PaymentRecord[]): number {
  return payments
    .filter((p) => p.scheduleEntryId === entry.id && p.status === 'pending' && (p.stripePaymentIntentId || p.paypalOrderId))
    .reduce((sum, p) => sum + p.amount, 0);
}

/** Payments with no scheduleEntryId, or tagged to an entry that no longer exists on the schedule. */
export function getUnassignedPayments(payments: PaymentRecord[], schedule: PaymentSchedule | null | undefined): PaymentRecord[] {
  const entryIds = new Set((schedule?.entries ?? []).map((e) => e.id));
  return payments.filter((p) => !p.scheduleEntryId || !entryIds.has(p.scheduleEntryId));
}

/** Overall balance due, counting only approved payments — pending claims/gateway payments don't count until resolved. */
export function getOverallBalance(estimateTotal: number, payments: PaymentRecord[]): number {
  const totalApprovedPaid = payments.filter((p) => p.status === 'approved').reduce((sum, p) => sum + p.amount, 0);
  return estimateTotal - totalApprovedPaid;
}
