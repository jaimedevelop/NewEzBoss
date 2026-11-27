const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { build } = require('esbuild');
let chromium;
try { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')); } catch { /* Optional browser runtime. */ }

test('estimate history keeps local dates and saved changes stable on desktop and mobile', {
  skip: !chromium && 'Provide Playwright via PLAYWRIGHT_MODULE',
}, async () => {
  const { outputFiles } = await build({
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import { createRoot } from 'react-dom/client';
      import RevisionHistory from './src/pages/estimates/components/estimateDashboard/historyTab/RevisionHistory';
      const root = createRoot(document.getElementById('root'));
      const revisions = [
        { revisionNumber: 1, date: '2026-11-24T02:00:00Z', changes: 'Original addition',
          details: { historyChanges: [{ kind: 'added', label: 'Original trim', quantity: 1, unitPrice: 25, total: 25 }] } },
        { revisionNumber: 2, date: '2026-11-24T19:00:00Z', changes: 'Estimate details updated',
          details: { historyChanges: [
            { kind: 'removed', label: 'Original trim', quantity: 1, unitPrice: 25, total: 25 },
            { kind: 'added', label: 'New trim', quantity: 2, unitPrice: 25, total: 50 },
          ] } },
        { revisionNumber: 3, date: '2026-11-24T21:00:00Z', changes: 'Estimate image added',
          details: { historyChanges: [{ kind: 'added', label: 'trim.jpg' }] } },
      ].map(event => ({ modifiedByName: 'Contractor', previousTotal: 25, newTotal: 25, ...event }));
      window.renderHistory = (later = false) => root.render(<RevisionHistory estimate={{
        revisionsHistory: later ? [...revisions, { revisionNumber: 4, date: '2026-11-25T21:00:00Z',
          changes: 'Estimate image removed', modifiedByName: 'Contractor', previousTotal: 25, newTotal: 25,
          details: { historyChanges: [{ kind: 'removed', label: 'trim.jpg' }] } }] : revisions,
        lineItems: [{ description: later ? 'Current revision after refresh' : 'Current estimate only' }],
      }} />);
      window.renderHistory();
    ` },
    jsx: 'automatic', bundle: true, write: false, format: 'iife', logLevel: 'error',
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' },
  });
  const assets = process.env.EZBOSS_HISTORY_WEB_ASSETS;
  const stylesheet = assets && fs.readdirSync(assets).find(file => /^index-.*\.css$/.test(file));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 800 }, timezoneId: 'America/New_York' });
      await page.setContent('<meta name="viewport" content="width=device-width, initial-scale=1"><div id="root"></div>');
      if (stylesheet) await page.addStyleTag({ path: `${assets}/${stylesheet}` });
      await page.addScriptTag({ content: outputFiles[0].text });
      const original = page.getByRole('button', { name: /11\/23\/2026/ });
      const revised = page.getByRole('button', { name: /11\/24\/2026/ });
      await original.waitFor();
      assert.equal(await original.getAttribute('aria-pressed'), 'true');
      const history = page.locator('article');
      const firstDay = await history.allTextContents();
      assert.match(firstDay.join(' '), /Original trim/);
      assert.doesNotMatch(firstDay.join(' '), /New trim|trim\.jpg|Current estimate only/);

      await revised.click();
      const oldLine = history.getByText('Original trim', { exact: true });
      const newLine = history.getByText('New trim', { exact: true });
      assert.match(await oldLine.getAttribute('class'), /line-through/);
      assert.match(await oldLine.locator('..').getAttribute('class'), /border-red-500/);
      assert.match(await newLine.locator('..').getAttribute('class'), /border-green-500/);
      if (stylesheet) {
        const border = locator => locator.locator('..').evaluate(el => getComputedStyle(el).borderLeftColor);
        assert.notEqual(await border(oldLine), await border(newLine));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      }
      assert.equal(await history.getByText('trim.jpg', { exact: true }).count(), 1);
      await page.evaluate(() => window.renderHistory(true));
      await page.getByRole('button', { name: /11\/25\/2026/ }).waitFor();
      assert.equal(await revised.getAttribute('aria-pressed'), 'true');
      await original.click();
      assert.deepEqual(await history.allTextContents(), firstDay);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
