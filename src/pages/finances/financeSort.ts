import { dateInput } from './dateTime';
import type { Field, LedgerRow } from './ledger';

export type FinanceSort = { column: Field; direction: 'asc' | 'desc' };
const textOrder = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

export function nextFinanceSort(current: FinanceSort | null, column: Field): FinanceSort | null {
  if (current?.column !== column) return { column, direction: 'asc' };
  return current.direction === 'asc' ? { column, direction: 'desc' } : null;
}

function sortValue(row: LedgerRow, column: Field): string | number | null {
  const summary = row.paymentSummary;
  let value = row.data[column].trim();
  if (summary) {
    if (column === 'payment') return summary.paid;
    if (column === 'paymentMethod') value = [...new Set(summary.payments.map(payment => payment.method))].join(', ');
    if (column === 'paymentDate') value = summary.payments.at(-1)?.date ?? '';
  }
  if (!value) return null;
  if (['date', 'paymentDate', 'jobCompletionDate'].includes(column)) return dateInput(value) || null;
  if (column === 'payment') {
    const numeric = value.replace(/[$,\s]/g, '');
    return /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(numeric) && Number.isFinite(Number(numeric)) ? Number(numeric) : null;
  }
  return value;
}

/** Keep empty/invalid values last in either direction, and preserve ties. */
export function sortFinanceRows(rows: LedgerRow[], sort: FinanceSort): LedgerRow[] {
  return [...rows].sort((a, b) => {
    const left = sortValue(a, sort.column);
    const right = sortValue(b, sort.column);
    if (left === null || right === null) return left === null ? right === null ? 0 : 1 : -1;
    const compared = typeof left === 'number' && typeof right === 'number' ? left - right : textOrder.compare(String(left), String(right));
    return compared * (sort.direction === 'asc' ? 1 : -1);
  });
}
