// src/services/estimates/estimates.inventory.ts

import type { LineItem } from './estimates.types';
import type { Collection, ItemSelection } from '../collections/collections.types';
import type { InventoryProduct } from '../inventory/products/products.types';
import type { LaborItem } from '../inventory/labor/labor.types';
import type { ToolItem } from '../inventory/tools/tool.types';
import type { EquipmentItem } from '../inventory/equipment/equipment.types';
import { getProductsByIds } from '../inventory/products/products.queries';
import { getLaborItemsByIds } from '../inventory/labor/labor.queries';
import { getToolsByIds } from '../inventory/tools/tool.queries';
import { getEquipmentByIds } from '../inventory/equipment/equipment.queries';
import { calculateLaborPricing } from '../collections/labor-pricing';

/**
 * Helper functions for converting inventory items to estimate line items
 */

// Generate unique ID for line items
function generateLineItemId(): string {
  return `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get price from any inventory item type
 */
function getItemPrice(item: any, type: 'product' | 'labor' | 'tool' | 'equipment', strategy: 'min' | 'max' = 'max'): number {
  switch (type) {
    case 'product': {
      if (item.priceEntries && item.priceEntries.length > 0) {
        const prices = item.priceEntries
          .map((entry: any) => entry.price)
          .filter((price: any) => typeof price === 'number' && price > 0);
        if (prices.length > 0) {
          return strategy === 'min' ? Math.min(...prices) : Math.max(...prices);
        }
      }
      return item.unitPrice || 0;
    }
    case 'labor':
      // Take first rate available (flat or hourly)
      return item.flatRates?.[0]?.rate || item.hourlyRates?.[0]?.hourlyRate || 0;
    case 'tool':
    case 'equipment':
      return item.minimumCustomerCharge || 0;
    default:
      return 0;
  }
}

export type CollectionImportInventory = {
  products?: Record<string, InventoryProduct>;
  labor?: Record<string, LaborItem>;
  tools?: Record<string, ToolItem>;
  equipment?: Record<string, EquipmentItem>;
};

type CollectionImportItemType = keyof CollectionImportInventory;

const asFiniteNumber = (value: unknown): number | undefined => {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const positive = (value: unknown): number | undefined => {
  const numberValue = asFiniteNumber(value);
  return numberValue !== undefined && numberValue > 0 ? numberValue : undefined;
};

/**
 * Resolves a collection import price from the current inventory record.
 *
 * Collection selections are presentation snapshots, not estimate prices. This
 * deliberately does not use selection.unitPrice: direct inventory imports
 * already price from the live inventory record, so doing the same here avoids
 * stale (including legacy $0) snapshots producing different estimates.
 */
export function resolveCollectionImportUnitPrice(
  type: CollectionImportItemType,
  selection: Pick<ItemSelection, 'rateType' | 'selectedRateId'>,
  item: InventoryProduct | LaborItem | ToolItem | EquipmentItem | undefined,
): number {
  if (!item) return 0;

  switch (type) {
    case 'products': {
      const entryPrices = (item as InventoryProduct).priceEntries
        ?.map(entry => positive(entry.price))
        .filter((price): price is number => price !== undefined) ?? [];
      if (entryPrices.length > 0) return Math.min(...entryPrices);
      return asFiniteNumber((item as InventoryProduct).unitPrice) ?? 0;
    }
    case 'labor': {
      const labor = item as LaborItem;
      if (selection.selectedClientProfileId || selection.selectedContractorRateId) {
        return calculateLaborPricing(labor, selection).clientTotal;
      }
      const selectedFlatRate = selection.selectedRateId && (selection.rateType !== 'hourly')
        ? labor.flatRates?.find(rate => rate.id === selection.selectedRateId)
        : undefined;
      const selectedHourlyRate = selection.selectedRateId && (selection.rateType !== 'flat')
        ? labor.hourlyRates?.find(rate => rate.id === selection.selectedRateId)
        : undefined;
      // The collection UI's established default is the first flat rate, then
      // the first hourly rate. Preserve that order when no selected rate exists.
      return positive(selectedFlatRate?.rate)
        ?? positive(selectedHourlyRate?.hourlyRate)
        ?? positive(labor.flatRates?.[0]?.rate)
        ?? positive(labor.hourlyRates?.[0]?.hourlyRate)
        ?? 0;
    }
    case 'tools':
    case 'equipment':
      return asFiniteNumber((item as ToolItem | EquipmentItem).minimumCustomerCharge) ?? 0;
  }
}

const selectedIds = (selections: Record<string, ItemSelection>): string[] =>
  Object.entries(selections).filter(([, selection]) => selection.isSelected).map(([id]) => id);

const byId = <T extends { id?: string }>(items: T[]): Record<string, T> =>
  Object.fromEntries(items.filter(item => item.id).map(item => [String(item.id), item]));

/** Fetches current records immediately before a collection becomes estimate line items. */
export async function getCollectionImportInventory(collection: Collection): Promise<CollectionImportInventory> {
  const [products, labor, tools, equipment] = await Promise.all([
    getProductsByIds(selectedIds(collection.productSelections)),
    getLaborItemsByIds(selectedIds(collection.laborSelections)),
    getToolsByIds(selectedIds(collection.toolSelections)),
    getEquipmentByIds(selectedIds(collection.equipmentSelections)),
  ]);

  const failedResult = [products, labor, tools, equipment].find(result => !result.success);
  if (failedResult) {
    throw new Error(typeof failedResult.error === 'string' ? failedResult.error : 'Could not load current inventory pricing.');
  }

  // An unavailable/deleted inventory record cannot be safely repriced from a
  // snapshot. Leave it at $0 rather than silently using stale pricing.
  return {
    products: byId(products.data ?? []),
    labor: byId(labor.data ?? []),
    tools: byId(tools.data ?? []),
    equipment: byId(equipment.data ?? []),
  };
}

/**
 * Get display name for inventory item
 */
function getItemName(item: any): string {
  return item.name || item.description || 'Unnamed Item';
}

/**
 * Convert single inventory item to line item
 */
export function convertInventoryItemToLineItem(
  item: any,
  type: 'product' | 'labor' | 'tool' | 'equipment',
  quantity: number = 1,
  priceStrategy: 'min' | 'max' = 'max'
): LineItem {
  const unitPrice = getItemPrice(item, type, priceStrategy);

  return {
    id: generateLineItemId(),
    type: type,
    itemId: item.id,
    description: getItemName(item),
    quantity: quantity,
    unitPrice: unitPrice,
    total: quantity * unitPrice,
    notes: ''
  };
}

/**
 * Convert collection selections to line items
 */
export function convertCollectionToLineItems(
  collection: Collection,
  inventory: CollectionImportInventory = {},
): LineItem[] {
  const lineItems: LineItem[] = [];

  // Products
  if (collection.productSelections) {
    Object.entries(collection.productSelections).forEach(([id, selection]) => {
      if (selection.isSelected) {
        const unitPrice = resolveCollectionImportUnitPrice('products', selection, inventory.products?.[id]);
        lineItems.push({
          id: generateLineItemId(),
          type: 'product',
          itemId: id,
          description: selection.itemName || '',
          quantity: selection.quantity || 1,
          unitPrice,
          total: (selection.quantity || 1) * unitPrice,
          notes: '',
          collectionId: collection.id,
          collectionName: collection.name
        });
      }
    });
  }

  // Labor
  if (collection.laborSelections) {
    Object.entries(collection.laborSelections).forEach(([id, selection]) => {
      if (selection.isSelected) {
        const unitPrice = resolveCollectionImportUnitPrice('labor', selection, inventory.labor?.[id]);
        const usesClientProfile = Boolean(selection.selectedClientProfileId || selection.selectedContractorRateId);
        lineItems.push({
          id: generateLineItemId(),
          type: 'labor',
          itemId: id,
          description: selection.itemName || '',
          // Pricing profiles are job packages, so worker quantity is not an
          // estimate sale quantity. Legacy rows retain legacy quantity pricing.
          quantity: usesClientProfile ? 1 : selection.quantity || 1,
          unitPrice,
          total: usesClientProfile ? unitPrice : (selection.quantity || 1) * unitPrice,
          notes: '',
          collectionId: collection.id,
          collectionName: collection.name
        });
      }
    });
  }

  // Tools
  if (collection.toolSelections) {
    Object.entries(collection.toolSelections).forEach(([id, selection]) => {
      if (selection.isSelected) {
        const unitPrice = resolveCollectionImportUnitPrice('tools', selection, inventory.tools?.[id]);
        lineItems.push({
          id: generateLineItemId(),
          type: 'tool',
          itemId: id,
          description: selection.itemName || '',
          quantity: selection.quantity || 1,
          unitPrice,
          total: (selection.quantity || 1) * unitPrice,
          notes: '',
          collectionId: collection.id,
          collectionName: collection.name
        });
      }
    });
  }

  // Equipment
  if (collection.equipmentSelections) {
    Object.entries(collection.equipmentSelections).forEach(([id, selection]) => {
      if (selection.isSelected) {
        const unitPrice = resolveCollectionImportUnitPrice('equipment', selection, inventory.equipment?.[id]);
        lineItems.push({
          id: generateLineItemId(),
          type: 'equipment',
          itemId: id,
          description: selection.itemName || '',
          quantity: selection.quantity || 1,
          unitPrice,
          total: (selection.quantity || 1) * unitPrice,
          notes: '',
          collectionId: collection.id,
          collectionName: collection.name
        });
      }
    });
  }

  return lineItems;
}

/**
 * Check if line item is duplicate (same itemId or same description)
 */
export function checkForDuplicates(
  newItem: LineItem,
  existingItems: LineItem[]
): boolean {
  return existingItems.some(item =>
    (item.itemId && item.itemId === newItem.itemId) ||
    (item.description.toLowerCase().trim() === newItem.description.toLowerCase().trim())
  );
}

/**
 * Find all duplicate line items in a list
 */
export function findDuplicateLineItems(lineItems: LineItem[]): Set<string> {
  const duplicates = new Set<string>();
  const seen = new Map<string, string>(); // key -> first line item id

  lineItems.forEach(item => {
    // Create unique key based on itemId or description
    const key = item.itemId || item.description.toLowerCase().trim();

    if (seen.has(key)) {
      // Mark both the original and current as duplicates
      duplicates.add(seen.get(key)!);
      duplicates.add(item.id);
    } else {
      seen.set(key, item.id);
    }
  });

  return duplicates;
}
