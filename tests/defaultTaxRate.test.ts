import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDefaultTaxRate } from '../src/pages/estimates/components/defaultTaxRate';

test('company tax defaults produce numeric rates for estimate creation', () => {
  for (const [input, expected] of [[0, 0], ['0', 0], ['0.00', 0], [8.25, 8.25], ['8.25', 8.25], ['100', 100]] as const) {
    const taxRate = normalizeDefaultTaxRate(input);
    assert.equal(taxRate, expected);
    assert.equal(JSON.stringify({ taxRate }), `{"taxRate":${expected}}`);
  }
});

test('missing or invalid company tax defaults fall back to zero', () => {
  for (const input of [undefined, null, '', 'invalid', NaN, Infinity, -1, 101, {}, false]) {
    assert.equal(normalizeDefaultTaxRate(input), 0);
  }
});
