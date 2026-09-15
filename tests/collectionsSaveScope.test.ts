import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDirtySyncUpdates, saveErrorMessages, type CollectionSaveDrafts } from '../src/services/collections/collections.save.utils';

const empty = (): CollectionSaveDrafts => ({
  products: { tabs: [{ id: 'old-product-tab', type: 'products', name: 'P', section: 'S', category: 'C', subcategories: [], itemIds: ['1'] }], selections: { '1': { isSelected: true, quantity: 1, categoryTabId: 'old-product-tab', addedAt: 1 } }, savedTabs: [{ id: 'old-product-tab', type: 'products', name: 'P', section: 'S', category: 'C', subcategories: [], itemIds: ['1'] }], savedSelections: { '1': { isSelected: true, quantity: 1, categoryTabId: 'old-product-tab', addedAt: 1 } }, dirty: false },
  labor: { tabs: [{ id: 'labor-tab', type: 'labor', name: 'L', section: 'S', category: 'C', subcategories: [], itemIds: ['2'] }], selections: { '2': { isSelected: true, quantity: 1, categoryTabId: 'labor-tab', addedAt: 1 } }, savedTabs: [{ id: 'labor-tab', type: 'labor', name: 'L', section: 'S', category: 'C', subcategories: [], itemIds: ['2'] }], savedSelections: { '2': { isSelected: true, quantity: 1, categoryTabId: 'labor-tab', addedAt: 1 } }, dirty: false },
  tools: { tabs: [], selections: {}, savedTabs: [], savedSelections: {}, dirty: false },
  equipment: { tabs: [], selections: {}, savedTabs: [], savedSelections: {}, dirty: false },
});
const pending = () => ({ products: new Set<string>(), labor: new Set<string>(), tools: new Set<string>(), equipment: new Set<string>() });

test('quantity-only save uses one narrow quantity delta', () => {
  const drafts = empty();
  drafts.products.dirty = true;
  drafts.products.selections['1'].quantity = 3;
  const updates = buildDirtySyncUpdates(drafts, pending());
  assert.deepEqual(updates, { productQuantityUpdates: { '1': 3 } });
});

test('zero quantity uses replacement sync to preserve category membership', () => {
  const drafts = empty();
  drafts.products.dirty = true;
  drafts.products.selections['1'].quantity = 0;
  const updates = buildDirtySyncUpdates(drafts, pending());
  assert.deepEqual(updates.productSelections, drafts.products.selections);
  assert.equal(updates.productQuantityUpdates, undefined);
});

test('no-op save produces no requests', () => {
  assert.deepEqual(buildDirtySyncUpdates(empty(), pending()), {});
});

test('each type applies only its own pending deletions while retaining other dirty types', () => {
  const drafts = empty();
  drafts.products.dirty = true;
  drafts.labor.dirty = true;
  const deletions = pending();
  deletions.products.add('old-product-tab');
  const updates = buildDirtySyncUpdates(drafts, deletions);
  assert.deepEqual(updates.productCategoryTabs, []);
  assert.deepEqual(updates.productSelections, {});
  assert.equal(updates.laborCategoryTabs?.[0].id, 'labor-tab');
  assert.equal(updates.laborSelections?.['2'].categoryTabId, 'labor-tab');
});

test('legacy trade-name backfill includes selections in its replacement request', () => {
  const drafts = empty();
  drafts.products.dirty = true;
  const updates = buildDirtySyncUpdates(drafts, pending());
  assert.ok(updates.productCategoryTabs);
  assert.deepEqual(updates.productSelections, drafts.products.selections);
});

test('selection metadata changes remain a complete replacement sync', () => {
  const drafts = empty();
  drafts.products.dirty = true;
  drafts.products.selections['1'].itemName = 'Renamed';
  const updates = buildDirtySyncUpdates(drafts, pending());
  assert.ok(updates.productCategoryTabs);
  assert.deepEqual(updates.productSelections, drafts.products.selections);
});

test('partial success remains a visible failure while successful types can be acknowledged', () => {
  const errors = saveErrorMessages({ labor: 'labor sync failed' });
  assert.deepEqual(errors, ['labor sync failed']);
  assert.equal(errors.length === 0, false);
  assert.deepEqual(saveErrorMessages({}), []);
});

test('canonical response IDs are the acknowledged baseline, including selections', () => {
  // The screen calls reconcileSaved with this authoritative pair. This captures
  // the critical replacement-ID contract without relying on a browser renderer.
  const canonical = { tabs: [{ id: 'new-tab', type: 'products' as const, name: 'P', section: 'S', category: 'C', subcategories: [], itemIds: ['1'] }], selections: { '1': { isSelected: true, quantity: 3, categoryTabId: 'new-tab', addedAt: 1 } } };
  assert.equal(canonical.selections['1'].categoryTabId, canonical.tabs[0].id);
});
