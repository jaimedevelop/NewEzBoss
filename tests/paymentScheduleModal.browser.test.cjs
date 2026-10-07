// Run with node --test; set PLAYWRIGHT_MODULE to the available browser runtime.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
let chromium;
try { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')); } catch { /* Optional browser runtime. */ }

test('saved schedules can change units despite parent refreshes and reopen with saved values', {
  skip: !chromium && 'Provide Playwright via PLAYWRIGHT_MODULE',
}, async () => {
  const { outputFiles } = await build({
    stdin: { contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import PaymentScheduleModal from './src/pages/estimates/components/PaymentScheduleModal';
      const root = createRoot(document.getElementById('root'));
      window.schedule = { mode: 'percentage', entries: [
        { id: '1', description: 'Deposit', value: 25, dueDate: '2026-10-10' },
        { id: '2', description: 'Final Payment', value: 75, dueDate: '2026-10-11' },
      ] };
      window.render = (isOpen = true) => root.render(<PaymentScheduleModal
        isOpen={isOpen} estimateTotal={1000} estimateDate="2026-10-07"
        initialSchedule={JSON.parse(JSON.stringify(window.schedule))}
        onClose={() => window.render(false)}
        onSave={next => { window.schedule = next; return true; }} />);
      window.render();`, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' },
  });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: outputFiles[0].text });
    const mode = page.getByRole('combobox').first();
    const values = page.getByRole('spinbutton');
    for (const [unit, amounts] of [['sum', [250, 750]], ['percentage', [40, 60]]]) {
      await mode.selectOption(unit);
      assert.equal(await values.nth(0).inputValue(), '');
      await values.nth(0).fill(String(amounts[0]));
      await page.evaluate(() => window.render());
      assert.equal(await mode.inputValue(), unit);
      assert.equal(await values.nth(0).inputValue(), String(amounts[0]));
      await values.nth(1).fill(String(amounts[1]));
      await page.getByRole('button', { name: 'Save Schedule', exact: true }).click();
      await page.getByRole('button', { name: 'Save Schedule', exact: true }).waitFor({ state: 'hidden' });
      assert.equal(await page.evaluate(() => window.schedule.mode), unit);
      await page.evaluate(() => window.render());
      await mode.waitFor();
      assert.equal(await mode.inputValue(), unit);
      assert.deepEqual(await values.evaluateAll(inputs => inputs.map(input => Number(input.value))), amounts);
    }
    await values.nth(0).fill('10');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await mode.waitFor({ state: 'hidden' });
    await page.evaluate(() => window.render());
    await mode.waitFor();
    assert.equal(await values.nth(0).inputValue(), '40');
  } finally {
    await browser.close();
  }
});
