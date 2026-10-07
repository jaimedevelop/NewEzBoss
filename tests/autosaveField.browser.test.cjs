const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
let chromium;
try { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')); } catch {}

test('a saved draft stays visible until refresh, and newer edits survive refresh', {
  skip: !chromium && 'Provide Playwright via PLAYWRIGHT_MODULE',
}, async () => {
  const { outputFiles } = await build({
    stdin: { contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { AutosaveInput } from './src/mainComponents/forms/AutosaveInput';
      const root = createRoot(document.getElementById('root'));
      window.value = '0';
      window.render = () => root.render(<AutosaveInput value={window.value}
        onCommit={next => new Promise(resolve => { window.pending = { next, resolve }; })} />);
      window.render();`, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' },
  });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="root"></div><button>Blur</button>');
    await page.addScriptTag({ content: outputFiles[0].text });
    const input = page.getByRole('textbox');
    await input.fill('50');
    await page.getByRole('button', { name: 'Blur' }).click();
    await page.waitForFunction(() => !!window.pending);
    await page.evaluate(() => window.pending.resolve({ ok: true }));
    await page.evaluate(() => window.render());
    assert.equal(await input.inputValue(), '50');
    await page.evaluate(() => { window.value = '50'; window.render(); });
    assert.equal(await input.inputValue(), '50');
    await input.fill('60');
    await page.getByRole('button', { name: 'Blur' }).click();
    await page.waitForFunction(() => window.pending.next === '60');
    await input.fill('70');
    await page.evaluate(() => { window.pending.resolve({ ok: true }); window.value = '60'; window.render(); });
    assert.equal(await input.inputValue(), '70');
    await page.getByRole('button', { name: 'Blur' }).click();
    await page.waitForFunction(() => window.pending.next === '70');
    await page.evaluate(() => window.pending.resolve({ ok: false, revert: true, message: 'Locked' }));
    await page.getByRole('alert').waitFor();
    assert.equal(await input.inputValue(), '60');
  } finally { await browser.close(); }
});
