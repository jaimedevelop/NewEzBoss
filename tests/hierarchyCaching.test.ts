import assert from 'node:assert/strict';
import test from 'node:test';
import { BoundedRequestCache } from '../src/services/categories/boundedRequestCache';
import { matchesHierarchicalSelection } from '../src/utils/categoryMatching';
import { getCachedProducts, getProductCacheGeneration, invalidateCache, setCachedProducts } from '../src/utils/productCache';

test('coalesces matching hierarchy requests and retries after a failure', async () => {
  const cache = new BoundedRequestCache<string[]>(4, 60_000);
  let calls = 0;
  const load = async () => { calls += 1; return ['row']; };
  assert.deepEqual(await Promise.all([cache.get('user|product|category|1', load), cache.get('user|product|category|1', load)]), [['row'], ['row']]);
  assert.equal(calls, 1);
  const rejected = new BoundedRequestCache<string[]>(4, 60_000);
  await assert.rejects(rejected.get('key', async () => { throw new Error('temporary'); }));
  assert.deepEqual(await rejected.get('key', load), ['row']);
  assert.equal(calls, 2);
});

test('clear prevents a pre-clear hierarchy response from being cached', async () => {
  const cache = new BoundedRequestCache<string[]>(4, 60_000);
  let resolve!: (value: string[]) => void;
  const pending = cache.get('old-user|product|category|1', () => new Promise(r => { resolve = r; }));
  cache.clear();
  resolve(['old']);
  await pending;
  let calls = 0;
  await cache.get('old-user|product|category|1', async () => { calls += 1; return ['fresh']; });
  assert.equal(calls, 1);
});

test('product collection cache is owner-scoped and ignores writes from a cleared session', () => {
  invalidateCache();
  const before = getProductCacheGeneration();
  setCachedProducts([{ id: '9', name: 'same-name', sku: '', trade: '', section: '', category: '', subcategory: '', type: '', description: '', unit: '', unitPrice: 0, onHand: 0, assigned: 0, available: 0, minStock: 0, maxStock: 0, supplier: '', location: '', lastUpdated: '' }], 'owner-a', before);
  assert.equal(getCachedProducts(['9'], 'owner-b').missingIds.length, 1);
  invalidateCache();
  setCachedProducts([{ id: '9', name: 'stale', sku: '', trade: '', section: '', category: '', subcategory: '', type: '', description: '', unit: '', unitPrice: 0, onHand: 0, assigned: 0, available: 0, minStock: 0, maxStock: 0, supplier: '', location: '', lastUpdated: '' }], 'owner-a', before);
  assert.equal(getCachedProducts(['9'], 'owner-a').missingIds.length, 1);
});

test('hierarchical matching uses IDs when duplicate category names have different parents', () => {
  const selection: any = { trade: '', sections: [], categories: [{ name: 'Fixtures', categoryId: '20', sectionId: '2', tradeId: '1', sectionName: 'Kitchen', tradeName: 'Plumbing' }], subcategories: [], types: [] };
  const matching = { tradeId: '1', trade: 'Plumbing', sectionId: '2', section: 'Kitchen', categoryId: '20', category: 'Fixtures' };
  const duplicateUnderOtherParent = { tradeId: '1', trade: 'Plumbing', sectionId: '3', section: 'Bath', categoryId: '21', category: 'Fixtures' };
  assert.equal(matchesHierarchicalSelection(matching, selection), true);
  assert.equal(matchesHierarchicalSelection(duplicateUnderOtherParent, selection), false);
});
