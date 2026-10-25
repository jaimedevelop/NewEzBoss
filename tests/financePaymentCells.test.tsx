import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LinkedPaymentCell, { paymentCellText, PaymentStatus } from '../src/pages/finances/LinkedPaymentCell';
import type { PaymentSummary } from '../src/pages/finances/ledger';

test('linked payment cells show accessible status colors and formatted approved amounts', () => {
  for (const [status, paid, color] of [['unpaid', 0, 'red'], ['partial', 7000, 'yellow'], ['paid', 7066.07, 'green']] as const) {
    const summary: PaymentSummary = { status, paid, total: 7066.07, payments: [] };
    const html = renderToStaticMarkup(<LinkedPaymentCell summary={summary} field="payment" />);
    const statusHtml = renderToStaticMarkup(<PaymentStatus paid={paid} total={summary.total} />);
    assert.match(statusHtml, new RegExp(`bg-${color}-`));
    assert.ok(html.includes(paid.toLocaleString('en-US', { style: 'currency', currency: 'USD' })));
    assert.match(statusHtml, /aria-label=/);
    assert.equal(paymentCellText(summary, 'invoiceValue'), '$7,066.07');
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

test('manual status handles unknown totals, full payments, and overpayments', () => {
  for (const [paid, total, label] of [[0, null, 'Unpaid'], [50, null, 'Partially paid'], [50, 100, 'Partially paid'], [100, 100, 'Paid in full'], [150, 100, 'Paid in full']] as const) {
    assert.match(renderToStaticMarkup(<PaymentStatus paid={paid} total={total} />), new RegExp(`aria-label="${label}"`));
  }
});
