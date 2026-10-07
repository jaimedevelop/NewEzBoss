const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { build } = require('esbuild');

test('client refresh follows order changes, skips hidden pages, and cleans up', async () => {
  const result = await build({
    entryPoints: [path.resolve(__dirname, '../src/hooks/usePublicEstimateRefresh.ts')],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    plugins: [{ name: 'mocks', setup(builder) {
      builder.onResolve({ filter: /^react$|publicEstimate$/ }, args => ({ path: args.path, namespace: 'mock' }));
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: args.path === 'react'
        ? 'export const useEffect = fn => { mock.cleanup = fn(); };'
        : 'export const getPublicEstimate = async (...args) => { mock.calls.push(args); return mock.estimate; };' }));
    } }],
  });
  const listeners = new Map();
  const mock = { calls: [], estimate: { id: '81', lineItems: [{ id: '2' }, { id: '1' }] } };
  const doc = {
    visibilityState: 'visible',
    addEventListener: (key, fn) => listeners.set(key, fn),
    removeEventListener: key => listeners.delete(key),
  };
  const win = {
    setInterval: (fn, delay) => { mock.tick = fn; assert.equal(delay, 5000); return 7; },
    clearInterval: id => { assert.equal(id, 7); mock.cleared = true; },
    addEventListener: doc.addEventListener,
    removeEventListener: doc.removeEventListener,
  };
  const mod = { exports: {} };
  new Function('mock', 'document', 'window', 'module', 'exports', result.outputFiles[0].text)(mock, doc, win, mod, mod.exports);
  const updates = [];
  mod.exports.usePublicEstimateRefresh('shared-token', true, estimate => updates.push(estimate));
  await mock.tick();
  assert.deepEqual(updates[0].lineItems.map(item => item.id), ['2', '1']);
  assert.deepEqual(mock.calls, [['shared-token', { recordView: false }]]);
  doc.visibilityState = 'hidden';
  await mock.tick();
  assert.equal(mock.calls.length, 1);
  doc.visibilityState = 'visible';
  await listeners.get('visibilitychange')();
  assert.equal(mock.calls.length, 2);
  const pending = mock.tick();
  mock.cleanup();
  await pending;
  assert.equal(updates.length, 2);
  assert.equal(listeners.size, 0);
  assert.equal(mock.cleared, true);
});
