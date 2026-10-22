const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
let chromium;
try { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')); } catch {}

test('client states commit clicks despite browser button focus behavior and support keyboard selection', {
  skip: !chromium && 'Provide Playwright via PLAYWRIGHT_MODULE',
}, async () => {
  const { outputFiles } = await build({
    stdin: { contents: `
      import React, { useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import { ClientStateFilter } from './src/pages/estimates/components/ClientStateFilter';
      function App() {
        const [value, setValue] = useState('all');
        return <ClientStateFilter value={value} onChange={setValue} />;
      }
      createRoot(document.getElementById('root')).render(<App />);
      // Model browsers that blur the old button without focusing the clicked one.
      document.addEventListener('mousedown', event => {
        if (event.target.closest('[role="menuitemradio"]') && !event.defaultPrevented) {
          document.activeElement?.blur();
        }
      });`, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent('<div id="root"></div><button>Outside</button>');
    await page.addScriptTag({ content: outputFiles[0].text });
    const trigger = page.getByRole('button', { name: /^Client States:/ });
    for (const label of ['Sent', 'Viewed', 'Accepted', 'Denied', 'On Hold', 'Expired', 'Invoiced', 'All Client States']) {
      await trigger.click();
      await page.getByRole('menuitemradio', { name: label, exact: true }).click();
      assert.equal(await trigger.getAttribute('aria-label'), `Client States: ${label}`);
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    }
    await trigger.press('ArrowDown');
    await page.getByRole('menuitemradio', { name: 'All Client States', exact: true }).press('ArrowDown');
    await page.keyboard.press('Enter');
    assert.equal(await trigger.getAttribute('aria-label'), 'Client States: Invoiced');
    await trigger.click();
    await page.keyboard.press('Escape');
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
    await trigger.click();
    await page.getByRole('button', { name: 'Outside' }).click();
    assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
  } finally { await browser.close(); }
});
