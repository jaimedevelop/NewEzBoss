const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const path = require('node:path');

test('client view saves assignments without replacing line item identities or values', async () => {
  const requests = [];
  const result = await build({
    entryPoints: [path.resolve('src/services/estimates/estimates.clientView.ts')],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    plugins: [{ name: 'api', setup(b) {
      b.onResolve({ filter: /estimatesApi$/ }, a => ({ path: a.path, namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export const estimatesApiRequest = async (url, options) => requests.push({url, body: JSON.parse(options.body)}); export const estimatesPublicApiRequest = estimatesApiRequest; export class ApiError extends Error {};' }));
    } }],
  });
  const mod = { exports: {} };
  new Function('requests', 'module', 'exports', result.outputFiles[0].text)(requests, mod, mod.exports);
  await mod.exports.updateClientViewSettings('81', { displayMode: 'custom', hiddenLineItems: ['12'] },
    [{ id: 'draft-group', name: 'Kitchen', showPrice: true }],
    [{ id: '12', description: 'Paint', quantity: 2, unitPrice: 50, total: 100, groupId: 'draft-group' }]);
  const body = requests[0].body;
  assert.equal(body.lineItems, undefined);
  assert.deepEqual(body.itemGroupAssignments, { 12: 'draft-group' });
  assert.equal(body.groups[0].clientId, 'draft-group');
  assert.deepEqual(body.settings.hiddenLineItems, [12]);
});
