const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

test('presentation order handles deleted and newly added items without losing entries', async () => {
  const output = await build({ entryPoints: ['src/pages/estimates/components/estimateDashboard/clientViewTab/components/SortablePreview.tsx'], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', define: { 'import.meta.env': '{}' } });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, mod, mod.exports);
  assert.deepEqual(mod.exports.orderedIds(['a', 'b', 'new'], ['deleted', 'b', 'b', 'a']), ['b', 'a', 'new']);
});

test('client document honors saved item, group, and type order without editor handles', async () => {
  const output = await build({ entryPoints: ['src/pages/estimates/components/estimateDashboard/clientViewTab/components/ClientViewDocPreview.tsx'], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', define: { 'import.meta.env': '{}' } });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', output.outputFiles[0].text)(require, mod, mod.exports);
  const estimate = { lineItems: [
    { id: 'a', description: 'First item', type: 'product', groupId: 'g1', total: 10 },
    { id: 'b', description: 'Second item', type: 'labor', groupId: 'g2', total: 20 },
  ], subtotal: 30, total: 30, tax: 0 };
  const render = (displayMode, presentationOrder) => renderToStaticMarkup(React.createElement(mod.exports.ClientViewDocPreview, { estimate, groups: [{ id: 'g1', name: 'Alpha' }, { id: 'g2', name: 'Beta' }], settings: { displayMode, presentationOrder } }));
  const list = render('list', { 'items:list:General': ['b', 'a'] });
  assert.ok(list.indexOf('Second item') < list.indexOf('First item'));
  assert.ok(!list.includes('Drag to reorder'));
  const groups = render('byGroup', { 'sections:byGroup': ['Beta', 'Alpha'] });
  assert.ok(groups.indexOf('Beta') < groups.indexOf('Alpha'));
  const types = render('byType', { 'sections:byType': ['Labor', 'Materials'] });
  assert.ok(types.indexOf('Labor') < types.indexOf('Materials'));
});

test('pointer activation reaches dnd-kit before the native event is cancelled', async () => {
  const activated = [];
  const result = await build({
    entryPoints: ['src/pages/estimates/components/estimateDashboard/clientViewTab/components/SortablePreview.tsx'],
    bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
    plugins: [{ name: 'sortable-sensor', setup(b) {
      b.onResolve({ filter: /^@dnd-kit\/sortable$/ }, () => ({ path: 'sortable', namespace: 'sensor' }));
      b.onLoad({ filter: /.*/, namespace: 'sensor' }, () => ({ contents: `
        export const useSortable = () => ({ attributes: {}, listeners: { onPointerDown: event => {
          if (!event.nativeEvent.defaultPrevented) activated.push('drag-start');
        } } });
        export const SortableContext = () => null;
        export const sortableKeyboardCoordinates = () => {};
        export const verticalListSortingStrategy = () => {};
        export const arrayMove = () => {};
      ` }));
    } }],
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', 'activated', result.outputFiles[0].text)(require, mod, mod.exports, activated);
  const wrapper = mod.exports.PreviewSortRow({ id: 'a', label: 'Alpha', enabled: true, children: 'Alpha' });
  const row = wrapper.type(wrapper.props);
  const event = {
    button: 0, isPrimary: true, target: { closest: () => null }, nativeEvent: { defaultPrevented: false },
    preventDefault() { this.nativeEvent.defaultPrevented = true; },
    stopPropagation() { this.stopped = true; },
  };
  row.props.onPointerDown(event);
  assert.deepEqual(activated, ['drag-start']);
  assert.equal(event.nativeEvent.defaultPrevented, true);
  assert.equal(event.stopped, true);
});
