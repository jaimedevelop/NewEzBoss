const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const vm = require('node:vm');

test('estimate autosave tracks only changed fields and keeps queued sections independent', async () => {
  const slots = [];
  let cursor = 0;
  const react = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useCallback: fn => fn,
    useMemo: fn => fn(),
    useEffect() {},
  };
  const requests = [];
  const destinations = [];
  const { outputFiles } = await build({
    entryPoints: ['src/pages/estimates/components/estimateDashboard/estimateTab/useEstimateAutosave.ts'],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    plugins: [{ name: 'mock-dependencies', setup(builder) {
      builder.onResolve({ filter: /^react$/ }, () => ({ path: 'react', external: true }));
      builder.onResolve({ filter: /services\/estimates$/ }, () => ({ path: 'estimates', external: true }));
    } }],
  });
  const module = { exports: {} };
  vm.runInNewContext(outputFiles[0].text, { module, exports: module.exports, setTimeout, clearTimeout, console, Error,
    require: name => name === 'react' ? react : { updateEstimate: (id) => { destinations.push(id); return new Promise((resolve, reject) => { resolve.reject = reject; requests.push(resolve); }); } },
  });
  const render = (id = 'estimate-id') => { cursor = 0; return module.exports.useEstimateAutosave(id, async () => {}); };
  const tick = () => new Promise(resolve => setTimeout(resolve, 10));
  let autosave = render();
  const tax = autosave.save({ taxRate: 8 });
  await tick();
  autosave = render();
  assert.equal(autosave.fieldStatuses.taxRate, 'saving');
  assert.equal(autosave.fieldStatuses.pictures, undefined);
  assert.equal(autosave.lineItemsStatus, 'idle');
  let finishUpload;
  const upload = autosave.run('upload-picture-1', () => new Promise(resolve => { finishUpload = resolve; }));
  requests.shift()({ success: true });
  await tax;
  await tick();
  autosave = render();
  assert.equal(autosave.fieldStatuses.taxRate, 'saved');
  assert.equal(autosave.fieldStatuses.pictures, 'saving');
  finishUpload({ ok: true });
  await upload;
  assert.equal(render().fieldStatuses.pictures, 'saved');
  const notes = render().save({ notes: 'Changed' });
  await tick();
  requests.shift()({ success: false, error: { message: 'Offline' } });
  await notes;
  assert.equal(render().fieldStatuses.notes, 'error');
  assert.equal(render().lineItemsStatus, 'idle');
  render().retry();
  await tick();
  assert.equal(render().fieldStatuses.notes, 'saving');
  requests.shift()({ success: true });
  await tick();
  assert.equal(render().fieldStatuses.notes, 'saved');
  let release;
  const blocker = render().run('block', () => new Promise(resolve => { release = resolve; }));
  const queued = render().save({ notes: 'Original document' });
  await tick();
  render('another-document');
  release({ ok: true });
  await blocker;
  await tick();
  assert.equal(destinations.at(-1), 'estimate-id', 'queued writes retain their original document after navigation');
  requests.shift()({ success: true });
  await queued;
  const rejected = render().save({ notes: 'Network rejection' });
  await tick();
  requests.shift().reject(new Error('Offline rejection'));
  const failure = await rejected;
  assert.equal(failure.ok, false);
  assert.equal(failure.message, 'Offline rejection');
  assert.equal(render().hasPendingChanges(), true);
});
