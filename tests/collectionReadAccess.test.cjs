const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, dependencies) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, console, require: dependencies });
  return exports;
}

test('collection scope is sent on every bounded inventory batch', async () => {
  const urls = [];
  const batch = load('src/services/inventory/batch.ts', () => ({ inventoryApiRequest: async url => { urls.push(url); return []; } }));
  await batch.fetchInventoryBatches('/inventory/products', Array.from({ length: 201 }, (_, i) => String(i + 1)), '12');
  assert.equal(urls.length, 2);
  for (const url of urls) assert.equal(new URL(url, 'https://example.com').searchParams.get('collectionId'), '12');
  urls.length = 0;
  await batch.fetchInventoryBatches('/inventory/products', ['3']);
  assert.equal(new URL(urls[0], 'https://example.com').searchParams.has('collectionId'), false);
});

for (const [kind, file, method] of [
  ['products', 'products/products.queries', 'getProductsByIds'],
  ['labor', 'labor/labor.queries', 'getLaborItemsByIds'],
  ['tools', 'tools/tool.queries', 'getToolsByIds'],
  ['equipment', 'equipment/equipment.queries', 'getEquipmentByIds'],
]) test(`saved ${kind} keep referenced names without hierarchy access`, async () => {
  const calls = [];
  const service = load(`src/services/inventory/${file}.ts`, name => {
    if (name === '../batch') return { fetchInventoryBatches: async (...args) => {
      calls.push(args);
      return [{ id: 3, name: 'Saved item', tradeId: 1, tradeName: 'Plumbing', sectionId: 2, sectionName: 'Fittings', categoryId: 4, categoryName: 'Adapters' }];
    } };
    if (name === '../inventoryApi') return { ApiError: Error, inventoryApiRequest: () => { throw new Error('Unexpected inventory browsing'); } };
    if (name.includes('hierarchyApi')) return { listHierarchy: () => { throw new Error('Unexpected hierarchy browsing'); } };
    return {};
  });
  const result = await service[method](['3'], false, '12');
  assert.equal(result.success, true);
  assert.equal(calls[0][2], '12');
  assert.equal(result.data[0][kind === 'products' ? 'trade' : 'tradeName'], 'Plumbing');
  assert.equal(result.data[0][kind === 'products' ? 'category' : 'categoryName'], 'Adapters');
});
