const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { build } = require('esbuild');

async function setup() {
  const result = await build({
    entryPoints: [path.resolve(__dirname, '../src/pages/estimates/components/PaymentScheduleModal.tsx')],
    bundle: true, write: false, platform: 'node', format: 'cjs',
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, mod, mod.exports);
  return mod.exports;
}

test('deposit unit changes preserve the monetary value and allocate the remainder', async () => {
  const { convertDepositValue, applyDepositToPaymentSchedule } = await setup();
  const dollars = convertDepositValue(25, 'percentage', 'amount', 1200);
  assert.equal(dollars, 300);
  const schedule = applyDepositToPaymentSchedule(null, 'amount', dollars, 1200);
  assert.deepEqual(schedule.entries.map(entry => entry.value), [300, 900]);
  assert.equal(convertDepositValue(dollars, 'amount', 'percentage', 1200), 25);
  assert.equal(convertDepositValue(25, 'percentage', 'amount', 99.99), 25);
  assert.equal(convertDepositValue(100, 'amount', 'percentage', 300), 33.33);
});

test('unchanged units and no deposit retain the input; zero totals avoid division by zero', async () => {
  const { convertDepositValue } = await setup();
  assert.equal(convertDepositValue(25, 'percentage', 'percentage', 1200), 25);
  assert.equal(convertDepositValue(25, 'none', 'percentage', 1200), 25);
  assert.equal(convertDepositValue(25, 'amount', 'none', 1200), 25);
  assert.equal(convertDepositValue(25, 'amount', 'percentage', 0), 0);
  assert.equal(convertDepositValue(25, 'percentage', 'amount', 0), 0);
});
