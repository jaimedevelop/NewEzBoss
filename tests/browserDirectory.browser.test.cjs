const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
let chromium;
try { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')); } catch {}

test('Browser searches trades, combines categories, restores results from details, and rejects stale responses', {
  skip: !chromium && 'Provide Playwright via PLAYWRIGHT_MODULE',
}, async () => {
  const { outputFiles } = await build({
    stdin: { contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { BrowserRouter, Routes, Route } from 'react-router-dom';
      import Browser from './src/pages/browser/Browser';
      import CompanyDetails from './src/pages/browser/CompanyDetails';
      window.searches = []; window.member = 'owner-a';
      const root = createRoot(document.getElementById('root'));
      window.render = () => root.render(<BrowserRouter><Routes><Route path="/browser" element={<Browser />} /><Route path="/browser/company/:slug" element={<CompanyDetails />} /></Routes></BrowserRouter>);
      window.render();`, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'directory-mocks', setup(b) {
      b.onResolve({ filter: /services\/directory$|contexts\/AuthContext$/ }, a => ({ path: a.path, namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, a => ({ contents: a.path.includes('AuthContext') ?
        `export const useAuthContext = () => ({membershipId: window.member, currentUser: {uid: 'actor'}});` : `
        export class DirectoryApiError extends Error { constructor(message, status) { super(message); this.status=status; } }
        const company = {slug:'alligator',displayName:'Mr. Alligator Renovations',description:'Quality home improvements.',industries:['construction'],trades:['Plumbing'],services:[{name:'Pipe repair',description:'Fix leaking pipes.',published:true}],serviceArea:'Orlando',publicEmail:'',publicPhone:'',website:'javascript:alert(1)'};
        export async function searchDirectoryCompanies(input) {
          window.searches.push(input);
          await new Promise(resolve=>setTimeout(resolve,input.q==='slow'?180:15));
          if (input.q==='error') throw new Error('Directory temporarily unavailable');
          const companies=input.q==='slow'?[{...company,slug:'stale',displayName:'Stale company'}]:input.industry==='beauty'?[]:[company];
          return {companies,total:companies.length,page:input.page,pageSize:input.pageSize};
        }
        export async function getDirectoryCompany(slug) {
          if(slug==='missing') throw new DirectoryApiError('Not found',404);
          return company;
        }
        ` }));
    } }],
  });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route('https://app.test/**', r => r.fulfill({ body: '<div id="root"></div>', contentType: 'text/html' }));
    await page.goto('https://app.test/browser');
    await page.addScriptTag({ content: outputFiles[0].text });
    await page.getByRole('heading', { name: 'Mr. Alligator Renovations', exact: true }).waitFor();
    await page.getByRole('searchbox').fill('Plumbing');
    await page.getByRole('searchbox').press('Enter');
    await page.getByRole('heading', { name: 'Results for “Plumbing”' }).waitFor();
    await page.getByRole('button', { name: 'Construction', exact: true }).click();
    await page.waitForFunction(() => window.searches.at(-1)?.industry === 'construction');
    assert.equal(new URL(page.url()).searchParams.get('q'), 'Plumbing');
    await page.getByRole('link', { name: 'View company' }).click();
    await page.getByRole('heading', { name: 'Mr. Alligator Renovations', exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Pipe repair', exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: /Visit website/ }).count(), 0);
    await page.getByRole('link', { name: 'Back to companies' }).click();
    assert.equal(new URL(page.url()).searchParams.get('industry'), 'construction');
    assert.equal(await page.getByRole('searchbox').inputValue(), 'Plumbing');
    await page.getByRole('button', { name: 'Beauty', exact: true }).click();
    await page.getByRole('heading', { name: 'No companies found', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await page.getByRole('searchbox').fill('slow');
    await page.getByRole('searchbox').press('Enter');
    await page.waitForFunction(() => window.searches.at(-1)?.q === 'slow');
    await page.getByRole('searchbox').fill('Plumbing');
    await page.getByRole('searchbox').press('Enter');
    await page.getByRole('heading', { name: 'Mr. Alligator Renovations', exact: true }).waitFor();
    await page.waitForTimeout(220);
    assert.equal(await page.getByText('Stale company', { exact: true }).count(), 0);
    await page.getByRole('searchbox').fill('error');
    await page.getByRole('searchbox').press('Enter');
    await page.getByRole('alert').waitFor();
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await page.waitForFunction(() => window.searches.filter(search => search.q === 'error').length === 2);
    await page.getByRole('alert').waitFor();
    await page.evaluate(() => { window.member='owner-b'; window.render(); });
    await page.waitForFunction(() => window.searches.filter(search => search.q === 'error').length === 3);
    await page.screenshot({ path: '/tmp/ezboss-browser-directory-mobile.png', fullPage: true });
  } finally { await browser.close(); }
});
