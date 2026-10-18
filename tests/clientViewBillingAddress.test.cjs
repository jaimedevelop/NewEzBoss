const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

test('document preview keeps empty billing fields separate from service fields', async () => {
  const result = await build({
    entryPoints: ['src/pages/estimates/components/estimateDashboard/clientViewTab/components/ClientViewDocPreview.tsx'],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    external: ['react', 'react-dom'],
    define: { 'import.meta.env': '{}' },
  });
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(mod, mod.exports, require);
  const estimate = {
    serviceAddress: 'Service Address 1', serviceAddress2: 'Service Address 2',
    serviceCity: 'Jacksonville', serviceState: 'FL', serviceZipCode: '33540',
    lineItems: [], subtotal: 0, tax: 0, total: 0,
  };
  const render = client => renderToStaticMarkup(React.createElement(mod.exports.ClientViewDocPreview, {
    estimate, client, settings: { displayMode: 'list' }, groups: [],
  }));
  const billingSection = html => html.split('Billing Address</p>')[1].split('Service Address</p>')[0];
  for (const billingAddress2 of ['', undefined, null]) {
    const html = render({ billingAddress: 'Billing Address 1', billingAddress2, billingCity: 'Lutz', billingState: 'FL', billingZipCode: '33549' });
    assert.match(billingSection(html), /Billing Address 1/);
    assert.match(billingSection(html), /Lutz, FL 33549/);
    assert.doesNotMatch(billingSection(html), /Service Address 2/);
    assert.equal(html.split('Service Address 2').length - 1, 1);
  }
  assert.match(billingSection(render({ billingAddress: 'Billing Address 1', billingAddress2: 'Suite 7' })), /Suite 7/);
  assert.doesNotMatch(billingSection(render({ billingAddress: 'Billing Address 1' })), /Jacksonville|33540/);
  for (const client of [null, undefined]) {
    assert.match(billingSection(render(client)), /Service Address 1/);
    assert.match(billingSection(render(client)), /Service Address 2/);
  }

  // PDF exports render this component without a separate client prop.
  estimate.estimateState = 'invoice';
  estimate.clientSnapshot = {
    billingAddress: 'Somewhere, Jamaica', billingAddress2: 'Suite 7',
    billingCity: 'Kingston', billingState: 'Surrey', billingZipCode: '12345',
  };
  const exportedHtml = render(undefined);
  assert.match(billingSection(exportedHtml), /Somewhere, Jamaica/);
  assert.match(billingSection(exportedHtml), /Suite 7/);
  assert.match(billingSection(exportedHtml), /Kingston, Surrey 12345/);
  assert.doesNotMatch(billingSection(exportedHtml), /Service Address 1|Service Address 2|Jacksonville|33540/);
  assert.match(exportedHtml.split('Service Address</p>')[1], /Service Address 1/);
  assert.match(billingSection(render({ billingAddress: 'Explicit client billing' })), /Explicit client billing/);
});
