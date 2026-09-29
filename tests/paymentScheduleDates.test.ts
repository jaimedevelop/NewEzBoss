import assert from 'node:assert/strict';
import test from 'node:test';
import { apiDetailRowToEstimate } from '../src/services/estimates/estimates.mapper';

test('saved schedule dates round trip in date-input format while undated entries remain optional', () => {
  const estimate = apiDetailRowToEstimate({
    id: 1,
    lineItems: [],
    paymentSchedule: { mode: 'sum', entries: [
      { id: 10, description: 'Deposit', value: '1.07', dueDate: '2026-09-29T04:00:00.000Z' },
      { id: 11, description: 'Progress', value: '50', dueDate: '2026-10-02' },
      { id: 12, description: 'Final', value: '109.43', dueDate: null },
    ] },
  } as any);
  assert.deepEqual(estimate.paymentSchedule?.entries.map(e => [e.id, e.dueDate]), [
    ['10', '2026-09-29'], ['11', '2026-10-02'], ['12', undefined],
  ]);
});
