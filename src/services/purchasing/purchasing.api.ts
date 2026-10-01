import { estimatesApiRequest } from '../estimates/estimatesApi';
import type { PurchaseOrderWithId, PurchaseOrderData } from './purchasing.types';
export interface DatabaseResult<T = any> { success: boolean; data?: T; error?: any; }
export const purchasingRequest = estimatesApiRequest;
export function fromApi(row: any): PurchaseOrderWithId {
  const items = (row.lineItems ?? []).map((line: any) => {
    const received = Number(line.quantityReceived ?? 0);
    return { id: line.id, productId: line.itemId == null ? undefined : String(line.itemId), type: line.itemType,
      productName: line.nameSnapshot, sku: line.skuSnapshot, quantityNeeded: Number(line.quantity), quantityOrdered: Number(line.quantity),
      quantityReceived: received, unitPrice: Number(line.unitPriceSnapshot), totalCost: Number(line.total),
      actualUnitPrice: received && line.actualCost != null ? Number(line.actualCost) / received : undefined,
      isReceived: received >= Number(line.quantity), notInInventory: line.itemType === 'manual' };
  });
  return { ...row, estimateId: row.estimateId == null ? '' : String(row.estimateId), estimateNumber: row.estimateNumber ?? (row.estimateId ? `Estimate ${row.estimateId}` : 'Manual'),
    status: row.status === 'draft' ? 'pending' : row.status === 'partially_received' ? 'partially-received' : row.status,
    supplier: row.vendor ?? '', items, subtotal: Number(row.subtotal), tax: Number(row.tax), total: Number(row.total),
    taxRate: Number(row.subtotal) ? Number(row.tax) / Number(row.subtotal) * 100 : 0,
    orderDate: row.orderedAt?.slice(0,10), receivedDate: row.receivedAt?.slice(0,10) };
}
export function draftInput(data: Partial<PurchaseOrderData>) {
  return { vendor: data.supplier, notes: data.notes, tax: data.tax, workOrderId: data.workOrderId,
    ...(data.items ? { lineItems: data.items.map(item => ({ itemType: item.productId ? item.type ?? 'product' : 'manual',
      itemId: item.productId ? Number(item.productId) : undefined, name: item.productName,
      quantity: item.quantityOrdered, unitPrice: item.unitPrice })) } : {}) };
}
// Persist keys across ambiguous network failures and component remounts. Only
// successful responses clear them. Different payloads never reuse a receipt key.
export function retryKey(scope: string, payload: unknown) {
  const key = `purchasing-retry:${scope}:${JSON.stringify(payload)}`;
  let value = sessionStorage.getItem(key);
  if (!value) { value = crypto.randomUUID(); sessionStorage.setItem(key, value); }
  return { value, clear: () => sessionStorage.removeItem(key) };
}
export const changed = () => window.dispatchEvent(new Event('purchasing-changed'));
