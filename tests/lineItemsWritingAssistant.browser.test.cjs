const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let chromium;
try { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')); } catch {}

test('writing assistant row hosts do not create extra line item columns', {
  skip: !chromium && 'Provide Playwright via PLAYWRIGHT_MODULE',
}, async () => {
  const css = fs.readFileSync(path.join(__dirname, '../src/index.css'), 'utf8');
  const rule = css.slice(css.indexOf('.line-items-table {'), css.indexOf('@layer components'));
  assert.ok(rule, 'Line items must isolate injected row children');
  const component = fs.readFileSync(path.join(__dirname,
    '../src/pages/estimates/components/estimateDashboard/estimateTab/LineItemsSection.tsx'), 'utf8');
  assert.match(component, /<table className="line-items-table w-full">/);
  const creation = fs.readFileSync(path.join(__dirname, '../src/pages/estimates/components/EstimateCreationForm.tsx'), 'utf8');
  assert.match(creation, /<table className="line-items-table w-full">/);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [1200, 600]) {
      for (const parent of ['table', 'tbody', 'tbody tr']) {
      const page = await browser.newPage({ viewport: { width, height: 800 } });
      await page.setContent(`<style>
        table { width: 100%; } th, td { border: 1px solid #ccc; }
        input, textarea { box-sizing: border-box; width: 100%; }
        tr { position: relative; }
      </style><table class="line-items-table">
        <thead><tr><th>Type</th><th>Name</th><th>Description</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
        <tbody><tr><td>Product</td><td><input aria-label="Name" value="Test"></td>
        <td><textarea aria-label="Description">Test product</textarea></td>
        <td><input value="1"></td><td>$60,000</td><td>$60,000</td></tr></tbody>
      </table>`);
      const bounds = () => page.locator('tbody td').evaluateAll(cells => cells.map(cell => {
        const rect = cell.getBoundingClientRect();
        return { x: rect.x, width: rect.width };
      }));
      await page.evaluate(() => {
        for (const row of document.querySelectorAll('tr')) {
          [...row.children].forEach((cell, index) => {
            cell.dataset.lineItemColumn = String(index + 2);
          });
        }
      });
      await page.addStyleTag({ content: rule });
      const before = await bounds();
      await page.evaluate(parent => {
        const host = document.createElement('grammarly-extension');
        host.innerHTML = '<button aria-label="Writing assistant">G</button>';
        document.querySelector(parent).prepend(host);
      }, parent);
      assert.deepEqual(await bounds(), before);
      const headers = await page.locator('thead th').evaluateAll(cells => cells.map(cell => {
        const rect = cell.getBoundingClientRect();
        return { x: rect.x, width: rect.width };
      }));
      assert.deepEqual(await bounds(), headers, 'Inputs remain aligned with their headers');
      await page.getByRole('button', { name: 'Writing assistant' }).click();
      const description = page.getByRole('textbox', { name: 'Description' });
      await description.fill('Updated description');
      await description.evaluate(el => { el.style.height = '96px'; });
      assert.deepEqual(await bounds(), before, 'Expanding the editor preserves column alignment');
      assert.equal(await description.inputValue(), 'Updated description');
      await page.close();
      }
    }
  } finally { await browser.close(); }
});
