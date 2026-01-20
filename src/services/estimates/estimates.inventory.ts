// src/services/estimates/estimates.inventory.ts

import type { LineItem } from './estimates.types';

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
function getItemPrice(item: any, type: 'product' | 'labor' | 'tool' | 'equipment'): number {
  switch (type) {
    case 'product':
      return item.priceEntries?.[0]?.price || item.unitPrice || 0;
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
  quantity: number = 1
): LineItem {
  const unitPrice = getItemPrice(item, type);
  
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
  collection: any,
  includeTypes: {
    products: boolean;
    labor: boolean;
    tools: boolean;
    equipment: boolean;
  }
): LineItem[] {
  const lineItems: LineItem[] = [];
  
  // Products
  if (includeTypes.products && collection.productSelections) {
    Object.entries(collection.productSelections).forEach(([id, selection]: [string, any]) => {
      if (selection.isSelected) {
        lineItems.push({
          id: generateLineItemId(),
          type: 'product',
          itemId: id,
          description: selection.itemName || selection.productName || '',
          quantity: selection.quantity || 1,
          unitPrice: selection.unitPrice || 0,
          total: (selection.quantity || 1) * (selection.unitPrice || 0),
          notes: '',
          collectionId: collection.id,
          collectionName: collection.name
        });
      }
    });
  }
  
  // Labor
  if (includeTypes.labor && collection.laborSelections) {
    Object.entries(collection.laborSelections).forEach(([id, selection]: [string, any]) => {
      if (selection.isSelected) {
        lineItems.push({
          id: generateLineItemId(),
          type: 'labor',
          itemId: id,
          description: selection.itemName || '',
          quantity: selection.quantity || 1,
          unitPrice: selection.unitPrice || 0,
          total: (selection.quantity || 1) * (selection.unitPrice || 0),
          notes: '',
          collectionId: collection.id,
          collectionName: collection.name
        });
      }
    });
  }
  
  // Tools
  if (includeTypes.tools && collection.toolSelections) {
    Object.entries(collection.toolSelections).forEach(([id, selection]: [string, any]) => {
      if (selection.isSelected) {
        lineItems.push({
          id: generateLineItemId(),
          type: 'tool',
          itemId: id,
          description: selection.itemName || '',
          quantity: selection.quantity || 1,
          unitPrice: selection.unitPrice || 0,
          total: (selection.quantity || 1) * (selection.unitPrice || 0),
          notes: '',
          collectionId: collection.id,
          collectionName: collection.name
        });
      }
    });
  }
  
  // Equipment
  if (includeTypes.equipment && collection.equipmentSelections) {
    Object.entries(collection.equipmentSelections).forEach(([id, selection]: [string, any]) => {
      if (selection.isSelected) {
        lineItems.push({
          id: generateLineItemId(),
          type: 'equipment',
          itemId: id,
          description: selection.itemName || '',
          quantity: selection.quantity || 1,
          unitPrice: selection.unitPrice || 0,
          total: (selection.quantity || 1) * (selection.unitPrice || 0),
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