import type { ProcurementPreview } from './purchasing.inventory';

export function materialsStatus(preview: ProcurementPreview): string {
  if (preview.workOrderStatus === 'completed') return 'Job complete';
  if (preview.workOrderStatus === 'cancelled') return 'Job cancelled';
  if (preview.unresolved.length || preview.unsupportedProcurement.length) return 'Needs review';
  const lines = [...preview.stockedRequirements, ...preview.orderRequirements];
  const orders = preview.purchaseOrders.filter(po => po.status !== 'cancelled');
  if (preview.poNeeded) {
    if (orders.length) return 'Additional purchase required';
    return lines.some(line => line.issuedQuantity > 0 || line.available > 0)
      ? 'Partial purchase required' : 'Purchase required';
  }
  if (lines.some(line => line.ownOutstandingOrder > 0)) {
    if (orders.some(po => po.status === 'draft')) return 'Purchase order drafted';
    return orders.some(po => po.status === 'partially_received') ? 'Partially received' : 'Awaiting materials';
  }
  return lines.length && lines.every(line => line.issuedQuantity + line.reservedQuantity >= line.required)
    ? 'Materials ready' : 'No purchase required';
}

