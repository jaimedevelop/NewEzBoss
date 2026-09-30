const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { build } = require('esbuild');

async function setup(estimate = { id: '81' }) {
  const views = [];
  const result = await build({
    entryPoints: [path.resolve(__dirname, '../src/services/clients/publicEstimate.ts')],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    plugins: [{ name: 'estimate-api', setup(builder) {
      builder.onResolve({ filter: /^\.\.\/estimates$/ }, () => ({ path: 'estimates', namespace: 'mock' }));
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `
        export const getEstimateByToken = async () => mock.estimate;
        export const trackEmailOpen = async token => { mock.views.push(token); };
      ` }));
    } }],
  });
  const mod = { exports: {} };
  new Function('mock', 'module', 'exports', result.outputFiles[0].text)({ estimate, views }, mod, mod.exports);
  return { ...mod.exports, views };
}

test('each visit to an email or shared link records another view', async () => {
  const service = await setup();
  await service.getPublicEstimate('shared-token');
  await service.getPublicEstimate('shared-token');
  assert.deepEqual(service.views, ['shared-token', 'shared-token']);
});

test('refreshing after a client action does not inflate the view count', async () => {
  const service = await setup();
  await service.getPublicEstimate('shared-token');
  const estimate = await service.getPublicEstimate('shared-token', { recordView: false });
  assert.equal(estimate.id, '81');
  assert.equal(service.views.length, 1);
});

test('invalid links do not record a view', async () => {
  const service = await setup(null);
  assert.equal(await service.getPublicEstimate('invalid'), null);
  assert.equal(service.views.length, 0);
});
