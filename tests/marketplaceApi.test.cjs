const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
async function load(mock) {
  const { outputFiles } = await build({
    entryPoints: ['src/services/marketplace/index.ts'], bundle: true, write: false, platform: 'node', format: 'cjs',
    define: { 'import.meta.env.VITE_API_URL': '"https://api.test"' },
    plugins: [{ name: 'auth', setup(b) {
      b.onResolve({ filter: /apiAuth$|companySession$/ }, a => ({ path: a.path, namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, a => ({ contents: a.path.endsWith('apiAuth') ? `export const getApiAccessToken=()=>mock.token(); export const getAuth0Client=()=>({getUser:async()=>({sub:mock.subject})});` : `export const companyCacheScope=()=>mock.scope;` }));
    } }],
  });
  const mod = { exports: {} };
  new Function('module', 'exports', 'mock', 'fetch', outputFiles[0].text)(mod, mod.exports, mock, (...args) => mock.fetch(...args));
  return mod.exports;
}
test('marketplace adapter rejects company and identity changes before mutation fetch', async () => {
  let release; let calls = 0;
  const mock = { subject: 'client-a', scope: 'company-a:1', token: () => new Promise(resolve => { release = resolve; }), fetch: async () => { calls++; } };
  const api = await load(mock);
  const company = api.convertCompanyRequest('request', 1, { createClient: true });
  await new Promise(resolve => setImmediate(resolve));
  mock.scope = 'company-b:2'; release('token');
  await assert.rejects(company, { name: 'AbortError' });
  const client = api.updateEstimateRequest('request', 1, {});
  await new Promise(resolve => setImmediate(resolve));
  mock.subject = 'client-b'; release('token');
  await assert.rejects(client, { name: 'AbortError' }); assert.equal(calls, 0);
});
test('marketplace submit carries idempotency and photos use authenticated private endpoints', async () => {
  const calls = [];
  const mock = { subject: 'client-a', scope: 'company-a:1', token: async () => 'token', fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, status: 200, json: async () => ({ id: 'request' }), blob: async () => new Blob(['private']) }; } };
  const api = await load(mock);
  await api.submitEstimateRequest('r/1', 3, 'fingerprint', 'same-key');
  assert.equal(calls[0].url, 'https://api.test/marketplace/estimate-requests/r%2F1/submit');
  assert.deepEqual(JSON.parse(calls[0].options.body), { version: 3, catalogFingerprint: 'fingerprint', acknowledgeSharing: true, idempotencyKey: 'same-key' });
  assert.equal(calls[0].options.headers.get('Authorization'), 'Bearer token');
  await api.downloadRequestPhoto('r1', 'photo', true);
  assert.equal(calls[1].url, 'https://api.test/company/estimate-requests/r1/attachments/photo');
  mock.fetch = async () => ({ ok: false, status: 409, json: async () => ({ error: 'Services changed', code: 'CATALOG_CHANGED' }) });
  await assert.rejects(api.submitEstimateRequest('r1', 1, 'old', 'key'), value => value.code === 'CATALOG_CHANGED' && value.status === 409);
});
