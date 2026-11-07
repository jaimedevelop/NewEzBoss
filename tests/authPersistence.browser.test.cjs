const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { chromium } = require('playwright');

// Exercise the real Auth0 SDK and startup cleanup with a valid cached session;
// no live tenant or credentials are required.
for (const width of [1280, 390]) test(`SDK session survives refresh/new tab at ${width}px and clears on logout`, async () => {
  const { outputFiles } = await build({
    stdin: { contents: "import { getAuth0Client } from './src/services/apiAuth'; window.sdk = getAuth0Client();", resolveDir: process.cwd() },
    bundle: true, write: false, format: 'iife',
    define: { 'import.meta.env': JSON.stringify({ VITE_AUTH0_DOMAIN:'auth.test', VITE_AUTH0_CLIENT_ID:'test', VITE_AUTH0_AUDIENCE:'api.test' }) },
  });
  const browser = await chromium.launch({ channel:'chrome', headless:true });
  try {
    const context = await browser.newContext({viewport:{width,height:844}});
    await context.route('https://app.test/**', route => route.fulfill({contentType:'text/html',body:'<div>Fixture</div>'}));
    const page = await context.newPage();
    await page.goto('https://app.test');
    await page.evaluate(() => {
      const scope = 'openid profile email offline_access';
      localStorage.setItem('@@auth0spajs@@::test::api.test::'+scope, JSON.stringify({
        body:{client_id:'test',audience:'api.test',scope,access_token:'fixture-access',expires_in:3600},
        expiresAt:Math.floor(Date.now()/1000)+3600
      }));
      localStorage.setItem('@@auth0spajs@@::test::@@user@@', JSON.stringify({
        id_token:'fixture-id',decodedToken:{user:{sub:'auth0|alice'},claims:{sub:'auth0|alice'}}
      }));
    });
    const verify = async tab => {
      await tab.addScriptTag({content:outputFiles[0].text});
      assert.equal(await tab.evaluate(() => window.sdk.getTokenSilently()), 'fixture-access');
      assert.equal(await tab.evaluate(async () => (await window.sdk.getUser()).sub), 'auth0|alice');
    };
    await verify(page);
    await page.reload();
    await verify(page);
    const second = await context.newPage();
    await second.goto('https://app.test');
    await verify(second);
    await second.evaluate(() => window.sdk.logout({openUrl:false}));
    await page.reload();
    await page.addScriptTag({content:outputFiles[0].text});
    assert.equal(await page.evaluate(() => window.sdk.isAuthenticated()), false);
    assert.equal(await page.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('@@auth0spajs@@'))), false);
  } finally { await browser.close(); }
});
