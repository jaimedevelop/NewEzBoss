const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Exercise the actual tab handlers without requiring auth or a browser session.
function handler(source, name, bindings) {
  let initializer;
  const visit = node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) initializer = node.initializer;
    ts.forEachChild(node, visit);
  };
  visit(source);
  assert.ok(initializer, name);
  const code = ts.transpileModule(`const handler = ${initializer.getText(source)};`, {
    compilerOptions: {target: ts.ScriptTarget.ES2020},
  }).outputText;
  return new Function(...Object.keys(bindings), `${code}\nreturn handler;`)(...Object.values(bindings));
}

for (const [area, modal] of [['products','productModal'], ['tools','toolModal'], ['equipment','equipmentModal'], ['labor','laborModal']]) {
  test(`${area}: create section then category without option reloads or loading resets`, async () => {
    const path = `src/pages/inventory/${area}/components/${modal}/GeneralTab.tsx`;
    const source = ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let reads = 0;
    const loading = [];
    const fields = {};
    const writes = [];
    const bindings = {
      currentUser: {uid:'user'}, disabled:false,
      localTradeId:'trade-id', selectedTradeId:'trade-id',
      localSectionId:'', selectedSectionId:'', localCategoryId:'',
      sections:[], categories:[], subcategories:[{id:'old-child',name:'Old child'}],
      sectionOptions:[], categoryOptions:[],
      newlyCreatedIds:{current:new Set()},
      console:{log() {}},
      updateField:(key,value) => {fields[key] = value;},
      updateFormData:(key,value) => {fields[key] = value;},
      setIsLoadingUserAction:value => loading.push(value),
      hierarchyLoader:{clearCache() {}, notifyHierarchyChanged() {}, loadDependentData:async () => {reads++; return []; }},
    };
    for (const [setter, state] of [
      ['setSections','sections'], ['setCategories','categories'], ['setSubcategories','subcategories'],
      ['setSectionOptions','sectionOptions'], ['setCategoryOptions','categoryOptions'],
      ['setLocalSectionId','localSectionId'], ['setSelectedSectionId','selectedSectionId'],
      ['setLocalCategoryId','localCategoryId'], ['setLocalSubcategoryId','localSubcategoryId'], ['setTypes','types'],
    ]) bindings[setter] = update => {bindings[state] = typeof update === 'function' ? update(bindings[state]) : update;};
    const prefix = area === 'products' ? 'Product' : area === 'tools' ? 'Tool' : 'Equipment';
    for (const level of ['Section','Category']) {
      const create = area === 'labor' ? `add${level}` : `add${prefix}${level}`;
      const list = area === 'labor' ? `get${level === 'Section' ? 'Sections' : 'Categories'}` : `get${prefix}${level === 'Section' ? 'Sections' : 'Categories'}`;
      bindings[create] = async (...args) => {
        writes.push(args);
        return {success:true, [area === 'products' ? 'id' : 'data']: `${level.toLowerCase()}-id`};
      };
      bindings[list] = async () => {reads++; return {success:true,data:[]};};
    }
    await handler(source, 'handleAddSection', bindings)('New section');
    const section = area === 'labor' ? bindings.sectionOptions[0] : bindings.sections[0];
    assert.equal(section.id || section.value, 'section-id');
    await handler(source, 'handleSectionChange', bindings)(area === 'labor' ? 'section-id' : 'New section');
    assert.equal(bindings.localSectionId || bindings.selectedSectionId, 'section-id');
    assert.equal(reads, 0);
    assert.deepEqual(loading, []);
    await handler(source, 'handleAddCategory', bindings)('New category');
    assert.equal(writes[1][1], 'section-id');
    assert.equal(reads, 0);
    assert.deepEqual(loading, []);
    // Selecting an existing parent later still loads its children normally.
    await handler(source, 'handleSectionChange', bindings)(area === 'labor' ? 'section-id' : 'New section');
    assert.equal(reads, 1);
    assert.deepEqual(loading, [true,false]);
    // Failed saves leave the available options and current selection intact.
    const previousOptions = area === 'labor' ? bindings.sectionOptions : bindings.sections;
    const previousFields = {...fields};
    const createSection = area === 'labor' ? 'addSection' : `add${prefix}Section`;
    bindings[createSection] = async () => ({success:false,error:'Duplicate name'});
    const failure = await handler(source, 'handleAddSection', bindings)('Duplicate');
    assert.equal(failure.success, false);
    assert.equal(area === 'labor' ? bindings.sectionOptions : bindings.sections, previousOptions);
    assert.deepEqual(fields, previousFields);
  });
}
