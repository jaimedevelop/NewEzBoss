import type { EstimateWithId } from '../../services/estimates';

export type SortColumn = 'document' | 'customer' | 'po' | 'address' | 'date' | 'type' | 'status' | 'total';
export type ColumnSort = { column: SortColumn; step: number } | null;
const types = ['estimate', 'invoice', 'draft', 'change-order'];
const statuses = ['sent', 'viewed', 'accepted', 'denied', 'draft', 'on-hold', 'expired'];
const textOrder = new Intl.Collator(undefined, { sensitivity: 'base' });
const naturalOrder = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

export function nextColumnSort(current: ColumnSort, column: SortColumn): ColumnSort {
  const count = column === 'type' ? types.length : column === 'status' ? statuses.length : 2;
  const step = current?.column === column ? current.step + 1 : 0;
  return step >= count ? null : { column, step };
}

export function columnSortLabel(sort: ColumnSort): string {
  if (!sort) return 'Original order';
  if (sort.column === 'type') return `${types[sort.step]} first`;
  if (sort.column === 'status') return `${statuses[sort.step]} first`;
  return sort.step === 0 ? 'Ascending' : 'Descending';
}

export function serviceAddress(estimate: EstimateWithId): string {
  return [estimate.serviceAddress, estimate.serviceAddress2,
    [estimate.serviceCity, estimate.serviceState, estimate.serviceZipCode].filter(Boolean).join(' ')
  ].filter(Boolean).join(', ');
}

/** Sort a copy of the baseline order; ties retain that order and blanks stay last. */
export function sortEstimateColumns(estimates: EstimateWithId[], sort: ColumnSort): EstimateWithId[] {
  if (!sort) return estimates;
  const direction = sort.step === 0 ? 1 : -1;
  const compareText = (a: string | undefined, b: string | undefined, natural = false) => {
    const left = a?.trim() || '';
    const right = b?.trim() || '';
    if (!left || !right) return left ? -1 : right ? 1 : 0;
    return (natural ? naturalOrder : textOrder).compare(left, right) * direction;
  };
  const groupRank = (value: string, groups: string[]) => {
    const index = groups.indexOf(value);
    return index < 0 ? groups.length : (index - sort.step + groups.length) % groups.length;
  };
  return [...estimates].sort((a, b) => {
    switch (sort.column) {
      case 'customer': return compareText(a.customerName, b.customerName);
      case 'address': return compareText(serviceAddress(a), serviceAddress(b));
      case 'document': {
        const group = (item: EstimateWithId) => item.estimateState === 'invoice' ? 1 : item.estimateState === 'change-order' ? 2 : 0;
        return group(a) - group(b) || compareText(
          a.estimateState === 'invoice' ? a.invoiceNumber : a.estimateNumber,
          b.estimateState === 'invoice' ? b.invoiceNumber : b.estimateNumber, true);
      }
      case 'po': {
        const prefix = (value: string) => value.match(/^[a-z]+/i)?.[0] || '';
        if (!a.poNumber?.trim() || !b.poNumber?.trim()) return compareText(a.poNumber, b.poNumber);
        const left = a.poNumber.trim();
        const right = b.poNumber.trim();
        return textOrder.compare(prefix(left), prefix(right)) || compareText(left, right, true);
      }
      case 'type': return groupRank(a.estimateState, types) - groupRank(b.estimateState, types);
      case 'status': return groupRank(a.clientState || 'draft', statuses) - groupRank(b.clientState || 'draft', statuses);
      case 'total': return ((a.total ?? 0) - (b.total ?? 0)) * direction;
      case 'date': {
        const left = Date.parse(a.createdDate || a.createdAt || '');
        const right = Date.parse(b.createdDate || b.createdAt || '');
        if (!Number.isFinite(left)) return Number.isFinite(right) ? 1 : 0;
        if (!Number.isFinite(right)) return -1;
        return (left - right) * direction;
      }
    }
  });
}
