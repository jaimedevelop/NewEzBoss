import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import DashboardHeader from '../src/pages/estimates/components/estimateDashboard/DashboardHeader';

function render(estimate: React.ComponentProps<typeof DashboardHeader>['estimate']) {
  return renderToStaticMarkup(<StaticRouter location="/estimates/7"><DashboardHeader estimate={estimate} onBack={() => {}} /></StaticRouter>);
}
test('invoice header displays its independent identity and links to the estimate', () => {
  const html = render({ id: '22', estimateState: 'invoice', invoiceNumber: 'INV-2026-01', estimateNumber: 'EST-2026-07', sourceEstimateId: '7', customerName: 'Customer' });
  assert.match(html, /<h1[^>]*>INV-2026-01<\/h1>/);
  assert.match(html, /href="\/estimates\/7">Estimate: EST-2026-07<\/a>/);
});
test('preserved estimate header links to the existing invoice', () => {
  const html = render({ id: '7', estimateState: 'estimate', estimateNumber: 'EST-2026-07', issuedInvoiceId: '22', issuedInvoiceNumber: 'INV-2026-01', customerName: 'Customer' });
  assert.match(html, /<h1[^>]*>EST-2026-07<\/h1>/);
  assert.match(html, /href="\/estimates\/22">Invoice: INV-2026-01<\/a>/);
});
test('shared header still accepts work-order and unlinked legacy document props', () => {
  assert.match(render({ estimateNumber: 'WO-2026-01', customerName: 'Customer' }), /WO-2026-01/);
  const legacy = render({ estimateState: 'invoice', estimateNumber: 'EST-2026-07', customerName: 'Customer' });
  assert.match(legacy, /Number pending/);
  assert.doesNotMatch(legacy, /href="\/estimates\//);
});
