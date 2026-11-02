import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBudgetAmount } from '../src/pages/finances/components/budget/budgetAmount';
test('budget input preserves cents including existing decimal goals', () => {
  for (const [input, amount] of [['0', 0], ['0.01', 0.01], ['12.34',12.34], ['1.2',1.2], ['999999999998.99',999999999998.99], ['999999999999',999999999999]] as const) {
    assert.equal(parseBudgetAmount(input), amount);
  }
});
test('budget input refuses truncation, implicit zero and excess precision', () => {
  for (const input of ['', ' ', '-1', '1.005', '1e2', 'NaN', 'Infinity', '12abc', '999999999999.01', '90071992547409.91', '0'.repeat(100)]) {
    assert.equal(parseBudgetAmount(input), null, input);
  }
});
