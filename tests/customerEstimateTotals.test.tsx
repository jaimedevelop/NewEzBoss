import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClientViewDocPreview } from '../src/pages/estimates/components/estimateDashboard/clientViewTab/components/ClientViewDocPreview';
import MobileEstimateDoc from '../src/mobile/client/views/MobileEstimateDoc';

for (const [name, Component] of [['desktop', ClientViewDocPreview], ['mobile', MobileEstimateDoc]] as const) {
  test(`${name} document uses server totals even when individual prices are redacted`, () => {
    const estimate = {
      estimateNumber: 'EST-2026-015', customerName: 'Customer', createdDate: '2026-09-29',
      subtotal: 1, tax: 0.07, total: 1.07, taxRate: 7, discount: 0,
      lineItems: [{ id: '1', description: 'Work', quantity: 1, unitPrice: 0, total: 0 }],
    } as any;
    const settings = { displayMode: 'list', showItemPrices: false, showGroupPrices: false,
      showSubtotal: true, showTax: true, showTotal: true } as any;
    const html = renderToStaticMarkup(<Component estimate={estimate} settings={settings} groups={[]} />);
    assert.match(html, /\$1\.07/);
    assert.match(html, /\$0\.07/);
    assert.match(html, /\$1\.00/);
    const hidden = renderToStaticMarkup(<Component estimate={estimate} settings={{ ...settings, showTotal: false }} groups={[]} />);
    assert.doesNotMatch(hidden, /\$1\.07/);
  });
}
