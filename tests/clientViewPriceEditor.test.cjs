const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const React = require('react');

async function editorModule() {
  let slots, cursor;
  const mockReact = { ...React,
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; const current = slots; return [slots[index], value => { current[index] = typeof value === 'function' ? value(current[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useEffect() {}, useId() { return 'price-dialog'; },
  };
  const output = await build({ entryPoints: ['src/pages/estimates/components/estimateDashboard/clientViewTab/components/PriceEditor.tsx'], bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external' });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', 'document', output.outputFiles[0].text)(name => name === 'react' ? mockReact : name === 'react-dom' ? { createPortal: element => element } : require(name), mod, mod.exports, { body: {} });
  return { ...mod.exports, render(Component, props, state) { slots = state; cursor = 0; return Component(props); } };
}
test('desired totals calculate a unit price in cents for fixed quantities', async () => {
  const { priceFromTotal } = await editorModule();
  assert.equal(priceFromTotal(1, 4), .25);
  assert.equal(priceFromTotal(1, 3), .33);
  assert.equal(priceFromTotal(0, 4), 0);
});
test('popup closes immediately while the network is pending and can save again', async () => {
  const { PriceEditor, render } = await editorModule();
  const outerState = [];
  const saved = [];
  const pending = [];
  const props = { item: { id: '1', description: 'Pipe', quantity: 4, unitPrice: .16, total: .64 }, onSave: (_, price) => { saved.push(price); return new Promise((resolve, reject) => pending.push({ resolve, reject })); } };
  for (const value of ['0.25', '0.50']) {
    let outer = render(PriceEditor, props, outerState);
    outer.props.children[0].props.onClick();
    outer = render(PriceEditor, props, outerState);
    const popup = outer.props.children[1];
    const innerState = [];
    let modal = render(popup.type, popup.props, innerState);
    const unitLabel = modal.props.children.props.children.find(child => child?.type === 'label');
    unitLabel.props.children[1].props.onChange({ target: { value } });
    modal = render(popup.type, popup.props, innerState);
    await modal.props.children.props.onSubmit({ preventDefault() {} });
    outer = render(PriceEditor, props, outerState);
    assert.equal(outer.props.children[1], false);
    assert.equal(outer.props.children[0].props.disabled, undefined);
  }
  assert.deepEqual(saved, [.25, .5]);
  pending[0].resolve();
  pending[1].reject(new Error('offline'));
  await Promise.resolve();
  const outer = render(PriceEditor, props, outerState);
  assert.match(outer.props.children[2].props.children, /Save failed/);
  outer.props.children[2].props.onClick();
  assert.deepEqual(saved, [.25, .5, .5]);
  pending[2].resolve();
});

test('quantity one edits inline and stays editable during a background save', async () => {
  const { PriceEditor, render } = await editorModule();
  const saved = [];
  const props = { item: { id: '1', description: 'Inspection', quantity: 1, unitPrice: 10, total: 10 }, onSave: (_, price) => { saved.push(price); return new Promise(() => {}); } };
  const outerState = [];
  let outer = render(PriceEditor, props, outerState);
  const inline = outer.props.children[0];
  const inlineState = [];
  let field = render(inline.type, inline.props, inlineState);
  assert.equal(field.props['aria-haspopup'], undefined);
  field.props.onClick();
  field = render(inline.type, inline.props, inlineState);
  field.props.onChange({ target: { value: '25.00' } });
  field = render(inline.type, inline.props, inlineState);
  field.props.onKeyDown({ key: 'Enter', preventDefault() {} });
  assert.deepEqual(saved, [25]);
  outer = render(PriceEditor, props, outerState);
  assert.equal(outer.props.children[1], false);
  field = render(outer.props.children[0].type, outer.props.children[0].props, inlineState);
  field.props.onClick();
  field = render(outer.props.children[0].type, outer.props.children[0].props, inlineState);
  assert.equal(field.props.value, '25.00');
  assert.equal(field.props.disabled, undefined);
});
