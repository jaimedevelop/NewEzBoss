import { invalidateCache } from '../../utils/productCache';
import { purchasingRequest, fromApi, draftInput, retryKey, changed, type DatabaseResult } from './purchasing.api';
import type { PurchaseOrder, PurchaseOrderData, PurchaseOrderStatus, ReceiveItemData } from './purchasing.types';
export const generatePONumber = async (): Promise<string> => { throw new Error('PO numbers are allocated by the server when saved'); };
export async function createPurchaseOrder(data: PurchaseOrderData): Promise<DatabaseResult<string>> {
  const body = { ...draftInput(data), estimateId: data.estimateId || null };
  const key = retryKey('create', body);
  try {
    const result = await purchasingRequest<any>('/purchase-orders', { method: 'POST', body: JSON.stringify({ ...body, idempotencyKey: key.value }) });
    key.clear(); changed(); return { success: true, data: result.id };
  } catch (error) { return { success: false, error }; }
}
export async function updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): Promise<DatabaseResult> {
  if (!updates.version) return { success: false, error: 'Refresh this purchase order before editing' };
  try {
    const result = await purchasingRequest<any>(`/purchase-orders/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ ...draftInput(updates), version: updates.version }) });
    changed(); return { success: true, data: fromApi(result) };
  } catch (error) { return { success: false, error }; }
}
async function action(id: string, name: string): Promise<DatabaseResult> {
  try { const result = await purchasingRequest<any>(`/purchase-orders/${encodeURIComponent(id)}/${name}`, { method: 'POST', body: '{}' }); changed(); return { success: true, data: fromApi(result) }; }
  catch (error) { return { success: false, error }; }
}
export const updatePOStatus = (id: string, status: PurchaseOrderStatus): Promise<DatabaseResult> =>
  status === 'ordered' ? action(id, 'submit') : status === 'cancelled' ? action(id, 'cancel') : Promise.resolve({ success: false, error: 'Use the receipt workflow to receive an order' });
export const cancelPurchaseOrder = (id: string, _reason?: string) => action(id, 'cancel');
export async function markPOAsReceived(id: string, items: ReceiveItemData[], supplier?: string): Promise<DatabaseResult> {
  const body = { items, supplier }; const key = retryKey(`receipt:${id}`, body);
  try {
    const result = await purchasingRequest<any>(`/purchase-orders/${encodeURIComponent(id)}/receipts`, { method: 'POST', body: JSON.stringify({ ...body, idempotencyKey: key.value }) });
    key.clear(); invalidateCache(); changed(); window.dispatchEvent(new Event('inventory-products-changed')); return { success: true, data: fromApi(result) };
  } catch (error) { return { success: false, error }; }
}
export const markItemAsReceived = (id: string, itemId: string, quantityReceived: number, actualUnitPrice: number) => markPOAsReceived(id, [{ itemId, quantityReceived, actualUnitPrice }]);
export async function deletePurchaseOrder(id: string): Promise<DatabaseResult> {
  try { await purchasingRequest(`/purchase-orders/${encodeURIComponent(id)}`, { method: 'DELETE' }); changed(); return { success: true }; }
  catch (error) { return { success: false, error }; }
}
export async function generateForEstimate(id: string): Promise<DatabaseResult<any>> {
  try { const row = await purchasingRequest<any>(`/purchase-orders/generate-from-estimate/${encodeURIComponent(id)}`, { method: 'POST', body: '{}' }); changed(); return { success: true, data: row.id ? fromApi(row) : null }; }
  catch (error) { return { success: false, error }; }
}
