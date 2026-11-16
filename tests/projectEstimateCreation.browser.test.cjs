const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { chromium } = require('playwright');

test('project estimates save explicitly and return to their project at desktop and phone widths', async () => {
  const { outputFiles } = await build({
    stdin: {
      contents: `
        import React from 'react';
        import { createRoot } from 'react-dom/client';
        import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
        import ProjectDashboard from './src/pages/projects/ProjectDashboard';
        import { EstimateCreationForm } from './src/pages/estimates/components/EstimateCreationForm';
        import EstimateDashboard from './src/pages/estimates/components/estimateDashboard/EstimateDashboard';
        import MobileEstimateDashboard from './src/mobile/contractor/estimates/views/MobileEstimateDashboard';
        const Dashboard = window.innerWidth < 600 ? MobileEstimateDashboard : EstimateDashboard;
        window.savedEstimates = [];
        createRoot(document.getElementById('root')).render(
          <BrowserRouter>
            <Link to="/estimates">Open estimates workspace</Link>
            <Routes>
              <Route path="/projects/:projectId" element={<ProjectDashboard />} />
              <Route path="/estimates/new" element={<EstimateCreationForm />} />
              <Route path="/estimates/:estimateId" element={<Dashboard />} />
              <Route path="/estimates" element={<><h1>Estimates workspace</h1><Link to="/estimates/1">Open estimate</Link></>} />
            </Routes>
          </BrowserRouter>
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
      name: 'project-estimate-fixtures',
      setup(builder) {
        builder.onResolve({ filter: /AuthContext$/ }, () => ({ path: 'auth', namespace: 'fixture' }));
        builder.onResolve({ filter: /services\/projects$/ }, ({ importer }) =>
          /(?:ProjectDashboard|EstimateCreationForm)\.tsx$/.test(importer)
            ? { path: 'projects', namespace: 'fixture' } : undefined);
        builder.onResolve({ filter: /services\/estimates$/ }, ({ importer }) =>
          (/\/(?:EstimateCreationForm|EstimateDashboard)\.tsx$/.test(importer))
            ? { path: 'estimates', namespace: 'fixture' } : undefined);
        builder.onResolve({ filter: /^\.\/estimateTab\/EstimateTab$/ }, ({ importer }) =>
          importer.endsWith('/EstimateDashboard.tsx') ? { path: 'widget', namespace: 'fixture' } : undefined);
        builder.onResolve({ filter: /^\.\/components\// }, ({ importer, path }) =>
          importer.endsWith('/ProjectDashboard.tsx') && !path.endsWith('/ProjectTabs')
            ? { path: 'widget', namespace: 'fixture' } : undefined);
        builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
          contents: {
            auth: 'export const useAuthContext = () => ({accountKind: "employee", canPerform: () => true, canAccessFeature: () => true});',
            projects: `
              export const getProjectById = async () => ({success: true, data: {
                id: 'project-1', name: 'Oak Street', clientId: '42', clientName: 'Oak Client',
                clientEmail: 'client@example.com', serviceAddress: { address: '12 Oak Street' }
              }});
              export const deleteProject = () => {};
              export const setProjectArchived = () => {};`,
            estimates: `
              export const getNextEstimateNumber = async () => 'EST-001';
              export const createEstimateRow = async input => {
                window.savedEstimates.push(input);
                return {id: 1, estimateNumber: 'EST-001'};
              };
              export const companyContactsAddedMessage = () => '';
              export const createChangeOrder = () => {};
              export const generateChangeOrderNumber = () => {};
              export const getEstimate = async id => ({
                ...window.savedEstimates[0], id, estimateNumber: 'EST-001', estimateState: 'draft',
              });
              export const calculateEstimateTotals = () => ({});
              export const createEstimate = () => {};
              export const deleteEstimate = () => {};
              export const duplicateEstimate = () => {};
              export const issueInvoice = () => {};
              export const updateEstimate = () => {};`,
            widget: 'export default () => null;',
          }[path],
        }));
      },
    }],
  });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.setDefaultTimeout(6000);
      page.on('pageerror', error => console.error(error));
      await page.route('https://ezboss.test/**', route =>
        route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }));
      await page.goto('https://ezboss.test/projects/project-1?tab=estimates');
      await page.addScriptTag({ content: outputFiles[0].text });
      const open = page.getByRole('link', { name: 'Create estimate draft' });
      await open.click();
      await page.getByRole('heading', { name: 'Create New Estimate' }).waitFor();
      await page.getByRole('button', { name: /Oak Client/ }).waitFor();
      assert.equal(await page.locator('input[value="Oak Street"]').count(), 1);
      assert.deepEqual(await page.evaluate(() => window.savedEstimates), []);
      await page.getByRole('button', { name: 'Add line items' }).click();
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Discarded work');
      if (width === 1280) await page.goBack();
      else await page.getByRole('link', { name: 'Back to project' }).click();
      await open.waitFor();
      assert.deepEqual(await page.evaluate(() => window.savedEstimates), []);

      await open.click();
      await page.getByRole('button', { name: 'Add line items' }).click();
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Replace faucet');
      await page.getByRole('button', { name: 'Create Estimate', exact: true }).click();
      await page.getByRole('heading', { name: 'EST-001' }).waitFor();
      const [saved, ...duplicates] = await page.evaluate(() => window.savedEstimates);
      assert.equal(duplicates.length, 0);
      assert.equal(saved.projectId, 'project-1');
      assert.equal(saved.customerId, '42');
      assert.equal(saved.customerEmail, 'client@example.com');
      assert.equal(saved.serviceAddress, '12 Oak Street');
      assert.equal(saved.lineItems[0].name, 'Replace faucet');
      await page.goBack();
      await open.waitFor();
      await page.goForward();
      await page.getByRole('button', { name: 'Back to project' }).click();
      await open.waitFor();
      assert.equal(new URL(page.url()).pathname + new URL(page.url()).search, '/projects/project-1?tab=estimates');
      await page.getByRole('link', { name: 'Open estimates workspace' }).click();
      await page.getByRole('link', { name: 'Open estimate', exact: true }).click();
      const viewProject = page.getByRole('link', { name: 'View project', exact: true });
      await viewProject.click();
      await open.waitFor();
      assert.equal(new URL(page.url()).pathname + new URL(page.url()).search, '/projects/project-1?tab=estimates');
      await page.goBack();
      await page.getByRole('button', { name: 'Back to estimates' }).click();
      await page.getByRole('heading', { name: 'Estimates workspace' }).waitFor();
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
