const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
let chromium;
try { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')); } catch { /* Optional runtime. */ }

test('directory editor explicitly publishes/unpublishes, saves visibility and preserves failed edits', {
  skip: !chromium && 'Provide Playwright via PLAYWRIGHT_MODULE',
}, async () => {
  const { outputFiles } = await build({
    stdin: { contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import DirectoryProfileEditor from './src/pages/browser/DirectoryProfileEditor';
      window.membership = 'company-a'; window.saved = []; window.fail = false;
      window.profile = { slug: 'alligator', displayName: 'Mr. Alligator Renovations', description: '',
        industries: ['construction'], trades: ['Plumbing'], services: [], serviceArea: '',
        publicEmail: '', publicPhone: '', website: '', published: false };
      const root = createRoot(document.getElementById('root'));
      window.render = () => root.render(<DirectoryProfileEditor />); window.render();
    `, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, format: 'iife', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'directory-mocks', setup(builder) {
      builder.onResolve({ filter: /contexts\/AuthContext$|services\/directory$/ }, args => ({ path: args.path, namespace: 'mock' }));
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: args.path.includes('AuthContext')
        ? `export const useAuthContext = () => ({ membershipId: window.membership });`
        : `export const getDirectoryProfile = async () => ({ ...window.profile });
           export const getDirectoryIndustries = async () => ({ industries: [
             { slug: 'construction', name: 'Construction' }, { slug: 'beauty', name: 'Beauty' }] });
           export const saveDirectoryProfile = async body => {
             if (window.fail) throw new Error('Save failed. Try again.');
             window.saved.push(JSON.parse(JSON.stringify(body)));
             window.profile = { ...body, slug: window.profile.slug }; return window.profile; };`,
      }));
    } }],
  });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('about:blank');
    await page.setContent('<div id="root"></div>');
    await page.addScriptTag({ content: outputFiles[0].text });
    await page.getByLabel('Company display name', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Public business email', { exact: true }).inputValue(), '');
    assert.equal(await page.getByLabel('Public business phone', { exact: true }).inputValue(), '');
    await page.getByLabel(/^Trades/).fill('Plumbing\n Plumbing , Renovation');
    await page.getByRole('button', { name: 'Add service', exact: true }).click();
    await page.getByLabel('Service name', { exact: true }).fill('Pipe repairs');
    await page.getByLabel('Service description', { exact: true }).fill('Household pipe repair');
    await page.getByRole('button', { name: 'Preview details', exact: true }).click();
    await page.getByText('Unsaved details preview', { exact: true }).waitFor();
    await page.getByRole('checkbox', { name: /Publish company profile in Browser/ }).check();
    await page.getByRole('button', { name: 'Save directory profile', exact: true }).click();
    await page.getByText('Directory profile saved and published in Browser.', { exact: true }).waitFor();
    const published = await page.evaluate(() => window.saved[0]);
    assert.equal(published.published, true);
    assert.deepEqual(published.trades, ['Plumbing', 'Renovation']);
    assert.deepEqual(published.services, [{ name: 'Pipe repairs', description: 'Household pipe repair', published: true }]);
    assert.equal('slug' in published, false);
    assert.equal('ownerId' in published, false);
    await page.getByRole('checkbox', { name: 'Show this service when the company profile is published' }).uncheck();
    await page.getByRole('checkbox', { name: /Publish company profile in Browser/ }).uncheck();
    await page.getByRole('button', { name: 'Save directory profile', exact: true }).click();
    await page.getByText('Draft saved. Your company is hidden from Browser.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.saved[1].published), false);
    assert.equal(await page.evaluate(() => window.saved[1].services[0].published), false);
    await page.evaluate(() => { window.fail = true; });
    await page.getByLabel('Company display name', { exact: true }).fill('Updated company');
    await page.getByRole('button', { name: 'Save directory profile', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Save failed. Try again.' }).waitFor();
    assert.equal(await page.getByLabel('Company display name', { exact: true }).inputValue(), 'Updated company');
    assert.equal(await page.evaluate(() => window.saved.length), 2);
    await page.evaluate(() => {
      window.fail = false;
      window.profile = { ...window.profile, displayName: 'Company B', services: [], trades: [] };
      window.membership = 'company-b'; window.render();
    });
    await page.waitForFunction(() => document.querySelector('input')?.value === 'Company B');
    assert.equal(await page.getByRole('alert').count(), 0);
  } finally { await browser.close(); }
});
