const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

test('product saves resolve repeated names within the selected branch', async () => {
  const rows = {
    trade: [{ id: 1, name: 'Carpentry' }],
    section: [{ id: 2, name: 'Finish Carpentry', tradeId: 1 }],
    category: [
      { id: 3, name: 'Accessories', sectionId: 99 },
      { id: 4, name: 'Accessories', sectionId: 2 },
    ],
    subcategory: [
      { id: 5, name: 'Adhesive', categoryId: 3 },
      { id: 6, name: 'Adhesive', categoryId: 4 },
    ],
  };
  const calls = [];
  const mocks = {
    '../inventoryApi': {
      inventoryApiRequest: async (url, options) => {
        if (!options) {
          assert.equal(url, '/inventory/products/7');
          return { categoryId: 4 };
        }
        calls.push({ method: options.method, body: JSON.parse(options.body) });
        return { id: 7 };
      },
    },
    '../../categories/hierarchyApi': { listHierarchy: async level => rows[level] },
    '../../../utils/productCache': { invalidateCache() {} },
    './products.utils': { validateProductData: () => ({ isValid: true }) },
  };
  const file = path.join(__dirname, '../src/services/inventory/products/products.mutations.ts');
  const { outputText } = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const exports = {};
  new Function('require', 'exports', 'console', outputText)(name => mocks[name], exports, { log() {}, error() {} });

  const data = {
    name: 'Adhesive WA60',
    trade: 'Carpentry',
    section: 'Finish Carpentry',
    category: 'Accessories',
    subcategory: 'Adhesive',
    type: '',
    skus: [{ store: 'Home Depot', sku: '7698769876978' }],
    priceEntries: [{ store: 'Home Depot', price: 45.99 }],
  };

  assert.equal((await exports.createProduct(data)).success, true);
  assert.deepEqual(calls[0], {
    method: 'POST',
    body: {
      name: data.name,
      tradeId: 1,
      sectionId: 2,
      categoryId: 4,
      subcategoryId: 6,
      skus: data.skus,
      priceEntries: data.priceEntries,
    },
  });

  assert.equal((await exports.updateProduct('7', { subcategory: 'Adhesive' })).success, true);
  assert.deepEqual(calls[1], { method: 'PATCH', body: { subcategoryId: 6 } });
});
