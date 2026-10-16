import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPaymentDate, isValidPaymentDate, localPaymentDate } from '../src/services/estimates/paymentDates.ts';

test('payment dates retain the selected calendar day across time zones', () => {
  const original = process.env.TZ;
  try {
    for (const timezone of ['America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Pacific/Auckland']) {
      process.env.TZ = timezone;
      assert.equal(formatPaymentDate('2026-10-16'), 'Oct 16, 2026', timezone);
      assert.equal(localPaymentDate(new Date(2026, 9, 16, 23, 30)), '2026-10-16', timezone);
      assert.equal(isValidPaymentDate('2026-10-16'), true, timezone);
      assert.equal(isValidPaymentDate('2026-02-30'), false, timezone);
      assert.equal(isValidPaymentDate('2028-02-29'), true, timezone);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('timestamps still display in local time and missing dates have a placeholder', () => {
  assert.equal(formatPaymentDate(null), '—');
  assert.equal(formatPaymentDate('invalid'), '—');
  const timestamp = '2026-10-16T02:00:00Z';
  assert.equal(formatPaymentDate(timestamp), new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
});
