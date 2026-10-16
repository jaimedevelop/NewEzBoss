const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

test('client PDF keeps payment and schedule calendar dates in local time zones', async () => {
  const result = await build({
    entryPoints: ['src/pages/estimates/components/estimateDashboard/clientViewTab/components/ClientViewDocPreview.tsx'],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    external: ['react', 'react-dom'], define: { 'import.meta.env': '{}' },
  });
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(mod, mod.exports, require);
  const original = process.env.TZ;
  try {
    for (const timezone of ['America/New_York', 'America/Los_Angeles', 'Asia/Tokyo']) {
      process.env.TZ = timezone;
      for (const date of ['2026-10-16', '2026-10-16T00:00:00.000Z']) {
        const html = renderToStaticMarkup(React.createElement(mod.exports.ClientViewDocPreview, {
          estimate: { lineItems: [], subtotal: 1000, tax: 0, total: 1000,
            payments: [{ id: '1', amount: 200, status: 'approved', date, method: 'Cash' }],
            paymentSchedule: { mode: 'sum', entries: [{ id: '1', description: 'Deposit', value: 200, dueDate: date }] },
          },
          settings: { displayMode: 'list', showTotal: true, showPaymentSchedule: true }, groups: [],
        }));
        assert.match(html, /Payment History/);
        assert.equal((html.match(/Oct 16, 2026/g) || []).length, 2, timezone + ': ' + date);
        assert.doesNotMatch(html, /Oct 15, 2026/);
      }
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
