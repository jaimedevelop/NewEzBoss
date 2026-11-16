const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { chromium } = require('playwright');

test('project estimate deletion confirms, preserves failures, and updates the list on success', async () => {
  const { outputFiles } = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { BrowserRouter } from 'react-router-dom';
        import EstimatesSection from './src/pages/projects/components/estimates/EstimatesSection';
        createRoot(document.getElementById('root')).render(
          <BrowserRouter><EstimatesSection projectId="oak-street" /></BrowserRouter>
        );`,
      resolveDir: process.cwd(),
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    format: 'iife',
    jsx: 'automatic',
    loader: { '.css': 'empty' },
    define: { 'process.env.NODE_ENV': '"production"', 'import.meta.env': '{}' },
    plugins: [{
      name: 'project-estimate-delete-fixtures',
      setup(builder) {
        builder.onResolve({ filter: /(?:AuthContext|services\/estimates)$/ }, ({ path }) =>
          ({ path, namespace: 'fixture' }));
        builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
          contents: path.endsWith('AuthContext')
            ? 'export const useAuthContext = () => ({ canPerform: () => true });'
            : `
              export const getEstimatesByProject = async () => {
                window.listRequests++;
                return [{
                  id: '1', estimateNumber: 'EST-483', estimateState: 'estimate',
                  customerName: 'Bobby Charlton', createdDate: '2026-11-11', total: 12,
                }];
              };
              export const duplicateEstimate = async () => {};
              export const deleteEstimate = async id => {
                window.deleteRequests.push(id);
                if (window.deleteRequests.length === 1) throw new Error('Estimate could not be deleted.');
              };`,
        }));
      },
    }],
  });

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.setDefaultTimeout(6000);
      await page.setContent('<div id="root"></div>');
      await page.evaluate(() => {
        window.listRequests = 0;
        window.deleteRequests = [];
      });
      await page.addScriptTag({ content: outputFiles[0].text });
      const row = page.getByRole('row', { name: /EST-483/ });
      const deleteButton = row.getByRole('button', { name: 'Delete estimate' });
      const warning = page.getByRole('alertdialog', { name: 'Delete EST-483?' });

      await deleteButton.click();
      await warning.getByText('Bobby Charlton', { exact: false }).waitFor();
      assert.match(await warning.innerText(), /Date created:.*Price: \$12\.00/s);
      assert.match(await warning.innerText(), /Recently Deleted for 30 days/);
      assert.deepEqual(await page.evaluate(() => window.deleteRequests), []);
      await warning.getByRole('button', { name: 'Cancel' }).click();
      await warning.waitFor({ state: 'hidden' });
      await row.waitFor();
      assert.deepEqual(await page.evaluate(() => window.deleteRequests), []);

      await deleteButton.click();
      await warning.getByRole('button', { name: 'Delete', exact: true }).click();
      await page.getByRole('alert').getByText('Estimate could not be deleted.').waitFor();
      await row.waitFor();

      await page.getByLabel('Document type').selectOption('estimate');
      await deleteButton.click();
      await warning.getByRole('button', { name: 'Delete', exact: true }).click();
      const banner = page.getByRole('status');
      await banner.getByText('Estimate EST-483 deleted successfully!').waitFor();
      await row.waitFor({ state: 'detached' });
      await page.getByRole('heading', { name: 'No Estimates Yet' }).waitFor();
      assert.deepEqual(await page.evaluate(() => [window.listRequests, window.deleteRequests]), [1, ['1', '1']]);
      await banner.getByRole('button', { name: 'Dismiss message' }).click();
      await banner.waitFor({ state: 'detached' });
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
