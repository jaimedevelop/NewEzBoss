const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { build } = require('esbuild');

async function setup() {
  const calls = [];
  const result = await build({
    entryPoints: [path.resolve(__dirname, '../src/services/clients/clients.mutations.ts')],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    plugins: [{ name: 'client-api', setup(builder) {
      builder.onResolve({ filter: /^\.\/clientsApi$/ }, () => ({ path: 'api', namespace: 'mock' }));
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `
        export const clientsApiRequest = async (path, options) => {
          calls.push({ path, body: JSON.parse(options.body) });
          return { id: 12 };
        };
      ` }));
    } }],
  });
  const mod = { exports: {} };
  new Function('calls', 'module', 'exports', result.outputFiles[0].text)(calls, mod, mod.exports);
  return { ...mod.exports, calls };
}

const client = { name: 'Jane', phoneMobile: '2125557896', billingAddress: '123 Main St',
  billingCity: 'Tampa', billingState: 'FL', billingZipCode: '33601' };

test('clients can be created without email and have their email cleared on edit', async () => {
  const service = await setup();
  assert.equal(service.validateClientData(client).isValid, true);
  assert.equal(service.isClientComplete(client), true);
  assert.equal((await service.createClient(client, 'owner')).success, true);
  assert.equal(Object.hasOwn(service.calls[0].body, 'email'), false);
  assert.equal((await service.updateClient('12', { email: '' })).success, true);
  assert.equal(service.calls[1].body.email, '');
  assert.equal(service.isClientComplete({ ...client, email: '' }), true);
  assert.equal(service.isClientComplete({ ...client, billingCity: '' }), false);
});

test('provided emails still require a valid format', async () => {
  const service = await setup();
  assert.deepEqual(service.validateClientData({ ...client, email: 'invalid' }).errors, ['Invalid email format']);
  assert.equal(service.validateClientData({ ...client, email: 'jane@example.com' }).isValid, true);
});
