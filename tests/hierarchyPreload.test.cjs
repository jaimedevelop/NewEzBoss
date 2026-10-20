const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { build } = require('esbuild');

async function fixture() {
  let owner = 'company-a';
  const calls = [];
  const boundary = {
    getAuthenticatedInventoryOwner: async () => owner,
    inventoryApiRequest: async url => {
      calls.push(url);
      return [{ id: 1, name: 'First', tradeId: 10 }, { id: 2, name: 'Second', tradeId: 20 }];
    },
  };
  const result = await build({
    entryPoints: [path.resolve(__dirname, '../src/services/categories/hierarchyApi.ts')],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    plugins: [{ name: 'api-boundary', setup(builder) {
      builder.onResolve({ filter: /\/inventoryApi$/ }, () => ({ path: 'api', namespace: 'mock' }));
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `
        export const getAuthenticatedInventoryOwner = () => boundary.getAuthenticatedInventoryOwner();
        export const inventoryApiRequest = (...args) => boundary.inventoryApiRequest(...args);
        export class ApiError extends Error {}
      ` }));
    } }],
  });
  const mod = { exports: {} };
  new Function('boundary', 'module', 'exports', result.outputFiles[0].text)(boundary, mod, mod.exports);
  return { api: mod.exports, calls, setOwner(value) { owner = value; } };
}

test('preloading makes every branch including empty branches local and coalesces consumers', async () => {
  const { api, calls } = await fixture();
  await Promise.all([api.preloadHierarchy('product'), api.preloadHierarchy('product')]);
  assert.equal(calls.length, 6);
  assert.ok(calls.every(url => !url.includes('parentId') && url.includes('/hierarchy/')));
  assert.deepEqual((await api.listHierarchy('section', 'product', '10')).map(row => row.id), [1]);
  assert.deepEqual((await api.listHierarchy('section', 'product', '20')).map(row => row.id), [2]);
  assert.deepEqual(await api.listHierarchy('section', 'product', '99'), []);
  assert.equal(calls.length, 6);
});

test('metadata stays scoped to company and item type and invalidation reloads it', async () => {
  const { api, calls, setOwner } = await fixture();
  await api.listHierarchy('section', 'product', '10');
  await api.listHierarchy('section', 'tool', '10');
  assert.equal(calls.length, 2);
  setOwner('company-b');
  await api.listHierarchy('section', 'product', '10');
  assert.equal(calls.length, 3);
  api.invalidateHierarchyCache();
  await api.listHierarchy('section', 'product', '10');
  assert.equal(calls.length, 4);
});
