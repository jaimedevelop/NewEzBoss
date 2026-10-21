const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

test('saved layout renders publicly while price inputs remain contractor-only and summaries read-only', async () => {
  const output = await build({ entryPoints: ['src/pages/estimates/components/estimateDashboard/clientViewTab/components/ClientViewDocPreview.tsx'], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', define: { 'import.meta.env': '{}' } });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, mod, mod.exports);
  const props = { estimate: { lineItems: [{ id: '1', description: 'Paint', type: 'product', quantity: 2, unitPrice: 25, total: 50 }], subtotal: 50, total: 50, tax: 0 }, groups: [], settings: { displayMode: 'list', showItemPrices: true, layout: { itemSpacing: 20, sectionSpacing: 60, textSize: 18, priceWidth: 160 } } };
  const render = p => renderToStaticMarkup(React.createElement(mod.exports.ClientViewDocPreview, p));
  const publicDoc = render(props);
  assert.match(publicDoc, /padding-top:20px/);
  assert.match(publicDoc, /font-size:18px/);
  assert.match(publicDoc, /width:160px/);
  assert.match(publicDoc, /gap:60px/);
  assert.doesNotMatch(publicDoc, /<input/);
  const editor = render({ ...props, onPriceChange: async () => {} });
  assert.match(editor, /aria-label="Edit price for Paint"/);
  assert.doesNotMatch(editor, /<input/);
  const summary = render({ ...props, settings: { ...props.settings, displayMode: 'byType' }, onPriceChange: async () => {} });
  assert.doesNotMatch(summary, /<input/);
});

test('group editing creates controls only for contractors and displays adjustment lines', async () => {
  const output = await build({ entryPoints: ['src/pages/estimates/components/estimateDashboard/clientViewTab/components/ClientViewDocPreview.tsx'], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', define: { 'import.meta.env': '{}' } });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, mod, mod.exports);
  const props = { estimate: { lineItems: [
    { id: '1', description: 'Paint', type: 'product', groupId: '7', quantity: 2, unitPrice: 50, total: 100 },
    { id: '2', description: 'Kitchen discount adjustment', type: 'custom', groupId: '7', quantity: 1, unitPrice: -20, total: -20, adjustmentKind: 'group' },
  ], subtotal: 80, total: 80, tax: 0 }, groups: [{ id: '7', name: 'Kitchen' }], settings: { displayMode: 'byGroup', showItemPrices: true, showGroupPrices: true } };
  const render = p => renderToStaticMarkup(React.createElement(mod.exports.ClientViewDocPreview, p));
  const publicDoc = render(props);
  assert.match(publicDoc, /Kitchen discount adjustment/);
  assert.doesNotMatch(publicDoc, /<input/);
  const editor = render({ ...props, onPriceChange: async () => {}, onGroupPriceChange: async () => {}, onReorder: () => {} });
  assert.match(editor, /aria-label="Edit group total for Kitchen"/);
  assert.match(editor, /aria-label="Edit price for Paint"/);
  assert.doesNotMatch(editor, /<input/);
  assert.match(editor, /<p[^>]*class="relative[^"]*"><button[^>]*aria-label="Drag Paint"[^>]*class="[^"]*top-1\/2/);
  assert.doesNotMatch(editor, /aria-label="Edit price for Kitchen discount adjustment"/);
  const summary = render({ ...props, settings: { ...props.settings, displayMode: 'byType' }, onGroupPriceChange: async () => {} });
  assert.match(summary, /aria-label="Edit group total for Materials"/);
});
