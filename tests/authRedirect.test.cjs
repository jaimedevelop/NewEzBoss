const assert = require('node:assert/strict');
const test = require('node:test');
const { build } = require('esbuild');

test('Auth0 returns restore client routes without allowing external redirects', async () => {
  const {outputFiles}=await build({entryPoints:['src/services/authRedirect.ts'],bundle:true,write:false,format:'cjs',platform:'node'});
  const mod={exports:{}};
  new Function('module','exports',outputFiles[0].text)(mod,mod.exports);
  const safe=mod.exports.safeAuthReturnTo;
  assert.equal(safe('/marketplace/companies/test/plan?draft=1','https://app.test'),'/marketplace/companies/test/plan?draft=1');
  assert.equal(safe('/estimates/12#details','https://app.test'),'/estimates/12#details');
  for(const value of ['https://attacker.test','//attacker.test','/\\attacker.test','javascript:alert(1)',null,{},'relative']) {
    assert.equal(safe(value,'https://app.test','/landing'),'/landing');
  }
});
