// Run with node --test. Requires Playwright supplied by the development environment.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
let chromium;
try { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')); } catch { /* Optional browser runtime. */ }

test('searchable selector interactions', {skip: !chromium && 'Provide Playwright via PLAYWRIGHT_MODULE'}, async () => {
  const { outputFiles } = await build({
    stdin: { contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import Select from './src/mainComponents/forms/HierarchicalSelect';
      const root = createRoot(document.getElementById('root'));
      window.commits = []; window.adds = []; window.submits = 0; window.createdOptions = [];
      window.render = (props = {}) => root.render(<form onSubmit={e => { e.preventDefault(); window.submits++; }}>
        <Select searchable ariaLabel="Trade" placeholder="Select trade" value="id-1"
          options={[{value:'id-1',label:'Plumbing'}, {value:'id-2',label:'Electrical'}, {value:'id-3',label:'Painting'}, ...window.createdOptions]}
          onChange={v => window.commits.push(v)} onAddNew={async name => {
            window.adds.push(name);
            await new Promise(resolve => setTimeout(resolve, 50));
            if (name === 'throw') throw Error('failure');
            if (name !== 'fail') {
              window.createdOptions.push({value:name,label:name});
              window.render();
            }
            return name === 'fail' ? {success:false,error:'Duplicate name'} : {success:true};
          }} {...props}/><button type="button" id="outside">Outside</button></form>);
      window.render();`, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' },
  });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: outputFiles[0].text });
    // Model browsers that blur inputs on a button press without focusing the
    // button: relatedTarget is null, and blur happens before the click handler.
    await page.evaluate(() => document.addEventListener('mousedown', event => {
      const button = event.target.closest('button');
      if (button && !event.defaultPrevented) document.activeElement.blur();
    }));
    const input = page.getByRole('combobox');
    const options = page.getByRole('option');
    await input.click();
    assert.equal(await options.count(), 3);
    // Pointer activation must keep the dropdown open while replacing Add New.
    await page.getByRole('button', {name:'Add New', exact:true}).click();
    const pointerAdd = page.getByRole('textbox', {name:'New Trade'});
    assert.equal(await pointerAdd.isVisible(), true);
    assert.equal(await pointerAdd.evaluate(el => el === document.activeElement), true);
    await pointerAdd.fill('New category');
    await page.getByRole('button', {name:'Save new item'}).click();
    await page.getByRole('listbox').waitFor({state:'hidden'});
    assert.deepEqual(await page.evaluate(() => window.adds), ['New category']);
    assert.deepEqual(await page.evaluate(() => window.commits), ['New category']);
    assert.equal(await page.evaluate(() => window.submits), 0);
    await page.evaluate(() => { window.adds = []; window.commits = []; window.createdOptions = []; window.render(); });
    await input.click();
    await page.getByRole('button', {name:'Add New', exact:true}).click();
    await page.getByRole('textbox', {name:'New Trade'}).press('Escape');
    await page.getByRole('button', {name:'Add New', exact:true}).waitFor();
    await input.press('Escape');
    await input.click();
    await input.fill('IN');
    assert.deepEqual(await options.allTextContents(), ['Plumbing', 'Painting']);
    assert.deepEqual(await page.evaluate(() => window.commits), []);
    await page.evaluate(() => window.render());
    assert.equal(await input.inputValue(), 'IN'); // Equivalent option arrays preserve the search.
    await input.press('ArrowUp');
    await input.press('Enter');
    assert.deepEqual(await page.evaluate(() => window.commits), ['id-3']);
    assert.equal(await input.inputValue(), 'Plumbing'); // Controlled value stays authoritative.
    await input.press('x');
    assert.equal(await input.inputValue(), 'x');
    assert.equal(await options.count(), 0);
    assert.equal(await page.getByRole('status').textContent(), 'No matches found');
    await input.press('ArrowDown');
    await input.press('Enter');
    assert.deepEqual(await page.evaluate(() => window.adds), []);
    assert.equal(await page.evaluate(() => window.submits), 0);
    await input.press('Escape');
    assert.equal(await input.inputValue(), 'Plumbing');
    await input.click();
    await input.fill('lect');
    await options.click();
    assert.deepEqual(await page.evaluate(() => window.commits), ['id-3', 'id-2']);
    await input.click();
    await input.fill('no match');
    await input.press('Tab');
    assert.equal(await input.inputValue(), 'Plumbing');
    await page.getByRole('button', {name:'Add New', exact:true}).press('Enter');
    const add = page.getByRole('textbox', {name:'New Trade'});
    await add.press('Enter');
    assert.equal(await page.getByRole('alert').textContent(), 'Name cannot be empty');
    await add.fill('fail');
    await page.getByRole('button', {name:'Save new item'}).click();
    await page.getByText('Duplicate name', {exact:true}).waitFor();
    await add.fill('throw');
    await add.press('Enter');
    await page.getByText('Failed to add new item', {exact:true}).waitFor();
    await add.fill('  New trade  ');
    await add.press('Enter');
    await page.getByRole('listbox').waitFor({state:'hidden'});
    assert.deepEqual(await page.evaluate(() => window.commits), ['id-3','id-2','New trade']);
    assert.equal(await page.evaluate(() => window.submits), 0);
    await input.click();
    await input.fill('paint');
    await page.locator('#outside').click();
    assert.equal(await input.inputValue(), 'Plumbing');
    await input.click();
    await input.fill('paint');
    await page.evaluate(() => window.render({options:[{value:'id-1',label:'Plumbing'}]}));
    await page.waitForFunction(() => document.querySelectorAll('[role=option]').length === 0);
    assert.equal(await input.inputValue(), 'paint');
    assert.equal(await options.count(), 0);
    assert.equal(await input.getAttribute('aria-activedescendant'), null);
    await input.fill('paint');
    await input.press('ArrowDown');
    await page.evaluate(() => window.render({value:'', options:[]}));
    await page.getByRole('listbox').waitFor({state:'hidden'});
    assert.equal(await input.inputValue(), '');
    await input.click();
    assert.equal(await options.count(), 0);
    await input.press('ArrowDown');
    assert.equal(await input.getAttribute('aria-activedescendant'), null);
    await page.evaluate(() => window.render({disabled:true}));
    await page.getByRole('listbox').waitFor({state:'hidden'});
    assert.equal(await input.isDisabled(), true);
    await page.evaluate(() => window.render({value:'', options:[
      {value:'Acme',label:'Acme'}, {value:'Acme',label:'Acme'},
      {value:'Bravo',label:'Bravo'}, {value:'Charlie',label:'Charlie'},
      {value:'Delta',label:'Delta'}, {value:'Delta',label:'Delta'},
    ]}));
    await input.click();
    assert.equal(await options.count(), 6);
    const committedBeforeSearch = await page.evaluate(() => window.commits.slice());
    await input.pressSequentially('Delta');
    assert.deepEqual(await options.allTextContents(), ['Delta', 'Delta']);
    // Refreshing/reordering the options must not bring A-C back into the results.
    await page.evaluate(() => window.render({value:'', options:[
      {value:'Charlie',label:'Charlie'}, {value:'Acme',label:'Acme'},
      {value:'Delta',label:'Delta'}, {value:'Bravo',label:'Bravo'},
    ]}));
    await page.waitForFunction(() => document.querySelectorAll('[role=option]').length === 1);
    assert.equal(await input.inputValue(), 'Delta');
    assert.deepEqual(await options.allTextContents(), ['Delta']);
    assert.deepEqual(await page.evaluate(() => window.commits), committedBeforeSearch);
    await input.fill('nothing matches');
    assert.equal(await options.count(), 0);
    await input.fill('');
    assert.equal(await options.count(), 4);
    await page.evaluate(() => window.render({searchable:false}));
    await page.getByRole('button', {name:'Plumbing', exact:true}).click();
    assert.equal(await page.getByRole('combobox').count(), 0);
    await page.getByRole('button', {name:'Electrical', exact:true}).click();
  } finally { await browser.close(); }

});

test('created parents resolve from refreshed options before creating children', {skip: !chromium && 'Provide Playwright via PLAYWRIGHT_MODULE'}, async () => {
  const { outputFiles } = await build({
    stdin: { contents: `
      import React, {useState} from 'react';
      import {createRoot} from 'react-dom/client';
      import Select from './src/mainComponents/forms/HierarchicalSelect';
      function App({idValues}) {
        const [sections, setSections] = useState([]);
        const [section, setSection] = useState('');
        const [sectionId, setSectionId] = useState('');
        const [categories, setCategories] = useState([]);
        const [category, setCategory] = useState('');
        return <><Select searchable ariaLabel="Section" placeholder="Section" value={section}
          options={sections} onAddNew={async name => {
            setSections([{id:'section-id', value:idValues ? 'section-id' : name, label:name}]);
            return {success:true};
          }} onChange={value => {
            setSection(value);
            setSectionId(sections.find(option => option.value === value)?.id || '');
          }}/><Select searchable ariaLabel="Category" placeholder="Category" value={category}
          options={categories} onAddNew={async name => {
            if (!sectionId) return {success:false,error:'Please select a section'};
            window.parentId = sectionId;
            setCategories([{value:'category-id',label:name}]);
            return {success:true};
          }} onChange={setCategory}/><output>{sectionId + ':' + category}</output></>;
      }
      const root = createRoot(document.getElementById('root'));
      window.render = idValues => root.render(<App key={String(idValues)} idValues={idValues}/>);
      window.render(false);
    `, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, format: 'iife', define: {'process.env.NODE_ENV':'"production"'},
  });
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({content:outputFiles[0].text});
    for (const idValues of [false, true]) {
      await page.evaluate(idValues => window.render(idValues), idValues);
      await page.getByRole('combobox', {name:'Section',exact:true}).click();
      await page.getByRole('button', {name:'Add New',exact:true}).click();
      await page.getByRole('textbox', {name:'New Section'}).fill('New section');
      await page.getByRole('button', {name:'Save new item'}).click();
      await page.waitForFunction(() => document.querySelector('output').textContent === 'section-id:');
      assert.equal(await page.getByRole('combobox', {name:'Section',exact:true}).inputValue(), 'New section');
      await page.getByRole('combobox', {name:'Category',exact:true}).click();
      await page.getByRole('button', {name:'Add New',exact:true}).click();
      await page.getByRole('textbox', {name:'New Category'}).fill('New category');
      await page.getByRole('button', {name:'Save new item'}).click();
      await page.waitForFunction(() => document.querySelector('output').textContent === 'section-id:category-id');
      assert.equal(await page.evaluate(() => window.parentId), 'section-id');
      assert.equal(await page.getByRole('alert').count(), 0);
    }
  } finally { await browser.close(); }
});

test('all inventory tab selectors opt into accessible search', () => {
  // All reachable inventory tab selectors opt in and have stable accessible names.
  const fs = require('node:fs');
  const path = require('node:path');
  let count = 0;
  for (const [area, modal] of [['products','productModal'],['labor','laborModal'],['tools','toolModal'],['equipment','equipmentModal']]) {
    const dir = `src/pages/inventory/${area}/components/${modal}`;
    let areaCount = 0;
    for (const file of fs.readdirSync(dir).filter(file => file.endsWith('.tsx'))) {
      const source = fs.readFileSync(path.join(dir,file), 'utf8');
      for (const match of source.matchAll(/<HierarchicalSelect\s+([\s\S]*?)value=/g)) {
        assert.match(match[1], /searchable/);
        assert.match(match[1], /ariaLabel="[^"]+"/);
        areaCount++;
      }
    }
    assert.ok(areaCount > 0, area);
    count += areaCount;
  }
  assert.equal(count, 24);
});
