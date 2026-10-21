import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LinkedPaymentCell, { paymentCellText } from '../src/pages/finances/LinkedPaymentCell';
import type { PaymentSummary } from '../src/pages/finances/ledger';

test('linked payment cells show accessible status colors and formatted approved amounts', () => {
  for (const [status, paid, color] of [['unpaid', 0, 'red'], ['partial', 7000, 'yellow'], ['paid', 7066.07, 'green']] as const) {
    const summary: PaymentSummary = { status, paid, total: 7066.07, payments: [] };
    const html = renderToStaticMarkup(<LinkedPaymentCell summary={summary} field="payment" />);
    assert.match(html, new RegExp(`bg-${color}-50`));
    assert.ok(html.includes(paid.toLocaleString('en-US', { style: 'currency', currency: 'USD' })));
    assert.match(html, /aria-label=/);
    assert.doesNotMatch(html, /<input/);
  }
});
test('linked payment methods and latest date reflect the individual payments', () => {
  const summary: PaymentSummary = { status: 'paid', paid: 7066.07, total: 7066.07, payments: [
    { method: 'Cash', amount: 7000, date: '2026-10-21' },
    { method: 'Card', amount: 66.07, date: '2026-10-22' },
  ] };
  assert.equal(paymentCellText(summary, 'paymentMethod'), 'Cash, Card');
  assert.equal(paymentCellText(summary, 'paymentDate'), '2026-10-22');
  const html = renderToStaticMarkup(<LinkedPaymentCell summary={summary} field="paymentMethod" />);
  assert.match(html, /Cash, Card/);
  assert.match(html, /<button/);
});
