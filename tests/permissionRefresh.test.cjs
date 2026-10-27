const assert = require('node:assert/strict');
const test = require('node:test');
const { build } = require('esbuild');

test('refreshes idle permissions, skips overlapping and hidden requests, and cleans up', async () => {
  const result = await build({
    entryPoints: ['src/hooks/usePermissionRefresh.ts'], bundle: true, write: false, platform: 'node', format: 'cjs',
    plugins: [{ name: 'react-mock', setup(b) {
      b.onResolve({ filter: /^react$/ }, () => ({ path: 'react', namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `
        export const useRef = value => mock.ref ??= { current: value };
        export const useEffect = (fn, deps) => {
          if (mock.key === deps[0]) return;
          mock.cleanup?.(); mock.key = deps[0]; mock.cleanup = fn();
        };
      ` }));
    } }],
  });
  const mock = {};
  const listeners = new Map();
  const document = { visibilityState: 'visible',
    addEventListener: (key, fn) => listeners.set(key, fn),
    removeEventListener: key => listeners.delete(key) };
  const window = { ...document,
    setInterval: (fn, delay) => { mock.tick = fn; assert.equal(delay, 5000); return 1; },
    clearInterval: id => { assert.equal(id, 1); mock.cleared = true; } };
  const mod = { exports: {} };
  new Function('mock', 'document', 'window', 'module', 'exports', result.outputFiles[0].text)(mock, document, window, mod, mod.exports);
  let calls = 0;
  let finish;
  const hook = mod.exports.usePermissionRefresh;
  hook(() => { calls++; return new Promise(resolve => { finish = resolve; }); }, 'employee');
  assert.equal(calls, 1);
  await mock.tick();
  assert.equal(calls, 1);
  finish();
  await Promise.resolve();
  document.visibilityState = 'hidden';
  await mock.tick();
  assert.equal(calls, 1);
  let latestCalls = 0;
  hook(async () => { latestCalls++; }, 'employee');
  document.visibilityState = 'visible';
  await listeners.get('visibilitychange')();
  await mock.tick();
  await listeners.get('ezboss:permission-denied')();
  assert.equal(latestCalls, 3);
  hook(async () => { latestCalls++; }, 'other-company');
  assert.equal(latestCalls, 4);
  mock.cleanup();
  assert.equal(mock.cleared, true);
  assert.equal(listeners.size, 0);
});
