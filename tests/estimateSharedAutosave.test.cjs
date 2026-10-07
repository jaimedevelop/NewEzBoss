const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const path = require('node:path');

test('shared estimate patches update immediately and serialize background writes', async () => {
  const mock = { writes: [], optimistic: [], refreshes: 0 };
  const result = await build({
    entryPoints: [path.resolve('src/pages/estimates/components/estimateDashboard/estimateTab/useEstimateAutosave.ts')],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    plugins: [{ name: 'mocks', setup(b) {
      b.onResolve({ filter: /^react$|services\/estimates$/ }, a => ({ path: a.path, namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, a => ({ contents: a.path === 'react' ? `
        export const useRef = current => ({ current });
        export const useState = initial => [initial, () => {}];
        export const useCallback = fn => fn;
        export const useMemo = fn => fn();
        export const useEffect = () => {};
      ` : `export const updateEstimate = async (id, patch) => {
        mock.writes.push(patch); return await new Promise(resolve => mock.resolve = resolve);
      };` }));
    } }],
  });
  const mod = { exports: {} };
  new Function('mock', 'module', 'exports', result.outputFiles[0].text)(mock, mod, mod.exports);
  const queue = mod.exports.useEstimateAutosave('81', async () => mock.refreshes++, patch => mock.optimistic.push(patch));
  const first = queue.save({ notes: 'Updated note' });
  assert.deepEqual(mock.optimistic, [{ notes: 'Updated note' }]);
  assert.equal(queue.hasPendingChanges(), true);
  await new Promise(resolve => setTimeout(resolve, 5));
  let secondStarted = false;
  const second = queue.run('client-view', async () => { secondStarted = true; return { ok: true }; });
  assert.equal(secondStarted, false);
  mock.resolve({ success: true });
  await first;
  await second;
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(secondStarted, true);
  assert.equal(queue.hasPendingChanges(), false);
  assert.equal(mock.refreshes, 1);
  const failed = await queue.run('reorder', async () => ({ ok: false, message: 'Offline' }));
  assert.equal(failed.ok, false);
  assert.equal(queue.hasPendingChanges(), true);
});
