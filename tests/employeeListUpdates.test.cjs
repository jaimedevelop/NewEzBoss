const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const output = buildSync({ entryPoints: ['src/pages/people/employees/employeeListState.ts'], bundle: true, write: false, platform: 'node', format: 'cjs' });
const mod = { exports: {} };
new Function('module', 'exports', output.outputFiles[0].text)(mod, mod.exports);
const { reconcileItems, upsertEmployee, removeEmployee } = mod.exports;

test('unchanged invitation checks preserve collection and record identity', () => {
  const items = [{ id: '1', status: 'pending' }, { id: '2', status: 'accepted' }];
  assert.equal(reconcileItems(items, structuredClone(items)), items);
  const changed = reconcileItems(items, [{ ...items[0], status: 'expired' }, { ...items[1] }]);
  assert.notEqual(changed[0], items[0]);
  assert.equal(changed[1], items[1]);
});

test('employee changes only replace the affected record and regroup renamed employees', () => {
  const alice = { id: '1', name: 'Alice Adams' };
  const bob = { id: '2', name: 'Bob Brown' };
  const groups = { A: [alice], B: [bob] };
  assert.equal(upsertEmployee(groups, { ...alice }), groups);
  const renamed = upsertEmployee(groups, { ...alice, name: 'Alice Carter' });
  assert.equal(renamed.B, groups.B);
  assert.equal(renamed.A, undefined);
  assert.equal(renamed.C[0].name, 'Alice Carter');
  const added = upsertEmployee(groups, { id: '3', name: 'Chris Adams' });
  assert.equal(added.B, groups.B);
  assert.equal(added.A[0], alice);
  assert.deepEqual(removeEmployee(groups, '1'), { B: [bob] });
  assert.equal(removeEmployee(groups, 'missing'), groups);
});
