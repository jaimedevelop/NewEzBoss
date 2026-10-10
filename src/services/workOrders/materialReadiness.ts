import { getProcurementPreview } from '../purchasing/purchasing.inventory';
import { getProductsByIds } from '../inventory/products/products.queries';
import { getToolsByIds } from '../inventory/tools/tool.queries';
import { getEquipmentByIds } from '../inventory/equipment/equipment.queries';
import { getAllPurchaseOrders } from '../purchasing/purchasing.queries';
import type { PurchaseOrderWithId } from '../purchasing/purchasing.types';
import type { WorkOrderChecklistItem } from './workOrders.types';

export interface MaterialInventorySnapshot {
  itemId: string;
  found: boolean;
  name?: string;
  imageUrl?: string;
  unit?: string;
  locations: string[];
  available?: number;
  shortage?: number;
  inventoryStatus?: 'available' | 'in-use' | 'maintenance';
}

export interface MaterialReadinessData {
  inventory: Record<string, MaterialInventorySnapshot>;
  purchaseOrders: PurchaseOrderWithId[];
  error?: string;
}

/** Resolves the checklist with bounded batch calls. Never fall back to matching names. */
export async function loadMaterialReadinessData(
  checklist: WorkOrderChecklistItem[],
  workOrderId?: string,
  estimateId?: string,
): Promise<MaterialReadinessData> {
  const idsFor = (type: WorkOrderChecklistItem['type']) => checklist
    .filter(item => item.type === type && item.inventoryItemId)
    .map(item => item.inventoryItemId!);
  const [products, tools, equipment, orders, coverage] = await Promise.all([
    getProductsByIds(idsFor('product')),
    getToolsByIds(idsFor('tool')),
    getEquipmentByIds(idsFor('equipment')),
    workOrderId ? getAllPurchaseOrders({ workOrderId }) : Promise.resolve({ success: true, data: [] as PurchaseOrderWithId[] }),
    estimateId ? getProcurementPreview(estimateId).catch(() => null) : Promise.resolve(null),
  ]);
  const inventory: Record<string, MaterialInventorySnapshot> = {};
  for (const product of products.data ?? []) if (product.id) {
    inventory[`product:${product.id}`] = { itemId: product.id, found: true, name: product.name, imageUrl: product.imageUrl,
      unit: product.unit, locations: product.location ? [product.location] : [], available: product.available };
  }
  if (coverage) for (const requirement of [...coverage.stockedRequirements, ...coverage.orderRequirements]) {
    const item = inventory[`product:${requirement.productId}`];
    if (item) item.available = requirement.available;
  }
  for (const tool of tools.data ?? []) if (tool.id) {
    inventory[`tool:${tool.id}`] = { itemId: tool.id, found: true, name: tool.name, imageUrl: tool.imageUrl,
      locations: tool.location ? [tool.location] : [], inventoryStatus: tool.status };
  }
  for (const equipmentItem of equipment.data ?? []) if (equipmentItem.id) {
    inventory[`equipment:${equipmentItem.id}`] = { itemId: equipmentItem.id, found: true, name: equipmentItem.name, imageUrl: equipmentItem.imageUrl,
      locations: equipmentItem.rentalEntries?.map(entry => [entry.storeName, entry.storeLocation].filter(Boolean).join(' — ')) ?? [], inventoryStatus: equipmentItem.status };
  }
  const failures = [products, tools, equipment, orders].filter(result => !result.success);
  return { inventory, purchaseOrders: orders.data ?? [], error: failures.length ? 'Some inventory or purchase-order details could not be loaded.' : undefined };
}
