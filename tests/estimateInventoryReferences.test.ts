import assert from 'node:assert/strict';
import test from 'node:test';
import {
  convertCollectionToLineItems,
  convertInventoryItemToLineItem,
} from '../src/services/estimates/estimates.inventory';

test('inventory imports attach only the typed product and labor references', () => {
  const product = convertInventoryItemToLineItem({ id: '83', name: 'Product' }, 'product');
  const labor = convertInventoryItemToLineItem({ id: '83', name: 'Labor' }, 'labor');
  const tool = convertInventoryItemToLineItem({ id: '83', name: 'Tool' }, 'tool');
  const equipment = convertInventoryItemToLineItem({ id: '83', name: 'Equipment' }, 'equipment');

  assert.deepEqual([product.productId, product.laborId, product.itemId], ['83', undefined, '83']);
  assert.deepEqual([labor.productId, labor.laborId, labor.itemId], [undefined, '83', '83']);
  assert.deepEqual([tool.productId, tool.laborId, tool.itemId], [undefined, undefined, '83']);
  assert.deepEqual([equipment.productId, equipment.laborId, equipment.itemId], [undefined, undefined, '83']);
});

test('collection imports preserve generic ids and metadata without manufacturing missing references', () => {
  const selected = { isSelected: true, quantity: 2, categoryTabId: 'tab', addedAt: 1 };
  const collection = {
    id: 'collection-83', name: 'Overlapping ids',
    productSelections: { '83': { ...selected, itemName: 'Product' } },
    laborSelections: { '83': { ...selected, itemName: 'Labor' } },
    toolSelections: { '83': { ...selected, itemName: 'Tool' } },
    equipmentSelections: { '83': { ...selected, itemName: 'Equipment' } },
  } as any;

  const lineItems = convertCollectionToLineItems(collection, {
    products: { '83': { id: '83', unitPrice: 10 } as any },
    labor: { '83': { id: '83', flatRates: [{ id: 'rate', rate: 20 }] } as any },
    tools: { '83': { id: '83', minimumCustomerCharge: 30 } as any },
    equipment: { '83': { id: '83', minimumCustomerCharge: 40 } as any },
  });

  assert.deepEqual(lineItems.map(item => [item.type, item.itemId, item.productId, item.laborId, item.collectionId, item.collectionName]), [
    ['product', '83', '83', undefined, 'collection-83', 'Overlapping ids'],
    ['labor', '83', undefined, '83', 'collection-83', 'Overlapping ids'],
    ['tool', '83', undefined, undefined, 'collection-83', 'Overlapping ids'],
    ['equipment', '83', undefined, undefined, 'collection-83', 'Overlapping ids'],
  ]);

  const missing = convertCollectionToLineItems(collection, {});
  assert.deepEqual(missing.map(item => [item.itemId, item.productId, item.laborId, item.unitPrice]), [
    ['83', undefined, undefined, 0],
    ['83', undefined, undefined, 0],
    ['83', undefined, undefined, 0],
    ['83', undefined, undefined, 0],
  ]);
});
