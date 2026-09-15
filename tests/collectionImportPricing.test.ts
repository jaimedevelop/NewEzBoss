import assert from 'node:assert/strict';
import test from 'node:test';
import {
  convertCollectionToLineItems,
  resolveCollectionImportUnitPrice,
} from '../src/services/estimates/estimates.inventory';

const selection = (overrides: Record<string, unknown> = {}) => ({
  isSelected: true,
  quantity: 1,
  categoryTabId: 'tab-1',
  addedAt: 1,
  ...overrides,
});

test('collection import resolver reads live product, labor, tool, and equipment pricing', () => {
  assert.equal(resolveCollectionImportUnitPrice('products', selection(), {
    priceEntries: [{ id: 'a', store: 'A', price: 0 }, { id: 'b', store: 'B', price: 18 }, { id: 'c', store: 'C', price: 12 }],
    unitPrice: 30,
  } as any), 12);
  assert.equal(resolveCollectionImportUnitPrice('products', selection(), {
    priceEntries: [{ id: 'a', store: 'A', price: 0 }], unitPrice: 30,
  } as any), 30);
  assert.equal(resolveCollectionImportUnitPrice('labor', selection({ rateType: 'hourly', selectedRateId: 'hourly-2' }), {
    flatRates: [{ id: 'flat-1', name: 'Flat', rate: 125 }],
    hourlyRates: [{ id: 'hourly-1', name: 'Junior', skillLevel: '', hourlyRate: 55 }, { id: 'hourly-2', name: 'Senior', skillLevel: '', hourlyRate: 85 }],
  } as any), 85);
  assert.equal(resolveCollectionImportUnitPrice('labor', selection(), {
    flatRates: [{ id: 'flat-1', name: 'Flat', rate: 125 }],
    hourlyRates: [{ id: 'hourly-1', name: 'Junior', skillLevel: '', hourlyRate: 55 }],
  } as any), 125);
  assert.equal(resolveCollectionImportUnitPrice('tools', selection(), { minimumCustomerCharge: 45 } as any), 45);
  assert.equal(resolveCollectionImportUnitPrice('equipment', selection(), { minimumCustomerCharge: 250 } as any), 250);
});

test('collection conversion ignores stale non-zero snapshots and calculates totals from live pricing', () => {
  const collection = {
    id: 'collection-1', name: 'Kitchen',
    productSelections: { p1: selection({ quantity: 2, unitPrice: 999, itemName: 'Product' }) },
    laborSelections: { l1: selection({ quantity: 3, unitPrice: 999, itemName: 'Labor' }) },
    toolSelections: { t1: selection({ quantity: 4, unitPrice: 999, itemName: 'Tool' }) },
    equipmentSelections: { e1: selection({ quantity: 5, unitPrice: 999, itemName: 'Equipment' }) },
  } as any;

  const lineItems = convertCollectionToLineItems(collection, {
    products: { p1: { id: 'p1', priceEntries: [{ id: 'price-1', store: 'Supplier', price: 10 }], unitPrice: 20 } as any },
    labor: { l1: { id: 'l1', flatRates: [{ id: 'flat-1', name: 'Install', rate: 30 }] } as any },
    tools: { t1: { id: 't1', minimumCustomerCharge: 40 } as any },
    equipment: { e1: { id: 'e1', minimumCustomerCharge: 50 } as any },
  });

  assert.deepEqual(lineItems.map(item => [item.type, item.unitPrice, item.total]), [
    ['product', 10, 20],
    ['labor', 30, 90],
    ['tool', 40, 160],
    ['equipment', 50, 250],
  ]);
});
