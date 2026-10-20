const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const path = 'src/pages/estimates/components/estimateDashboard/estimateTab/InventoryPickerModal.tsx';
const source = ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function handler(name, bindings) {
  let initializer;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) initializer = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source);
  const code = ts.transpileModule(`const handler = ${initializer.getText(source)};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return new Function(...Object.keys(bindings), `${code}\nreturn handler;`)(...Object.values(bindings));
}
test('product picker sends hierarchy IDs and preserves every returned result', async () => {
  const filters = { trade: '1', section: '2', category: '3', subcategory: '4', type: '', size: '' };
  const products = Array.from({length: 55}, (_, id) => ({id: String(id), name: 'Coupling'}));
  let received, items;
  const load = handler('loadItems', {
    selectedType: 'product', currentUser: {uid: 'user'}, filters,
    loadRequest: {current: 0}, setIsLoading() {},
    getProducts: async args => { received = args; return {success: true, data: products}; },
    setItems: value => {items = value;}, extractProductFilterOptions() {},
  });
  await load();
  assert.deepEqual(received, {tradeId:'1', sectionId:'2', categoryId:'3', subcategoryId:'4', typeId:undefined, sizeId:undefined});
  assert.equal(items.length, 55);
});
test('duplicate hierarchy names retain their distinct IDs within the selected parent', () => {
  let options;
  const extract = handler('extractProductFilterOptions', {
    filters: {trade:'1', section:'2', category:'3', subcategory:'', type:'', size:''},
    sortByName: values => values.sort((a,b) => a.name.localeCompare(b.name)),
    setFilterOptions: update => {options = update({});},
  });
  extract([
    {tradeId:'1',sectionId:'2',categoryId:'3',subcategoryId:'4',subcategory:'Coupling'},
    {tradeId:'1',sectionId:'2',categoryId:'9',subcategoryId:'10',subcategory:'Coupling'},
  ]);
  assert.deepEqual(options.subcategories, [{id:'4',name:'Coupling'}]);
});
