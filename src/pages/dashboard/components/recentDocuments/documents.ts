import type { ApiEstimateRow } from '../../../../services/estimates/estimates.mapper';
import { apiPaymentToPayment } from '../../../../services/estimates/estimates.mapper';
import { getOverallBalance } from '../../../../services/estimates/paymentSchedule.utils';

// Keep absent list fields absent: the shared mapper supplies synthetic zeroes
// and empty payment arrays for the deliberately sparse list response.
export type DocumentRow = Partial<ApiEstimateRow> & Pick<ApiEstimateRow, 'id'>;
export type Period = 'Last 7 days' | 'Last 30 days' | 'Last 90 days';
export type DocumentKind = 'estimates' | 'invoices';

export function calendarDate(value: string | undefined | null, timezone?: string): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)?.value).join('-');
}

export function periodBounds(period: Period, now: Date, timezone?: string): [string, string] {
  const today = calendarDate(now.toISOString(), timezone)!;
  // UTC is only calendar arithmetic here; timestamps are converted above in
  // the company timezone, and date-only values never become local instants.
  const start = new Date(`${today}T12:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (period === 'Last 7 days' ? 6 : period === 'Last 30 days' ? 29 : 89));
  const end = new Date(`${today}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}

export function selectDocuments(rows: DocumentRow[], kind: DocumentKind, period: Period, now: Date, timezone?: string) {
  const [start, end] = periodBounds(period, now, timezone);
  const candidates = rows.filter(row => kind === 'estimates'
    ? row.estimateState === 'estimate' && ['sent', 'viewed', 'accepted', 'denied', 'on-hold', 'expired'].includes(row.clientState ?? '')
    : row.estimateState === 'invoice');
  const unsent = candidates.filter(row => kind === 'invoices' && !row.sentDate && !row.clientState && !row.lastEmailSent && !['sent', 'viewed', 'accepted', 'rejected', 'expired'].includes(row.status ?? '')).length;
  const unavailable = candidates.filter(row => !calendarDate(row.sentDate, timezone)).length - unsent;
  const seen = new Set<number>();
  const documents = candidates.filter(row => {
    const sent = calendarDate(row.sentDate, timezone);
    if (!sent || sent < start || sent >= end || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  }).sort((a, b) => {
    const dateDifference = calendarDate(b.sentDate, timezone)!.localeCompare(calendarDate(a.sentDate, timezone)!);
    return dateDifference || Date.parse(b.sentDate!) - Date.parse(a.sentDate!) || b.id - a.id;
  }).slice(0, 5);
  return { documents, unavailable, unsent };
}

export function invoiceBalance(invoice: DocumentRow, rows: DocumentRow[]): number | null {
  // Linked invoices use the source estimate's payment ledger, not a copied
  // invoice ledger. Never infer zero payments from an omitted collection.
  const ledger = invoice.sourceEstimateId != null ? rows.find(row => row.id === invoice.sourceEstimateId) : invoice;
  const payments = ledger?.payments;
  const total = invoice.total;
  if (total == null || total === '' || !Number.isFinite(Number(total)) || !Array.isArray(payments)) return null;
  if (payments.some(payment => !['approved', 'pending', 'rejected'].includes(payment.status)
    || payment.amount == null || payment.amount === '' || !Number.isFinite(Number(payment.amount)))) return null;
  return Math.max(0, getOverallBalance(Number(total), payments.map(apiPaymentToPayment)));
}

export function formatDate(value?: string | null, timezone?: string): string {
  const date = calendarDate(value, timezone);
  return date ? new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric',
  }) : 'Unavailable';
}

export function address(parts: Array<string | undefined | null>): string {
  return parts.map(part => part?.trim()).filter(Boolean).join(', ') || 'Unavailable';
}

export const money = (value: number, currency = 'USD'): string => new Intl.NumberFormat('en-US', {
  style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(value);
