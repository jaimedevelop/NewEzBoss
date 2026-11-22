const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { chromium } = require('playwright');

test('authenticated AI creation reviews inventory, retries saves, and isolates company sessions', async () => {
  const { outputFiles } = await build({
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import {BrowserRouter} from 'react-router-dom';
      import Creator from './src/pages/collections/components/CollectionAICreation';
      window.auth={currentUser:{uid:'owner'},membershipId:'one',canPerform:()=>true};
      window.calls=[]; window.saveAttempts=0; window.failGeneration=false; window.hold=false;
      const preferences = new Map([['three', {settings:{
        provider:'anthropic',modelId:'anthropic:claude-sonnet-4-6',customProviders:[],customModels:[],
      },version:1}]]);
      const models = {
        anthropic: [{modelId:'claude-sonnet-5-5',name:'Claude Sonnet 5.5'}],
        openai: [{modelId:'gpt-6.2-sol',name:'GPT-6.2 Sol'}],
        google: [{modelId:'gemini-3.8-flash',name:'Gemini 3.8 Flash'}],
        deepseek: [{modelId:'deepseek-flash',name:'DeepSeek Flash'}],
      };
      window.fetch=async(url,init)=>{
        const body = init.body ? JSON.parse(init.body) : undefined;
        window.calls.push({url,headers:init.headers,body});
        if (url.endsWith('/collection-ai-settings')) {
          const membership = window.auth.membershipId;
          const current = preferences.get(membership) ?? {settings:null,version:0};
          if (init.method !== 'PUT') return {ok:true,json:async()=>({...current,models})};
          if (body.version !== current.version) return {ok:false,status:409,json:async()=>({error:'Settings changed elsewhere'})};
          const next = {settings:body.settings,version:body.version+1};
          preferences.set(membership,next);
          return {ok:true,json:async()=>next};
        }
        if(url.endsWith('/generate')) {
          if(window.hold) await new Promise(resolve=>window.release=resolve);
          if(window.failGeneration) return {ok:false,status:502,json:async()=>({error:'Provider unavailable'})};
          const items=[{contentType:'products',itemId:12,quantity:2}];
          return {ok:true,status:200,json:async()=>({collection:{name:'Toilet installation',description:'Review me',items},preview:[{...items[0],name:'<img src=x onerror=alert(1)>'}]})};
        }
        if(url.endsWith('/save')) {
          if(++window.saveAttempts===1) throw new Error('Connection lost');
          return {ok:true,status:200,json:async()=>({id:42})};
        }
        throw Error('Unexpected endpoint');
      };
      const root=createRoot(document.getElementById('root'));
      window.render=()=>root.render(<BrowserRouter><Creator/></BrowserRouter>);window.render();
    ` },
    bundle: true, write: false, format: 'iife', jsx: 'automatic', loader: { '.css': 'empty' },
    nodePaths: (process.env.NODE_PATH || '').split(':').filter(Boolean),
    define: { 'import.meta.env': JSON.stringify({ VITE_API_URL: 'https://api.test' }) },
    plugins: [{ name: 'session', setup(b) {
      b.onResolve({filter:/contexts\/AuthContext$/},()=>({path:'auth',namespace:'mock'}));
      b.onResolve({filter:/services\/categories$/},()=>({path:'categories',namespace:'mock'}));
      b.onResolve({filter:/apiAuth$/},()=>({path:'token',namespace:'mock'}));
      b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='auth'
        ? 'export const useAuthContext=()=>window.auth;'
        : a.path==='categories'
          ? `export const getProductTrades=async()=>({success:true,data:[{id:'12',name:'Plumbing'}]});
             export const getProductSections=async()=>({success:true,data:[{id:'12',name:'Fixtures'}]});
             export const getProductCategories=async()=>({success:true,data:[]}); export const getProductSubcategories=getProductCategories;`
          : 'export const getApiAccessToken=async()=> "access-token";'}));
    } }],
  });
  const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' }), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route('https://app.test/**', r=>r.fulfill({body:'<div id="root"></div>',contentType:'text/html'}));
    await page.goto('https://app.test/collections/ai');
    await page.addScriptTag({content:outputFiles[0].text});
    if (process.env.EZBOSS_TEST_CSS) await page.addStyleTag({ path: process.env.EZBOSS_TEST_CSS });
    await page.getByRole('heading', { name: 'Describe your job' }).waitFor();
    await page.getByRole('button', { name: 'Toilet installation' }).waitFor();
    await page.getByRole('button', { name: 'AI Settings', exact: true }).first().click();
    if (process.env.EZBOSS_TEST_CSS) {
      const panel = page.locator('#collection-ai-settings');
      assert.equal(await panel.evaluate(el => getComputedStyle(el.parentElement).flexDirection), 'column');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
      await page.setViewportSize({ width: 1280, height: 900 });
      assert.equal(await panel.evaluate(el => getComputedStyle(el.parentElement).flexDirection), 'row');
      await page.setViewportSize({ width: 390, height: 844 });
    }
    for (const [provider, id] of [['OpenAI', 'openai:gpt-6.2-sol'], ['Google', 'google:gemini-3.8-flash'],
      ['DeepSeek', 'deepseek:deepseek-flash'], ['Anthropic', 'anthropic:claude-sonnet-5-5']]) {
      await page.getByRole('button', {name: provider, exact: true}).click();
      assert.equal(await page.getByLabel('Model', {exact: true}).inputValue(), id);
    }
    await page.getByLabel('Provider API key').fill('temporary-secret');
    async function saveSettings() {
      await page.getByRole('button', { name: 'Save Settings', exact: true }).click();
      await page.getByRole('button', { name: 'Saved', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Done', exact: true }).click();
    }
    await saveSettings();
    await page.getByRole('button', { name: 'Scope inventory' }).click();
    await page.getByText('Plumbing', { exact: true }).click();
    await page.getByRole('checkbox', { name: 'Fixtures' }).check();
    await page.getByRole('button', { name: 'Apply Scope' }).click();
    await page.getByRole('button', { name: 'Scope inventory' }).click();
    await page.getByRole('button', { name: 'Apply Scope' }).click();
    await page.getByLabel('Describe your job').fill('Install a toilet');
    await page.getByRole('button',{name:'Generate collection',exact:true}).click();
    await page.getByText('Collection Preview',{exact:true}).waitFor();
    assert.equal(await page.locator('img').count(),0);
    let call = await page.evaluate(()=>window.calls.find(call=>call.url.endsWith('/generate')));
    assert.equal(call.url,'https://api.test/native-collection-ai/generate');
    assert.equal(call.headers.Authorization,'Bearer access-token');
    assert.equal(call.headers['x-ai-key'],'temporary-secret');
    assert.equal(call.body.model,'claude-sonnet-5-5');
    assert.deepEqual(call.body.scope, [{contentType:'products',level:'section',id:12}]);
    assert.equal(JSON.stringify(await page.evaluate(()=>({...localStorage,...sessionStorage}))).includes('temporary-secret'),false);
    await page.getByLabel('Quantity for item 1').fill('3');
    await page.evaluate(()=>window.failGeneration=true);
    await page.getByLabel('Describe your job').fill('Use a standard toilet');
    await page.getByLabel('Describe your job').press('Enter');
    await page.getByRole('alert').filter({hasText:'Provider unavailable'}).waitFor();
    assert.equal(await page.getByLabel('Describe your job').inputValue(), 'Use a standard toilet');
    assert.equal(await page.getByLabel('Quantity for item 1').inputValue(),'3');
    await page.getByRole('button',{name:'Save Collection',exact:true}).click();
    await page.getByRole('button',{name:'Retry saving collection'}).waitFor();
    assert.equal(await page.getByLabel('Collection name').isDisabled(),true);
    await page.getByRole('button',{name:'Retry saving collection'}).click();
    await page.waitForURL('**/collections/42');
    const saves=await page.evaluate(()=>window.calls.filter(c=>c.url.endsWith('/save')));
    assert.deepEqual(saves[0].body,saves[1].body);
    assert.equal(saves[0].body.collection.items[0].quantity,3);
    assert.equal(saves[0].headers['x-ai-key'],undefined);
    await page.evaluate(()=>{window.auth={...window.auth,membershipId:'two'};window.render()});
    await page.getByRole('button', { name: 'AI Settings', exact: true }).first().click();
    assert.equal(await page.getByLabel('Provider API key').inputValue(), '');
    assert.equal(await page.getByLabel('Describe your job').inputValue(),'');
    assert.equal(await page.getByText('Collection Preview',{exact:true}).count(),0);
    await page.getByLabel('Provider API key').fill('another-secret');
    await page.getByRole('button', { name: 'OpenAI', exact: true }).click();
    await page.getByRole('button', { name: 'Add Model', exact: true }).click();
    await page.getByLabel('Model ID', { exact: true }).fill('my-model');
    await page.getByRole('button', { name: 'Add Model', exact: true }).click();
    await page.getByRole('button', { name: 'Add Provider', exact: true }).click();
    await page.getByPlaceholder('Name (e.g. Mistral, Ollama)').fill('Private provider');
    await page.getByPlaceholder('API endpoint URL').fill('https://provider.example/v1');
    await page.getByRole('button', { name: 'Add Provider', exact: true }).click();
    await page.getByLabel('Model ID', { exact: true }).fill('custom-model');
    await page.getByRole('button', { name: 'Add Model', exact: true }).click();
    await page.getByLabel('Model', { exact: true }).selectOption('custom:private-provider:custom-model');
    await saveSettings();
    await page.evaluate(()=>{window.auth={...window.auth,membershipId:'reload'};window.render()});
    await page.getByRole('button', { name: 'AI Settings', exact: true }).first().click();
    await page.getByRole('button', { name: 'OpenAI', exact: true }).waitFor();
    await page.evaluate(()=>{window.auth={...window.auth,membershipId:'two'};window.render()});
    await page.getByRole('button', { name: 'AI Settings', exact: true }).first().click();
    await page.getByRole('option', { name: 'custom-model' }).waitFor({state:'attached'});
    assert.equal(await page.getByLabel('Model', { exact: true }).inputValue(), 'custom:private-provider:custom-model');
    await page.getByRole('button', { name: 'OpenAI', exact: true }).click();
    assert.equal(await page.getByLabel('Model', { exact: true }).inputValue(), 'openai:my-model');
    const settingsWrites = await page.evaluate(()=>window.calls.filter(call => call.url.endsWith('/collection-ai-settings') && call.body));
    assert.equal(settingsWrites.at(-1).body.settings.customProviders[0].label, 'Private provider');
    assert.equal(settingsWrites.at(-1).body.settings.customModels.length, 2);
    assert.equal(settingsWrites.at(-1).body.settings.apiKey, undefined);
    assert.equal(settingsWrites.at(-1).body.settings.apiKeys, undefined);
    assert.equal(settingsWrites.at(-1).headers['x-ai-key'], undefined);
    assert.equal(await page.getByLabel('Provider API key').inputValue(),'');
    await page.getByLabel('Provider API key').fill('openai-secret');
    await saveSettings();
    await page.getByLabel('Describe your job').fill('Pending job');
    await page.evaluate(()=>{window.hold=true;window.failGeneration=false});
    await page.getByRole('button',{name:'Generate collection',exact:true}).click();
    await page.waitForFunction(()=>!!window.release);
    await page.evaluate(()=>{window.auth={...window.auth,membershipId:'three'};window.render()});
    await page.getByRole('button', { name: 'AI Settings', exact: true }).first().click();
    assert.equal(await page.getByLabel('Provider API key').inputValue(), '');
    assert.equal(await page.getByLabel('Model', {exact: true}).inputValue(), 'anthropic:claude-sonnet-4-6');
    await page.getByRole('option', {name: 'Claude Sonnet 5.5'}).waitFor({state: 'attached'});
    await page.evaluate(()=>window.release());
    await page.waitForTimeout(50);
    assert.equal(await page.getByText('Collection Preview',{exact:true}).count(),0);
    await page.evaluate(()=>{window.auth={...window.auth,canPerform:()=>false};window.render()});
    await page.getByRole('alert').filter({hasText:'Your company permissions'}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Generate collection',exact:true}).isDisabled(),true);
  } finally { await browser.close(); }
});
