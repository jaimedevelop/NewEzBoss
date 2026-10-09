const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');

test('estimate search covers identifiers, contact details and saved addresses', async () => {
  const result = await build({ entryPoints: ['src/pages/estimates/estimateSearch.ts'], bundle: true, write: false, platform: 'node', format: 'cjs' });
  const mod = { exports: {} };
  new Function('module', 'exports', result.outputFiles[0].text)(mod, mod.exports);
  const matches = mod.exports.matchesEstimateSearch;
  const estimate = {
    customerName: 'Jane Smith', estimateNumber: 'EST-42', invoiceNumber: 'INV-99',
    poNumber: 'PO-123', customerEmail: 'jane@example.com', customerPhone: '(212) 555-0123',
    serviceAddress: '10 Main Street', serviceAddress2: 'Unit 2', serviceCity: 'Brooklyn', serviceState: 'NY', serviceZipCode: '11201',
    clientSnapshot: { billingAddress: '50 Oak Road', billingAddress2: 'Suite 7', billingCity: 'Albany', billingState: 'NY', billingZipCode: '12201', phoneOther: '518-555-0199' },
  };
  for (const query of [' JANE ', 'est-42', 'inv-99', 'po-123', 'EXAMPLE.COM', '2125550123', '212-555-0123', '(518) 555 0199', 'Main Street Unit 2 Brooklyn', '11201', 'Oak Road Suite 7 Albany', '12201', '', '   ']) {
    assert.equal(matches(estimate, query), true, query);
  }
  for (const query of ['missing', 'PO-5550123', '50 Elm Road']) assert.equal(matches(estimate, query), false, query);
  const estimates = [
    { lineItemSearchText: ['Toilet installation', 'Supply and fit'] },
    { lineItemSearchText: ['Plumbing', 'Replace downstairs TOILET fixture'] },
    { lineItemSearchText: ['Sink installation'] },
  ];
  assert.deepEqual(estimates.filter(estimate => matches(estimate, ' Toilet ')), estimates.slice(0, 2));
  assert.equal(matches({ lineItems: [{ name: 'Toilet', description: 'Install fixture' }] }, 'toilet'), true);
  assert.equal(matches({ lineItems: [{ description: 'Replace toilet seat' }] }, 'toilet'), true);
  assert.equal(matches({ lineItemSearchText: [] }, 'toilet'), false);
  assert.equal(matches({ lineItemSearchText: ['Toi', 'let'] }, 'toilet'), false);
  assert.equal(matches({}, 'missing'), false);
  assert.equal(matches({}, ' '), true);
});
