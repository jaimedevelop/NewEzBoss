import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeReplenishmentItems } from '../src/services/purchasing/replenishmentItems';
import type { PurchaseOrderItem } from '../src/services/purchasing/purchasing.types';

const item = (overrides: Partial<PurchaseOrderItem> = {}): PurchaseOrderItem => ({
  id: 'line', productId: '4', type: 'product', productName: 'Fastener',
  quantityNeeded: 2, quantityOrdered: 2, unitPrice: 10, totalCost: 20,
  quantityReceived: 0, isReceived: false, ...overrides,
});

test('repeated checks top up current quantities once and preserve edited prices', () => {
  const current = [item()];
  const shortage = [item({ id: 'incoming', quantityOrdered: 5, quantityNeeded: 5, unitPrice: 12, totalCost: 60 })];
  const merged = mergeReplenishmentItems(current, shortage);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].quantityOrdered, 5);
  assert.equal(merged[0].unitPrice, 10);
  assert.equal(merged[0].totalCost, 50);
  assert.equal(current[0].quantityOrdered, 2);
  assert.deepEqual(mergeReplenishmentItems(merged, shortage), merged);
});

test('overlapping scopes preserve larger quantities and add newly discovered products', () => {
  const current = [item({ quantityOrdered: 9, totalCost: 90 }), item({ id: 'tool', type: 'tool', quantityOrdered: 1, totalCost: 10 })];
  const merged = mergeReplenishmentItems(current, [item({ quantityOrdered: 5 }), item({ id: 'new', productId: '7' })]);
  assert.equal(merged.length, 3);
  assert.equal(merged[0].quantityOrdered, 9);
  assert.equal(merged[1].type, 'tool');
  assert.equal(merged[2].productId, '7');
});

test('a tool with the same numeric ID does not cover a product shortage', () => {
  const merged = mergeReplenishmentItems([item({ type: 'tool' })], [item({ id: 'product' })]);
  assert.equal(merged.length, 2);
});

test('existing split product lines count toward the same replenishment target', () => {
  const merged = mergeReplenishmentItems([item(), item({ id: 'second', quantityOrdered: 3, totalCost: 30 })], [item({ quantityOrdered: 6 })]);
  assert.equal(merged.length, 2);
  assert.equal(merged.reduce((sum, line) => sum + line.quantityOrdered, 0), 6);
});
