import type { PurchaseOrderItem } from './purchasing.types';

// A stock deficit is a target quantity, not an increment. Preserve existing
// prices and larger quantities so repeated/overlapping checks are safe.
export function mergeReplenishmentItems(current: PurchaseOrderItem[], incoming: PurchaseOrderItem[]): PurchaseOrderItem[] {
  const items = [...current];
  for (const candidate of incoming) {
    const matches = items.filter(item => item.productId === candidate.productId && (item.type ?? 'product') === 'product');
    if (!matches.length) { items.push(candidate); continue; }
    const ordered = matches.reduce((sum, item) => sum + item.quantityOrdered, 0);
    const topUp = Math.max(0, candidate.quantityOrdered - ordered);
    if (!topUp) continue;
    const index = items.indexOf(matches[0]);
    const existing = items[index];
    const quantityOrdered = existing.quantityOrdered + topUp;
    items[index] = { ...existing, quantityOrdered, quantityNeeded: Math.max(existing.quantityNeeded, quantityOrdered), totalCost: quantityOrdered * existing.unitPrice };
  }
  return items;
}
