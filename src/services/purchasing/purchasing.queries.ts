import { purchasingRequest, fromApi, type DatabaseResult } from './purchasing.api';
import type { PurchaseOrderWithId, PurchaseOrderFilters, PurchaseOrderStats } from './purchasing.types';
export async function getAllPurchaseOrders(filters?: PurchaseOrderFilters): Promise<DatabaseResult<PurchaseOrderWithId[]>> {
  try {
    const rows: PurchaseOrderWithId[] = [];
    for (let offset = 0; ; offset += 100) {
      const page = await purchasingRequest<any>(`/purchase-orders?limit=100&offset=${offset}${filters?.estimateId ? `&estimateId=${encodeURIComponent(filters.estimateId)}` : ''}`);
      rows.push(...page.purchaseOrders.map(fromApi));
      if (offset + page.purchaseOrders.length >= page.pagination.total || !page.purchaseOrders.length) break;
    }
    const statuses = filters?.status ? (Array.isArray(filters.status) ? filters.status : [filters.status]) : null;
    const result = rows.filter(po => (!statuses || statuses.includes(po.status)) && (!filters?.supplier || po.supplier === filters.supplier)
      && (!filters?.dateFrom || (po.orderDate ?? '') >= filters.dateFrom) && (!filters?.dateTo || (po.orderDate ?? '') <= filters.dateTo)
      && (!filters?.searchTerm || `${po.poNumber} ${po.estimateNumber} ${po.supplier}`.toLowerCase().includes(filters.searchTerm.toLowerCase())));
    const field = filters?.sortBy ?? 'createdAt'; const direction = filters?.sortOrder === 'asc' ? 1 : -1;
    result.sort((a, b) => direction * (field === 'total' ? a.total - b.total : String(a[field] ?? '').localeCompare(String(b[field] ?? ''))));
    return { success: true, data: result };
  } catch (error) { return { success: false, error }; }
}
export async function getPurchaseOrderById(id: string): Promise<DatabaseResult<PurchaseOrderWithId>> {
  try { return { success: true, data: fromApi(await purchasingRequest(`/purchase-orders/${encodeURIComponent(id)}`)) }; }
  catch (error) { return { success: false, error }; }
}
export const getPurchaseOrdersByEstimate = (estimateId: string) => getAllPurchaseOrders({ estimateId });
export async function getPurchaseOrdersByProduct(productId: string) {
  const result = await getAllPurchaseOrders();
  return { ...result, data: result.data?.filter(po => po.items.some(i => i.type === 'product' && i.productId === productId)) };
}
export const getPendingPurchaseOrders = () => getAllPurchaseOrders({ status: ['pending', 'ordered', 'partially-received'] });
export async function getRecentPurchaseOrders(count = 10) { const result = await getAllPurchaseOrders(); return { ...result, data: result.data?.slice(0, count) }; }
export function computePurchaseOrderStats(pos: PurchaseOrderWithId[]): PurchaseOrderStats {
  return { totalPOs: pos.length, pendingCount: pos.filter(p => p.status === 'pending').length,
    orderedCount: pos.filter(p => p.status === 'ordered' || p.status === 'partially-received').length, receivedCount: pos.filter(p => p.status === 'received').length,
    totalValue: pos.filter(p => p.status !== 'cancelled').reduce((s,p) => s+p.total,0),
    cancelledValue: pos.filter(p => p.status === 'cancelled').reduce((s,p) => s+p.total,0),
    actualReceiptCost: pos.reduce((s,p) => s+(p.actualTotal ?? 0),0),
    pendingValue: pos.filter(p => p.status === 'ordered' || p.status === 'partially-received').reduce((s,p) => s+p.items.reduce((n,i) => n+Math.max(i.quantityOrdered-i.quantityReceived,0)*i.unitPrice,0),0) };
}
export async function getPurchaseOrderStats(): Promise<DatabaseResult<PurchaseOrderStats>> {
  const result = await getAllPurchaseOrders(); return result.success ? { success: true, data: computePurchaseOrderStats(result.data!) } : result;
}
export function subscribeToPurchaseOrders(callback: (pos: PurchaseOrderWithId[]) => void, filters?: PurchaseOrderFilters, onError?: (error: unknown) => void) {
  let active = true; let running = false;
  const refresh = async () => { if (running) return; running = true; try { const result = await getAllPurchaseOrders(filters); if (active) { if (result.success) callback(result.data!); else onError?.(result.error); } } finally { running = false; } };
  void refresh(); const interval = window.setInterval(refresh, 15000); window.addEventListener('purchasing-changed', refresh);
  return () => { active = false; window.clearInterval(interval); window.removeEventListener('purchasing-changed', refresh); };
}
