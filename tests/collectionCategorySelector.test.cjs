const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = ts.createSourceFile('selector.tsx', fs.readFileSync('src/pages/collections/components/CollectionCategorySelector.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const declarations = new Map();
function visit(node) {
  if (ts.isVariableDeclaration(node)) declarations.set(node.name.getText(source), node.initializer);
  ts.forEachChild(node, visit);
}
visit(source);
const helpers = ['nodeKey', 'parentLevels', 'parentKey'].map(name => `const ${name} = ${declarations.get(name).getText(source)};`).join('\n');
function handler(name, bindings) {
  bindings = {...bindings};
  delete bindings[name];
  const code = ts.transpileModule(`${helpers}\nconst ${name} = ${declarations.get(name).getText(source)};`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return new Function(...Object.keys(bindings), `${code}\nreturn ${name};`)(...Object.values(bindings));
}
function fixture(contentType = 'products') {
  const type = {id:'7', name:'Cement type', level:'type', parentId:'7', children:[]};
  const cement = {id:'7', name:'Cements', level:'subcategory', parentId:'7', children:[], isExpanded:false};
  const adapter = {id:'8', name:'Adapter', level:'subcategory', parentId:'7', children:[{...type, parentId:'8'}], isExpanded:true};
  const cpvc = {id:'7', name:'CPVC', level:'category', parentId:'7', children:[adapter,cement], isExpanded:true};
  const section = {id:'7', name:'Plastic Fittings', level:'section', parentId:'7', children:[cpvc], isExpanded:true};
  const trade = {id:'7', name:'Plumbing', level:'trade', children:[section], isExpanded:true};
  const state = {categoryTree:[trade], selectedItems:new Set(), contentType, userId:'owner', error:null};
  const bindings = {
    ...state,
    setCategoryTree(update) {state.categoryTree = update(state.categoryTree); bindings.categoryTree = state.categoryTree;},
    setSelectedItems(update) {state.selectedItems = typeof update === 'function' ? update(state.selectedItems) : update; bindings.selectedItems = state.selectedItems;},
    setError(error) {state.error = error;},
    getMaxLevel: () => ({products:'type',labor:'category',tools:'subcategory',equipment:'subcategory'})[contentType],
    loadChildrenData: async () => [],
  };
  for (const name of ['updateNodeChildren','findNode','findNodeInTree','getAllDescendantIds','getAllDescendantIdsRecursive','buildNodeMap','getAncestorChainFromMap']) bindings[name] = handler(name, bindings);
  const run = (name, extras = {}) => handler(name, {...bindings, ...extras});
  return {state, bindings, run, cpvc, cement, adapter, section, trade};
}
test('opening Cements with the same ID as every ancestor keeps CPVC children visible', async () => {
  const f = fixture();
  await f.run('toggleExpand')(f.cement);
  const cpvc = f.state.categoryTree[0].children[0].children[0];
  assert.deepEqual(cpvc.children.map(n=>n.name), ['Adapter','Cements']);
  assert.equal(cpvc.children[1].isExpanded, true);
  assert.equal(cpvc.isExpanded, true);
});
test('refreshing CPVC siblings preserves expanded and loaded descendant branches', () => {
  const f = fixture();
  f.bindings.updateNodeChildren(f.cpvc, [{...f.adapter, children:[], isExpanded:false}, f.cement, {id:'9',name:'Bushing',level:'subcategory',parentId:'7',children:[]}]);
  const children = f.state.categoryTree[0].children[0].children[0].children;
  assert.equal(children.length,3);
  assert.equal(children[0].isExpanded,true);
  assert.equal(children[0].children[0].name,'Cement type');
});
test('lookup distinguishes identical IDs at all five levels', () => {
  const f = fixture();
  for (const level of ['trade','section','category','subcategory','type']) {
    assert.equal(f.bindings.findNode(f.state.categoryTree,'7',level).level, level);
  }
});
test('selection of Cements does not select its identically numbered ancestors', async () => {
  const f = fixture();
  await f.run('toggleSelect')(f.cement);
  assert.deepEqual([...f.state.selectedItems],['subcategory:7']);
  const counts = f.run('getSelectionCounts')();
  assert.deepEqual(counts,{trades:0,sections:0,categories:0,subcategories:1,types:0});
  const selection = f.run('buildSelection')();
  assert.equal(selection.trade,'Plumbing');
  assert.equal(selection.categories.length,0);
  assert.equal(selection.subcategories[0].categoryName,'CPVC');
  assert.equal(selection.subcategories[0].sectionName,'Plastic Fittings');
});
test('selecting and deselecting a parent includes only its own branch', async () => {
  const f = fixture();
  await f.run('toggleSelect')(f.cpvc);
  assert.deepEqual([...f.state.selectedItems].sort(),['category:7','subcategory:7','subcategory:8','type:7']);
  const selection=f.run('buildSelection')();
  assert.equal(selection.categories.length,1);
  assert.equal(selection.subcategories.length,0);
  assert.equal(selection.types.length,0);
  await f.run('toggleSelect')(f.cpvc);
  assert.equal(f.state.selectedItems.size,0);
});
test('failed expansion is retryable and preserves the other branches', async () => {
  const f = fixture();
  await f.run('toggleExpand',{loadChildrenData:async()=>{throw Error('offline');}})(f.cement);
  const cpvc=f.state.categoryTree[0].children[0].children[0];
  assert.equal(cpvc.children.length,2);
  assert.equal(cpvc.children[1].isLoading,false);
  assert.equal(cpvc.children[1].isExpanded,false);
  assert.match(f.state.error,/Failed to load/);
});
test('unchecking two subcategories after selecting a trade saves only the remaining branch', async () => {
  const f = fixture();
  const excluded = {id:'9', name:'Bushing', level:'subcategory', parentId:'7', children:[]};
  f.cpvc.children.push(excluded);
  await f.run('toggleSelect')(f.trade);
  await f.run('toggleSelect')(f.cement);
  await f.run('toggleSelect')(excluded);
  assert.deepEqual([...f.state.selectedItems].sort(), ['subcategory:8', 'type:7']);
  const selection = f.run('buildSelection')();
  assert.equal(selection.sections.length, 0);
  assert.equal(selection.categories.length, 0);
  assert.deepEqual(selection.subcategories.map(n => n.name), ['Adapter']);
  assert.equal(selection.types.length, 0);
});
test('unchecking a type removes broad parent selections and rechecking a category selects its whole branch', async () => {
  const f = fixture();
  await f.run('toggleSelect')(f.cpvc);
  await f.run('toggleSelect')(f.adapter.children[0]);
  assert.deepEqual([...f.state.selectedItems], ['subcategory:7']);
  const selection = f.run('buildSelection')();
  assert.equal(selection.categories.length, 0);
  assert.deepEqual(selection.subcategories.map(n => n.name), ['Cements']);
  await f.run('toggleSelect')(f.cpvc);
  assert.equal(f.run('buildSelection')().categories.length, 1);
});
test('failed child API response is rejected rather than converted to an empty branch', async () => {
  const f = fixture();
  const load=f.run('loadChildrenData',{getProductTypes:async()=>({success:false,error:'offline'}),console:{error(){}}});
  await assert.rejects(load(f.cement),/offline/);
});
for (const contentType of ['products','labor','tools','equipment']) {
  test(`${contentType} creation resolves the parent level and retains raw API IDs`, async () => {
    const f = fixture(contentType);
    const level=contentType==='labor'?'category':'subcategory';
    let args;
    const service={products:'addProductSubcategory',labor:'addLaborCategory',tools:'addToolSubcategory',equipment:'addEquipmentSubcategory'}[contentType];
    await f.run('handleAddNewItem',{
      newItemName:'Bushing',addingNewItem:{level,parentId:'7'},
      [service]:async(...values)=>{args=values;return {success:true};},
      loadChildrenData:async node=> {assert.equal(node.level, contentType==='labor'?'section':'category'); return node.children;},
      setNewItemName(){},
    })();
    assert.deepEqual(args, contentType==='products'?['Bushing','7','owner']:contentType==='labor'?['Bushing','7','7','owner']:['Bushing','7','7','7','owner']);
    assert.equal(f.state.error,null);
  });
}
test('adding a product type refreshes Cements rather than identically numbered CPVC', async () => {
  const f=fixture();
  let parent;
  await f.run('handleAddNewItem',{
    newItemName:'Primer', addingNewItem:{level:'type',parentId:'7'},
    addProductType:async(...args)=>{assert.deepEqual(args,['Primer','7','owner']);return {success:true};},
    loadChildrenData:async node=>{parent=node;return [{id:'9',name:'Primer',level:'type',parentId:'7',children:[]}];},
    setNewItemName(){},
  })();
  assert.equal(parent.name,'Cements');
  const cpvc=f.state.categoryTree[0].children[0].children[0];
  assert.deepEqual(cpvc.children.map(n=>n.name),['Adapter','Cements']);
  assert.equal(cpvc.children[1].children[0].name,'Primer');
});
test('failed recursive selection leaves the previous selection intact', async () => {
  const f=fixture();
  const recursive=f.run('getAllDescendantIdsRecursive',{loadChildrenData:async()=>{throw Error('offline');}});
  await f.run('toggleSelect',{getAllDescendantIdsRecursive:recursive})(f.cement);
  assert.equal(f.state.selectedItems.size,0);
  assert.match(f.state.error,/Failed to select/);
});

test('search finds collapsed descendants case-insensitively and expands only their parent paths', () => {
  const f = fixture();
  f.trade.isExpanded = false;
  f.cpvc.isExpanded = false;
  const result = f.run('searchCategoryTree')(f.state.categoryTree, '  cEmEnTs  ');
  assert.deepEqual([...result.matchedNodeIds], ['subcategory:7']);
  assert.deepEqual([...result.pathsToExpand], ['trade:7', 'section:7', 'category:7']);
  assert.equal(f.trade.isExpanded, false);
  assert.equal(f.cpvc.isExpanded, false);
  assert.equal(f.state.selectedItems.size, 0);
});

test('search handles missing matches and whitespace without changing the hierarchy', () => {
  const f = fixture();
  const search = f.run('searchCategoryTree');
  for (const query of ['no such category', '   ', '']) {
    const result = search(f.state.categoryTree, query);
    assert.equal(result.matchedNodeIds.size, 0);
    assert.equal(result.pathsToExpand.size, 0);
  }
  assert.equal(f.cpvc.children.length, 2);
});
