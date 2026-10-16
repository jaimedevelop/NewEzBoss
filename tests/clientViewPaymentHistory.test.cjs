const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

test('estimate and invoice PDFs show approved payment history even with totals and schedule hidden', async () => {
  const result = await build({
    entryPoints: ['src/pages/estimates/components/estimateDashboard/clientViewTab/components/ClientViewDocPreview.tsx'],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    external: ['react', 'react-dom'], define: { 'import.meta.env': '{}' },
  });
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(mod, mod.exports, require);
  for (const estimateState of ['estimate', 'invoice']) {
    const render = (payments) => renderToStaticMarkup(React.createElement(mod.exports.ClientViewDocPreview, {
      estimate: { estimateState, lineItems: [], subtotal: 1000, tax: 0, total: 1000, payments },
      settings: { displayMode: 'list', showTotal: false }, groups: [],
    }));
    const approved = { id: '1', amount: 200, status: 'approved', date: '2026-10-15T12:00:00Z', method: 'Cash', notes: 'Received deposit' };
    const pending = { ...approved, id: '2', status: 'pending', notes: 'Pending transfer' };
    const rejected = { ...approved, id: '3', status: 'rejected', notes: 'Rejected transfer' };
    const html = render([approved, pending, rejected]);
    assert.match(html, /Payment History/);
    assert.match(html, /Received deposit/);
    assert.match(html, /\$200\.00/);
    assert.doesNotMatch(html, /Pending transfer|Rejected transfer/);
    assert.doesNotMatch(render([pending, rejected]), /Payment History/);
    assert.doesNotMatch(render([]), /Payment History/);
  }
});
