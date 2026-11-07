const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const { build } = require('esbuild');

async function setup() {
  const views = [];
  const ref = { current: undefined };
  const listeners = new Map();
  const document = {
    visibilityState: 'visible',
    addEventListener: (event, fn) => listeners.set(event, fn),
    removeEventListener: (event) => listeners.delete(event),
  };
  const window = { setInterval: () => 1, clearInterval: () => {} };
  let cleanup;
  const react = { useEffect: (effect) => { cleanup = effect(); }, useRef: () => ref };
  const result = await build({
    entryPoints: [path.resolve(__dirname, '../src/hooks/useCustomerEstimateVisit.ts')],
    bundle: true, write: false, platform: 'node', format: 'cjs', external: ['react'],
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', 'document', 'window', 'crypto', result.outputFiles[0].text)(
    () => react, mod, mod.exports, document, window, { randomUUID },
  );
  const record = async (key, visit) => { views.push({ key, ...visit }); };
  return {
    views,
    document,
    changeVisibility: (state) => { document.visibilityState = state; listeners.get('visibilitychange')?.(); },
    render: (key, version) => { cleanup?.(); mod.exports.useCustomerEstimateVisit(key, version, record); },
    reopen: () => { cleanup?.(); ref.current = undefined; },
  };
}

test('unchanged refreshes count once and a changed version counts when displayed', async () => {
  const page = await setup();
  page.render('shared-token', 'first');
  page.render('shared-token', 'first');
  page.changeVisibility('hidden');
  page.render('shared-token', 'changed');
  assert.equal(page.views.length, 1);
  page.changeVisibility('visible');
  assert.deepEqual(page.views.map(view => view.version), ['first', 'changed']);
  assert.notEqual(page.views[0].visitId, page.views[1].visitId);
});

test('reopening the same version records a separate visit', async () => {
  const page = await setup();
  page.render('shared-token', undefined);
  assert.equal(page.views.length, 0);
  page.render('shared-token', 'first');
  page.reopen();
  page.render('shared-token', 'first');
  assert.equal(page.views.length, 2);
  assert.notEqual(page.views[0].visitId, page.views[1].visitId);
});
