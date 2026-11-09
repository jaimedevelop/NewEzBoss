const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const vm = require('node:vm');

test('independent tabs reject stale writes and confirmed 204 versions advance the local queue', async () => {
  const { outputFiles } = await build({ entryPoints: ['src/services/estimates/estimatesApi.ts'], bundle: true, write: false, platform: 'node', format: 'cjs',
    define: { 'import.meta.env.VITE_API_URL': '"https://api.example.test"' },
    plugins: [{ name: 'auth', setup(builder) { builder.onResolve({ filter: /apiAuth$/ }, () => ({ path: 'auth', external: true })); } }],
  });
  let version = '2026-10-31T12:00:00.000Z';
  let writes = 0;
  const fetch = async (_url, request) => {
    if (request.method && request.method !== 'GET') {
      if (request.headers['X-Document-Version'] !== version) return { ok: false, status: 409, json: async () => ({ error: 'This document changed. Reload before saving your edits.' }) };
      writes++; version = `2026-10-31T12:00:0${writes}.000Z`;
    }
    return { ok: true, status: request.method === 'DELETE' ? 204 : 200,
      headers: { get: () => version }, json: async () => ({ id: 7, updatedAt: version }) };
  };
  function tab() {
    const module = { exports: {} };
    vm.runInNewContext(outputFiles[0].text, { module, exports: module.exports, fetch, FormData, Event, window: { dispatchEvent() {} },
      require: () => ({ getApiAccessToken: async () => 'synthetic' }) });
    return module.exports.estimatesApiRequest;
  }
  const a = tab(), b = tab();
  await a('/estimates/7'); await b('/estimates/7');
  await a('/estimates/7', { method: 'PATCH', body: '{}' });
  const exported = await b('/estimates/7/export');
  assert.equal(exported.updatedAt, version);
  await assert.rejects(b('/estimates/7', { method: 'PATCH', body: '{}' }), error => error.status === 409);
  assert.equal(writes, 1);
  await a('/estimates/7/line-items/4', { method: 'DELETE' });
  await a('/estimates/7', { method: 'PATCH', body: '{}' });
  assert.equal(writes, 3);
  await b('/estimates/7');
  await b('/estimates/7', { method: 'PATCH', body: '{}' });
  assert.equal(writes, 4);
});
