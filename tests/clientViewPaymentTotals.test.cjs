const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

test('preview and PDF document show approved paid and remaining totals between payment schedule and history', async () => {
  const result = await build({
    entryPoints: ['src/pages/estimates/components/estimateDashboard/clientViewTab/components/ClientViewDocPreview.tsx'],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    external: ['react', 'react-dom'], define: { 'import.meta.env': '{}' },
  });
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(mod, mod.exports, require);
  const render = (payments, showTotal = true) => renderToStaticMarkup(React.createElement(mod.exports.ClientViewDocPreview, {
    estimate: {
      lineItems: [], subtotal: 1000, tax: 0, total: 1000, estimateState: 'invoice', payments,
      paymentSchedule: { mode: 'amount', entries: [{ id: 'deposit', description: 'Deposit', value: 300 }] },
    },
    settings: { displayMode: 'list', showTotal }, groups: [],
  }));
  const html = render([
    { id: '1', amount: 200, status: 'approved' },
    { id: '2', amount: 100, status: 'approved' },
    { id: '3', amount: 50, status: 'pending' },
    { id: '4', amount: 75, status: 'rejected' },
  ]);
  assert.match(html, /Total Paid<\/p><p[^>]*>\$300\.00/);
  assert.match(html, /Remaining Total<\/p><p[^>]*>\$700\.00/);
  assert.ok(html.indexOf('Payment Schedule') < html.indexOf('Total Paid'));
  assert.ok(html.indexOf('Remaining Total') < html.indexOf('Payment History'));
  assert.match(render([]), /Remaining Total<\/p><p[^>]*>\$1,000\.00/);
  for (const amount of [1000, 1100]) {
    assert.match(render([{ id: 'paid', amount, status: 'approved' }]), /Remaining Total<\/p><p[^>]*>\$0\.00/);
  }
  assert.doesNotMatch(render([], false), /Total Paid|Remaining Total/);
});
