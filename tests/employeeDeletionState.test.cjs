const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const output = buildSync({ entryPoints: ['src/pages/people/employees/employeeDeletionState.ts'], bundle: true, write: false, platform: 'node', format: 'cjs' });
const mod = { exports: {} };
new Function('module', 'exports', output.outputFiles[0].text)(mod, mod.exports);
const { createEmployeeDeletionState } = mod.exports;
const employee = { id: '4', name: 'Test Employee' };

test('deletion hides immediately, survives navigation and blocks duplicate requests', async () => {
  const store = createEmployeeDeletionState();
  let finish;
  let requests = 0;
  const request = () => { requests++; return new Promise(resolve => { finish = resolve; }); };
  const unsubscribe = store.subscribe(() => {});
  const deleting = store.remove(employee, 'owner', request);
  assert.equal(store.getSnapshot().hidden.get('4'), employee);
  unsubscribe();
  store.subscribe(() => {});
  await store.remove(employee, 'owner', request);
  assert.equal(requests, 1);
  finish({ success: true });
  await deleting;
  assert.equal(store.getSnapshot().hidden.has('4'), true);
  assert.equal(store.getSnapshot().errors.size, 0);
});

test('failure restores only that employee, reports the error and allows retry', async () => {
  const store = createEmployeeDeletionState();
  let fail;
  const deleting = store.remove(employee, 'owner', () => new Promise(resolve => { fail = resolve; }));
  await store.remove({ id: '5', name: 'Other' }, 'owner', async () => ({ success: true }));
  let notified = false;
  store.subscribe(() => { notified = true; });
  fail({ success: false, error: 'Database unavailable' });
  await deleting;
  assert.equal(notified, true);
  assert.equal(store.getSnapshot().hidden.has('4'), false);
  assert.equal(store.getSnapshot().hidden.has('5'), true);
  assert.match(store.getSnapshot().errors.get('owner'), /Test Employee.*Database unavailable/);
  await store.remove(employee, 'owner', async () => ({ success: true }));
  assert.equal(store.getSnapshot().errors.size, 0);
});
