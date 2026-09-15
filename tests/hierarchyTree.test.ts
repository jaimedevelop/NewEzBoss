import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHierarchyTree, nodeKey } from '../src/services/categories/hierarchyTree';

test('joins numeric SQL IDs across every level and keeps sizes under trades', () => {
  const tree = buildHierarchyTree({
    trade: [{ id: 1, name: 'Plumbing' }],
    section: [{ id: 1, name: 'Fixtures', tradeId: 1 }],
    category: [{ id: 1, name: 'Sinks', sectionId: 1 }],
    subcategory: [{ id: 1, name: 'Kitchen', categoryId: 1 }],
    type: [{ id: 1, name: 'Undermount', subcategoryId: 1 }],
    size: [{ id: 1, name: 'Large', tradeId: 1 }],
  });
  const trade = tree[0];
  const section = trade.children[0];
  const category = section.children[0];
  const subcategory = category.children[0];
  assert.equal(subcategory.children[0].level, 'type');
  assert.equal(subcategory.children[0].children.length, 0);
  assert.equal(trade.children[1].level, 'size');
  assert.equal(trade.children[1].parentId, '1');
  assert.equal(trade.descendantCount, 5);
  assert.notEqual(nodeKey(trade), nodeKey(section));
  assert.equal((subcategory as any).tradeId, '1');
  assert.equal((subcategory as any).sectionId, '1');
  assert.equal((subcategory as any).categoryId, '1');
});

test('attaches duplicate names to their IDs and preserves API ordering', () => {
  const tree = buildHierarchyTree({
    trade: [{ id: '2', name: 'A' }, { id: '1', name: 'B' }],
    section: [{ id: 10, name: 'Same', tradeId: 1 }, { id: 11, name: 'Same', tradeId: '2' }],
  });
  assert.deepEqual(tree.map(node => node.id), ['2', '1']);
  assert.equal(tree[0].children[0].id, '11');
  assert.equal(tree[1].children[0].id, '10');
});

test('reports broken migration references instead of displaying an incomplete tree', () => {
  assert.throws(() => buildHierarchyTree({
    trade: [{ id: 1, name: 'Plumbing' }],
    section: [{ id: 2, name: 'Fixtures', tradeId: 'old-firestore-id' }],
  }), /its trade is missing/);
});

test('supports empty hierarchies and the shorter labor hierarchy', () => {
  assert.deepEqual(buildHierarchyTree({}), []);
  const tree = buildHierarchyTree({
    trade: [{ id: 1, name: 'Plumbing' }],
    section: [{ id: 2, name: 'Install', tradeId: 1 }],
    category: [{ id: 3, name: 'Fixtures', sectionId: 2 }],
  });
  assert.equal(tree[0].children[0].children[0].children.length, 0);
});
