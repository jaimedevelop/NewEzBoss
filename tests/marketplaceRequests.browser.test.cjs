const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
let chromium;
try { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')); } catch {}
const serviceMock = `
export class MarketplaceApiError extends Error { constructor(message,status,code){super(message);this.status=status;this.code=code;} }
const copy=value=>JSON.parse(JSON.stringify(value));
const company={slug:'alligator',displayName:'Mr. Alligator Renovations',industries:['construction'],trades:['Plumbing'],description:'Home renovation',services:[{name:'Pipe repairs',description:'Fix plumbing',published:true}],serviceArea:'Miami',publicPhone:'',publicEmail:'',website:'',catalogFingerprint:'catalog-a'};
export async function getMarketplaceCompany(){return {...copy(company),catalogFingerprint:window.catalog||'catalog-a'};}
export async function getEstimateRequest(){return copy(window.request);}
export async function createEstimateRequest(slug,input){window.request={...copy(window.request),...copy(input),companySlug:slug};window.created++;return copy(window.request);}
export async function updateEstimateRequest(id,version,input){if(window.conflict)throw new MarketplaceApiError('A newer version exists',409,'VERSION_CONFLICT');window.request={...window.request,...copy(input),version:version+1};return copy(window.request);}
export async function submitEstimateRequest(id,version,fingerprint,key){window.submissions.push({id,version,fingerprint,key});if(window.nextSubmit==='catalog'){window.nextSubmit='';window.catalog='catalog-b';throw new MarketplaceApiError('Catalog changed',409,'CATALOG_CHANGED');}if(window.nextSubmit==='network'){window.nextSubmit='';throw new Error('Network interrupted. Try again.');}window.request={...window.request,state:'submitted',version:version+1,submittedAt:new Date().toISOString()};return copy(window.request);}
export async function withdrawEstimateRequest(){window.request={...window.request,state:'withdrawn',version:window.request.version+1};return copy(window.request);}
export async function deleteEstimateRequest(){window.deleted=true;}
export async function uploadRequestPhoto(id,version,file){window.request={...window.request,version:version+1,attachments:[{id:'photo',fileName:file.name,mimeType:file.type,size:file.size}]};return copy(window.request);}
export async function deleteRequestPhoto(){window.request={...window.request,version:window.request.version+1,attachments:[]};return copy(window.request);}
export async function downloadRequestPhoto(){return new Blob(['private-photo']);}
export async function listCompanyRequests(){return {requests:[copy(window.request)],total:1,page:1,pageSize:12};}
export async function getCompanyRequest(){return copy(window.request);}
export async function reviewCompanyRequest(id,version,action,reason){window.actions.push({action,reason});window.request={...window.request,state:action==='review'?'under_review':'declined',declineReason:reason,version:version+1};return copy(window.request);}
export async function convertCompanyRequest(id,version,client){window.conversions.push(client);window.request={...window.request,state:'converted',version:version+1,convertedEstimateId:'501'};return {request:copy(window.request),estimateId:'501'};}
`;
async function bundle(company = false) {
  const { outputFiles } = await build({
    stdin: { contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import {BrowserRouter,Routes,Route} from 'react-router-dom';
      import View from './src/pages/marketplace/${company ? 'CompanyEstimateRequests' : 'RequestEditor'}';
      window.created=0;window.deleted=false;window.submissions=[];window.actions=[];window.conversions=[];
      window.request={id:'request-1',companySlug:'alligator',companyName:'Mr. Alligator Renovations',state:'${company ? 'submitted' : 'draft'}',version:1,title:'${company ? 'Replace sink' : ''}',scope:'Replace leaking sink',contactName:'Client Person',contactPhone:'',contactEmail:'client@example.com',serviceAddress:{address:'1 Main St',address2:'',city:'Miami',state:'FL',zipCode:'33101'},selectedServiceNames:[],measurements:[],serviceSnapshot:[],attachments:[],catalogFingerprint:'catalog-a',declineReason:'',convertedEstimateId:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),submittedAt:${company ? 'new Date().toISOString()' : 'null'}};
      createRoot(document.getElementById('root')).render(<BrowserRouter><Routes>${company ? `<Route path="/estimate-requests/*" element={<View />} />` : `<Route path="/marketplace/companies/:slug/plan" element={<View identity={{id:'client-1',name:'Client Person',email:'client@example.com'}} />} /><Route path="/marketplace/requests/:id" element={<View identity={{id:'client-1',name:'Client Person',email:'client@example.com'}} />} /><Route path="/marketplace/requests" element={<h1>Request history</h1>} />`}</Routes></BrowserRouter>);`, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'marketplace-mock', setup(b) {
      b.onResolve({ filter: /services\/marketplace$|services\/clients$|contexts\/AuthContext$/ }, a => ({ path: a.path, namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, a => ({ contents: a.path.endsWith('clients') ? `export const getClients=async()=>({success:true,data:{clients:[{id:'42',name:'Existing Client',email:'existing@example.com'}],hasMore:false}});` : a.path.includes('AuthContext') ? `export const useAuthContext=()=>({membershipId:'owner',canPerform:()=>true});` : serviceMock }));
    } }],
  });
  return outputFiles[0].text;
}
async function start(company = false) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(10000);
    await page.route('https://app.test/**', route => route.fulfill({ body: '<div id="root"></div>', contentType: 'text/html' }));
    await page.goto(company ? 'https://app.test/estimate-requests/request-1' : 'https://app.test/marketplace/companies/alligator/plan');
    await page.addScriptTag({ content: await bundle(company) });
    if (process.env.MARKETPLACE_TEST_CSS) await page.addStyleTag({ path: process.env.MARKETPLACE_TEST_CSS });
    return { browser, page };
  } catch (error) { await browser.close(); throw error; }
}
test('client draft keeps edits and photos, reviews catalog changes, retries submission idempotently and withdraws', { skip: !chromium }, async () => {
  const { browser, page } = await start();
  try {
    await page.getByLabel('Job title', { exact: true }).fill('Replace kitchen sink');
    await page.getByLabel('Describe the work', { exact: true }).fill('Replace the sink and fix a leaking supply pipe.');
    await page.getByLabel('Street address', { exact: true }).fill('1 Main St');
    await page.getByLabel('City', { exact: true }).fill('Miami');
    await page.getByLabel('State / region', { exact: true }).fill('FL');
    await page.getByLabel('ZIP / postal code', { exact: true }).fill('33101');
    await page.getByRole('button', { name: 'Save private draft', exact: true }).click();
    await page.waitForURL('**/marketplace/requests/request-1');
    await page.getByLabel('Add a private job photo').setInputFiles({ name: 'sink.png', mimeType: 'image/png', buffer: Buffer.from('private image') });
    await page.getByText('sink.png', { exact: false }).waitFor();
    if (process.env.MARKETPLACE_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.MARKETPLACE_SCREENSHOT_DIR}/ezboss-phase2-builder-mobile.png`, fullPage: true });
    await page.getByRole('button', { name: 'Review request', exact: true }).click();
    await page.getByRole('heading', { name: 'Review your job request', exact: true }).waitFor();
    if (process.env.MARKETPLACE_SCREENSHOT_DIR) {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      await page.screenshot({ path: `${process.env.MARKETPLACE_SCREENSHOT_DIR}/ezboss-phase2-review-mobile.png`, fullPage: true });
    }
    await page.evaluate(() => { window.nextSubmit='catalog'; });
    await page.getByRole('checkbox', { name: /I want to share these job details/ }).check();
    await page.getByRole('button', { name: 'Submit job request', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'This company changed its services' }).waitFor();
    assert.equal(await page.getByLabel('Job title', { exact: true }).inputValue(), 'Replace kitchen sink');
    await page.getByRole('button', { name: 'Review request', exact: true }).click();
    await page.evaluate(() => { window.nextSubmit='network'; });
    await page.getByRole('checkbox', { name: /I want to share these job details/ }).check();
    await page.getByRole('button', { name: 'Submit job request', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Network interrupted' }).waitFor();
    await page.getByRole('button', { name: 'Submit job request', exact: true }).click();
    await page.getByText('Your request was submitted to the company for review. Contractor pricing is pending.', { exact: true }).waitFor();
    const submissions = await page.evaluate(() => window.submissions);
    assert.equal(submissions[1].key, submissions[2].key);
    assert.equal(submissions[1].fingerprint, 'catalog-b');
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Withdraw request', exact: true }).click();
    await page.getByText('Withdrawn', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.created), 1);
  } finally { await browser.close(); }
});
test('company reviewer creates a normal contractor draft after explicit client record choice', { skip: !chromium }, async () => {
  const { browser, page } = await start(true);
  try {
    await page.getByRole('button', { name: 'Start review', exact: true }).click();
    await page.getByText('Under review', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Create contractor draft estimate', exact: true }).click();
    await page.getByRole('radio', { name: 'Use an existing client in this company', exact: true }).check();
    await page.getByRole('button', { name: /Existing Client/ }).click();
    if (process.env.MARKETPLACE_SCREENSHOT_DIR) {
      await page.setViewportSize({width:1280,height:900});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      await page.screenshot({ path: `${process.env.MARKETPLACE_SCREENSHOT_DIR}/ezboss-phase2-company-desktop.png`, fullPage: true });
    }
    await page.getByRole('button', { name: 'Confirm and create draft', exact: true }).click();
    await page.getByRole('link', { name: 'Open draft estimate', exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Open draft estimate' }).getAttribute('href'), '/estimates/501');
    assert.deepEqual(await page.evaluate(() => window.conversions), [{ clientId: 42 }]);
    assert.deepEqual(await page.evaluate(() => window.actions), [{ action: 'review', reason: '' }]);
  } finally { await browser.close(); }
});
