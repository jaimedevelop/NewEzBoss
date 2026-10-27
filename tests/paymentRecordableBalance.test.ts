import assert from 'node:assert/strict';
import test from 'node:test';
import { getRecordableBalance, getReservedPaymentAmount } from '../src/services/estimates/paymentSchedule.utils.ts';
import type { PaymentRecord } from '../src/services/estimates/estimates.types.ts';

const payment = (fields: Partial<PaymentRecord>) => ({ amount: 400, status: 'pending', method: 'Stripe', ...fields } as PaymentRecord);

test('manual payments subtract active reservations from the displayed unpaid balance', () => {
  const payments = [payment({ amount: 100, status: 'approved' }), payment({ paymentAttemptState: 'ready' })];
  assert.equal(getRecordableBalance(500, payments), 0);
  assert.equal(getRecordableBalance(900, payments), 400);
  for (const paymentAttemptState of ['creating', 'ready', 'processing']) {
    assert.equal(getReservedPaymentAmount([payment({ paymentAttemptState })]), 400);
  }
});

test('manual claims and released or terminal attempts do not reserve funds', () => {
  const payments = [
    payment({ method: 'Cash' }),
    payment({ paymentAttemptState: 'canceled' }),
    payment({ paymentAttemptState: 'stale' }),
    payment({ paymentAttemptState: 'ready', reservationReleasedAt: '2026-10-27T12:00:00Z' }),
  ];
  assert.equal(getRecordableBalance(400, payments), 400);
  assert.equal(getRecordableBalance(1.07, [payment({ amount: 0.5, status: 'approved' })]), 0.57);
});
