const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { build } = require('esbuild');

// Exercise the real service code while replacing only the authenticated API boundary.
async function service(name, apiMock) {
  const result = await build({
    entryPoints: [path.resolve(__dirname, `../src/services/categories/${name}.ts`)],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    plugins: [{ name: 'mock-api', setup(builder) {
      builder.onResolve({ filter: /\/hierarchyApi$/ }, () => ({ path: 'api', namespace: 'mock' }));
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `
        export const listHierarchy = (...args) => apiMock.listHierarchy(...args);
        export const renameHierarchyNode = (...args) => apiMock.renameHierarchyNode(...args);
        export const deleteHierarchyNode = (...args) => apiMock.deleteHierarchyNode(...args);
        export const getHierarchyUsage = (...args) => apiMock.getHierarchyUsage(...args);
        export const totalItemCount = usage => Object.values(usage.itemCounts).reduce((a,b) => a+b, 0);
        export const errorMessage = (error, fallback) => error instanceof Error ? error.message : fallback;
      ` }));
    } }],
  });
  const mod = { exports: {} };
  new Function('apiMock', 'module', 'exports', result.outputFiles[0].text)(apiMock, mod, mod.exports);
  return mod.exports;
}

for (const [itemType, expected] of [['product', 6], ['labor', 3], ['tool', 4], ['equipment', 4]]) {
  test(`${itemType} fetches each level once with the correct scope`, async () => {
    const calls = [];
    const api = await service('hierarchy', { listHierarchy: async (...args) => {
      calls.push(args);
      return args[0] === 'trade' ? Array.from({ length: 50 }, (_, id) => ({ id, name: `Trade ${id}` })) : [];
    } });
    assert.equal((await api.loadEditorHierarchy(itemType)).length, 50);
    assert.equal(calls.length, expected);
    assert.deepEqual(calls[0], ['trade', undefined]);
    assert.ok(calls.slice(1).every(([, scope]) => scope === itemType));
  });
}

test('child API errors fail the product load instead of returning trades alone', async () => {
  const api = await service('hierarchy', { listHierarchy: async level => {
    if (level === 'section') throw new Error('Forbidden');
    return level === 'trade' ? [{ id: 1, name: 'Plumbing' }] : [];
  } });
  const result = await api.getFullCategoryHierarchy('legacy-user');
  assert.equal(result.success, false);
  assert.equal(result.data, undefined);
  assert.match(result.error, /section.*Forbidden/);
});

test('product management uses SQL node IDs and API usage counts', async () => {
  const calls = [];
  const api = await service('management', {
    renameHierarchyNode: async (...args) => calls.push(['rename', ...args]),
    deleteHierarchyNode: async (...args) => calls.push(['delete', ...args]),
    getHierarchyUsage: async () => ({ descendantCounts: { category: 2, subcategory: 3 }, itemCounts: { inventoryProducts: 7 } }),
  });
  assert.equal((await api.updateCategoryName('42', ' Fixtures ', 'section', 'legacy-user')).success, true);
  assert.equal((await api.deleteCategoryWithChildren('42', 'section', 'legacy-user')).success, true);
  assert.deepEqual(calls, [['rename', 'section', '42', 'Fixtures'], ['delete', 'section', '42']]);
  assert.deepEqual((await api.getCategoryUsageStats('42', 'section', 'legacy-user')).data,
    { categoryCount: 5, productCount: 7, affectedCategories: [] });
  assert.equal((await api.updateCategoryName('42', ' ', 'section', 'legacy-user')).success, false);
  assert.equal(calls.length, 2);
});
