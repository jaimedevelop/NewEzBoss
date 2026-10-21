const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function harness(request, storage = new Map()) {
  let slots = [], cursor = 0, effects = [], timers = new Map(), counter = 0, pending = false, result;
  const schedule = () => { if (!pending) { pending = true; queueMicrotask(() => { pending = false; render(); }); } };
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const react = {
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value }; },
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; schedule(); }]; },
    useCallback(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, fn }; return slots[i].fn; },
    useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) { const old = slots[i]; slots[i] = { deps, cleanup: old?.cleanup }; effects.push(() => { old?.cleanup?.(); slots[i].cleanup = fn(); }); } },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('src/pages/finances/useFinanceAutosave.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require: name => name === 'react' ? react : name.includes('clientsApi') ? { clientsApiRequest: request } : { columns: [['date']] }, localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) }, window: { setTimeout: fn => { timers.set(++counter, fn); return counter; }, clearTimeout: id => timers.delete(id), addEventListener() {}, removeEventListener() {} } });
  function render() { cursor = 0; effects = []; result = exports.useFinanceAutosave('user:company', true); effects.forEach(fn => fn()); }
  render();
  return { get value() { return result; }, storage, async flush() { for (let i = 0; i < 10; i++) await Promise.resolve(); }, async save() { const batch = [...timers.values()]; timers.clear(); await Promise.all(batch.map(fn => fn())); await this.flush(); } };
}
const row = { id: 'row-1', version: 1, data: { date: '2026-10-21T12:30' } };
test('edits made during a save retain the latest data and use the returned version', async () => {
  let resolve, calls = [];
  const h = harness((path, options) => { calls.push(JSON.parse(options.body)); return new Promise(done => { resolve = done; }); });
  await h.flush(); h.value.change(row, { date: 'first' }); await h.flush();
  const saving = h.save();
  h.value.change(row, { date: 'latest' }); await h.flush();
  resolve({ ...row, version: 2, data: { date: 'first' } }); await saving;
  assert.equal(h.value.drafts[row.id].data.date, 'latest');
  assert.equal(h.value.drafts[row.id].version, 2);
  const second = h.save(); resolve({ ...row, version: 3, data: { date: 'latest' } }); await second;
  assert.equal(calls[1].version, 2); assert.equal(h.value.status, 'saved');
  assert.equal(Object.keys(h.value.drafts).length, 0);
});
test('failed saves persist drafts across remount and retry without duplicating a created row', async () => {
  const h = harness(async () => { throw Error('offline'); }); await h.flush();
  h.value.change({ ...row, version: 0 }, { date: 'local' }); await h.flush(); await h.save();
  assert.equal(h.value.status, 'failed'); assert.equal(h.value.drafts[row.id].data.date, 'local');
  let calls = [];
  const restored = harness(async (path, options) => {
    calls.push(options?.method || 'GET');
    if (options?.method === 'POST') return [];
    if (!options) return [{ ...row, data: { date: 'old' } }];
    return { ...row, version: 2, data: JSON.parse(options.body).data };
  }, h.storage);
  await restored.flush(); assert.equal(restored.value.drafts[row.id].data.date, 'local'); await restored.save();
  assert.deepEqual(calls, ['POST', 'GET', 'PUT']); assert.equal(restored.value.status, 'saved');
});
test('date conversion removes times and leaves unknown imports untouched', () => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/pages/finances/dateTime.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
  assert.equal(exports.dateInput('2026-10-21'), '2026-10-21');
  assert.equal(exports.dateInput('2026-10-21T13:42:15'), '2026-10-21');
  assert.equal(exports.dateInput('10/21/2026'), '2026-10-21');
  assert.equal(exports.dateInput('2/31/2026'), '');
  assert.equal(exports.dateInput('unrecognized date'), '');
});

test('payments format as dollars while preserving blanks and nonnumeric imports', () => {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/pages/finances/payment.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
  assert.equal(exports.formatPayment('1234.5'), '$1,234.50');
  assert.equal(exports.formatPayment('$1,234.50'), '$1,234.50');
  assert.equal(exports.formatPayment('0'), '$0.00');
  assert.equal(exports.formatPayment('-15.5'), '-$15.50');
  assert.equal(exports.formatPayment(''), '');
  assert.equal(exports.formatPayment('pending'), 'pending');
  assert.equal(exports.paymentInput('$1,234.50'), '1234.50');
});
