const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');

test('finance sorting handles dates, natural document numbers, money, linked payments and blanks', async () => {
  const result = await build({ entryPoints: ['src/pages/finances/financeSort.ts'], bundle: true, write: false, platform: 'node', format: 'cjs' });
  const mod = { exports: {} };
  new Function('module', 'exports', result.outputFiles[0].text)(mod, mod.exports);
  const { sortFinanceRows: sort, nextFinanceSort: next } = mod.exports;
  const row = (id, data, paymentSummary) => ({ id, data, paymentSummary });
  const rows = [
    row('ten', { date: '1/2/2026', estimate: 'EST-10', payment: '$1,000.00', paymentDate: '2026-01-01', paymentMethod: 'Cash' }),
    row('two', { date: '2025-12-30', estimate: 'EST-2', payment: '$2.00', paymentDate: '2025-01-01', paymentMethod: 'Cash' }, { paid: 2000, payments: [{ date: '2026-02-01', method: 'Wire' }] }),
    row('blank', { date: 'invalid', estimate: '', payment: '', paymentDate: '', paymentMethod: '' }),
    row('tie', { date: '2026-01-02', estimate: 'EST-10', payment: '-$5.00', paymentDate: '', paymentMethod: '' }),
  ];
  const ids = (column, direction) => sort(rows, { column, direction }).map(row => row.id);
  assert.deepEqual(ids('date', 'asc'), ['two', 'ten', 'tie', 'blank']);
  assert.deepEqual(ids('date', 'desc'), ['ten', 'tie', 'two', 'blank']);
  assert.deepEqual(ids('estimate', 'asc'), ['two', 'ten', 'tie', 'blank']);
  assert.deepEqual(ids('payment', 'asc'), ['tie', 'ten', 'two', 'blank']);
  assert.deepEqual(ids('payment', 'desc'), ['two', 'ten', 'tie', 'blank']);
  assert.deepEqual(ids('paymentDate', 'desc'), ['two', 'ten', 'blank', 'tie']);
  assert.deepEqual(ids('paymentMethod', 'asc'), ['ten', 'two', 'blank', 'tie']);
  assert.deepEqual(rows.map(row => row.id), ['ten', 'two', 'blank', 'tie']);
  assert.deepEqual(next(null, 'agent'), { column: 'agent', direction: 'asc' });
  assert.deepEqual(next(next(null, 'agent'), 'agent'), { column: 'agent', direction: 'desc' });
  assert.equal(next({ column: 'agent', direction: 'desc' }, 'agent'), null);
});
