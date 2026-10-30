const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');

test('company requests carry selected membership and reject late results after switch/logout', async () => {
  const { outputFiles } = await build({ entryPoints: ['src/services/companySession.ts'], bundle: true, write: false, platform: 'node', format: 'cjs', define: { 'import.meta.env.VITE_API_URL': '"https://api.test"' } });
  const calls = [];
  let finish;
  const window = { fetch: async (url, options) => { calls.push({url, options}); return new Promise(resolve => { finish = resolve; }); }, dispatchEvent() {} };
  const mod = { exports: {} };
  new Function('window', 'module', 'exports', outputFiles[0].text)(window, mod, mod.exports);
  const session = mod.exports;
  session.installCompanySession(); session.installCompanySession();
  session.setCompanySession('company-a');
  const first = window.fetch('https://api.test/estimates', { headers: { Authorization: 'Bearer synthetic' } });
  assert.equal(calls[0].options.headers.get('X-Company-Membership-Id'), 'company-a');
  assert.equal(calls[0].options.headers.get('Authorization'), 'Bearer synthetic');
  session.setCompanySession('company-b'); finish({ status: 200 });
  await assert.rejects(first, { name: 'AbortError' });
  const second = window.fetch('https://api.test/estimates/7');
  assert.equal(calls[1].options.headers.get('X-Company-Membership-Id'), 'company-b');
  session.setCompanySession(null); finish({ status: 200 });
  await assert.rejects(second, { name: 'AbortError' });
  const outside = window.fetch('https://outside.test/estimates');
  assert.equal(calls[2].options, undefined); finish({ status: 200 }); await outside;
});
