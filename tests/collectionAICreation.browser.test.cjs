const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { chromium } = require('playwright');

test('authenticated AI creation reviews inventory, retries saves, and isolates company sessions', async () => {
  const { outputFiles } = await build({
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import {BrowserRouter, Route, Routes, useNavigate} from 'react-router-dom';
      import {authContext} from './src/contexts/authContextValue';
      import Creator from './src/pages/collections/components/CollectionAICreation';
      import CollectionHeader from './src/pages/collections/components/CollectionsScreen/components/CollectionHeader';
      function CollectionDetail() {
        const navigate = useNavigate();
        return <>
          <CollectionHeader collectionName="Plumbing essentials" isEditing={false}
            onAddWithAI={() => navigate('/collections/ai?appendTo=42')} />
          <Creator />
        </>;
      }
      window.auth={currentUser:{uid:'owner'},membershipId:'one',canPerform:()=>true};
      window.calls=[]; window.saveAttempts=0; window.appendAttempts=0; window.failGeneration=false; window.hold=false;
      const preferences = new Map([['three', {settings:{
        provider:'anthropic',modelId:'anthropic:claude-sonnet-4-6',customProviders:[],customModels:[],
      },version:1}], ['custom-account', {settings:{
        provider:'custom', activeCustomProviderId:'acme', modelId:'custom:acme:example-model',
        customProviders:[{id:'acme',label:'Acme AI',baseUrl:'https://token-plan.maas.qwencloudapi.com/compatible-mode/v1'}],
        customModels:[{id:'custom:acme:example-model',modelId:'example-model',name:'Example model',provider:'custom',customProviderId:'acme',contextWindow:0}],
      },version:1}]]);
      const models = {
        anthropic: [
          {modelId:'claude-sonnet-5-5',name:'Claude Sonnet 5.5'},
          {modelId:'claude-haiku-test',name:'Claude Haiku Test'},
        ],
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
          if (init.method !== 'PUT' && membership === 'denied') {
            return {ok:false,status:403,json:async()=>({error:'AI settings access denied.'})};
          }
          if (init.method !== 'PUT' && window.settingsUnavailable) {
            return {ok:false,status:503,json:async()=>({error:'Settings service unavailable.'})};
          }
          if (init.method !== 'PUT') return {ok:true,json:async()=>({...current,models})};
          if (body.version !== current.version) return {ok:false,status:409,json:async()=>({error:'Settings changed elsewhere'})};
          const next = {settings:body.settings,version:body.version+1};
          preferences.set(membership,next);
          return {ok:true,json:async()=>next};
        }
        if (url.endsWith('/collections/42')) return {ok:true,json:async()=>({name:'Plumbing essentials'})};
        if (url.endsWith('/append')) {
          if (++window.appendAttempts === 1) throw new Error('Connection lost');
          return {ok:true,json:async()=>({id:42,addedCount:1})};
        }
        if(url.endsWith('/generate')) {
          if(window.hold) await new Promise(resolve=>window.release=resolve);
          if(window.failGeneration) return {ok:false,status:502,json:async()=>({error:'Provider unavailable'})};
          const items = body.prompt === 'Add mounting hardware'
            ? Array.from({length: 30}, (_, index) => ({contentType:'products',itemId:index + 12,quantity:2}))
            : [{contentType:'products',itemId:12,quantity:2}];
          return {ok:true,status:200,json:async()=>({collection:{name:'Toilet installation',description:'Review me',items},preview:items.map(item => ({...item,name:body.model === 'example-model' ? 'Sink supply kit' : '<img src=x onerror=alert(1)>'}))})};
        }
        if(url.endsWith('/save')) {
          if(++window.saveAttempts===1) throw new Error('Connection lost');
          return {ok:true,status:200,json:async()=>({id:42})};
        }
        throw Error('Unexpected endpoint');
      };
      const root=createRoot(document.getElementById('root'));
      window.render=()=>root.render(<authContext.Provider value={window.auth}><BrowserRouter><Routes>
        <Route path="/collections/create" element={<p>Collection creation options</p>}/>
        <Route path="/collections/42" element={<CollectionDetail/>}/>
        <Route path="*" element={<Creator/>}/>
      </Routes></BrowserRouter></authContext.Provider>);window.render();
    ` },
    bundle: true, write: false, format: 'iife', jsx: 'automatic', loader: { '.css': 'empty' },
    nodePaths: (process.env.NODE_PATH || '').split(':').filter(Boolean),
    define: { 'import.meta.env': JSON.stringify({ VITE_API_URL: 'https://api.test' }) },
    plugins: [{ name: 'session', setup(b) {
      b.onResolve({filter:/services\/categories(?:\/trades)?$/},()=>({path:'categories',namespace:'mock'}));
      b.onResolve({filter:/apiAuth$/},()=>({path:'token',namespace:'mock'}));
      b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='categories'
          ? `export const getProductTrades=async()=>({success:true,data:[{id:'12',name:'Plumbing'}]});
             export const getProductSections=async()=>({success:true,data:[{id:'12',name:'Fixtures'}]});
             export const getProductCategories=async()=>({success:true,data:[]}); export const getProductSubcategories=getProductCategories;`
          : 'export const getApiAccessToken=async()=> "access-token";'}));
    } }],
  });
  const browser = await chromium.launch({ ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : { channel: 'chrome' }), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const { securityHeaders } = await import('../scripts/security-headers.mjs');
    const policy = securityHeaders({VITE_API_URL:'https://api.test',VITE_AUTH0_DOMAIN:'auth.test'})
      .split('\n').find(line => line.includes('Content-Security-Policy:')).trim().replace('Content-Security-Policy: ', '');
    await page.route('https://app.test/**', route => new URL(route.request().url()).pathname === '/test-app.js'
      ? route.fulfill({body:outputFiles[0].text,contentType:'application/javascript'})
      : route.fulfill({body:'<div id="root" class="flex h-[100dvh] flex-col overflow-hidden"></div><script src="/test-app.js" defer></script>',contentType:'text/html',
        headers:{'Content-Security-Policy':policy}}));
    await page.goto('https://app.test/collections/ai');
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
    let navigations = 0;
    const recordNavigation = frame => { if (frame === page.mainFrame()) navigations++; };
    page.on('framenavigated', recordNavigation);
    const modelPicker = page.getByLabel('Model', { exact: true });
    const modelSelections = [[390, 'anthropic:claude-haiku-test'], [1280, 'anthropic:claude-sonnet-5-5']];
    for (const [width, id] of modelSelections) {
      await page.setViewportSize({ width, height: 844 });
      await modelPicker.selectOption(id);
      assert.equal(await modelPicker.inputValue(), id);
      assert.equal(await page.getByRole('heading', { name: 'Describe your job' }).count(), 1);
    }
    assert.equal(navigations, 0);
    page.off('framenavigated', recordNavigation);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel('Provider API key').fill('temporary-secret');
    async function saveSettings() {
      await page.getByRole('button', { name: 'Save Settings', exact: true }).click();
      const saved = page.getByRole('button', { name: 'Saved', exact: true });
      await saved.waitFor();
      assert.equal(await saved.isDisabled(), true);
      assert.equal(await page.getByRole('button', { name: 'Cancel', exact: true }).isDisabled(), true);
      await page.getByRole('button', { name: 'AI Settings', exact: true }).first().click();
    }
    await saveSettings();
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByText('Collection creation options').waitFor();
    await page.goBack();
    await page.getByRole('button', { name: 'AI Settings', exact: true }).first().click();
    assert.equal(await page.getByLabel('Provider API key').inputValue(), 'temporary-secret');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
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
    assert.equal(JSON.stringify(await page.evaluate(()=>({...localStorage}))).includes('temporary-secret'),false);
    await page.getByLabel('Quantity for item 1').fill('3');
    await page.evaluate(()=>window.failGeneration=true);
    await page.getByLabel('Describe your job').fill('Use a standard toilet');
    await page.getByLabel('Describe your job').press('Enter');
    await page.getByRole('alert').filter({hasText:'Provider unavailable'}).waitFor();
    assert.equal(await page.getByLabel('Describe your job').inputValue(), 'Use a standard toilet');
    assert.equal(await page.getByLabel('Quantity for item 1').inputValue(),'3');
    await page.getByRole('button', {name:'Remove', exact:true}).click();
    await page.getByRole('button', {name:'Undo removal'}).waitFor();
    await page.getByLabel('Collection name').fill('Reviewed toilet installation');
    await page.reload();
    if (process.env.EZBOSS_TEST_CSS) await page.addStyleTag({ path: process.env.EZBOSS_TEST_CSS });
    await page.getByRole('button', {name:'Undo removal'}).waitFor();
    assert.equal(await page.getByLabel('Collection name').inputValue(), 'Reviewed toilet installation');
    assert.equal(await page.getByLabel('Quantity for item 1').count(), 0);
    await page.getByRole('button', {name:'Undo removal'}).click();
    assert.equal(await page.getByLabel('Quantity for item 1').inputValue(), '3');
    assert.equal(await page.getByRole('button', {name:'Undo removal'}).count(), 0);

    await page.getByRole('button',{name:'Save Collection',exact:true}).click();
    await page.getByRole('button',{name:'Retry saving collection'}).waitFor();
    const firstSave = await page.evaluate(() => window.calls.find(c => c.url.endsWith('/save')));
    await page.reload();
    if (process.env.EZBOSS_TEST_CSS) await page.addStyleTag({ path: process.env.EZBOSS_TEST_CSS });
    await page.evaluate(() => { window.saveAttempts = 1; });
    await page.getByRole('button',{name:'Retry saving collection'}).waitFor();
    assert.equal(await page.getByLabel('Collection name').isDisabled(),true);
    await page.getByRole('button',{name:'Retry saving collection'}).click();
    await page.waitForURL('**/collections/42');
    const saves = [firstSave, ...await page.evaluate(() => window.calls.filter(c => c.url.endsWith('/save')))];
    assert.equal(await page.evaluate(() => Object.keys(sessionStorage).some(key => key.startsWith('ezboss:collection-ai-draft:'))), false);
    assert.deepEqual(saves[0].body,saves[1].body);
    assert.equal(saves[0].body.collection.items[0].quantity,3);
    assert.equal(saves[0].headers['x-ai-key'],undefined);
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => { window.failGeneration = false; });
      await page.getByRole('button', {name: 'Add items with AI', exact: true}).click();
      await page.waitForURL('**/collections/ai?appendTo=42');
      await page.getByRole('heading', {name: 'What should we add to Plumbing essentials?'}).waitFor();
      await page.getByLabel('Describe your job').fill('Add mounting hardware');
      await page.getByRole('button', {name: 'Generate collection', exact: true}).click();
      await page.getByText('Collection Preview', {exact: true}).waitFor();
      const previewToggle = page.getByRole('button', { name: /Collection Preview/ });
      await page.getByRole('heading', { name: 'Products (30)' }).waitFor();
      const composer = page.getByLabel('Describe your job');
      if (process.env.EZBOSS_TEST_CSS) {
        const bounds = await previewToggle.evaluate(toggle => {
          const card = toggle.closest('h2').parentElement;
          const transcript = card.parentElement;
          const style = getComputedStyle(transcript);
          return {
            cardWidth: card.getBoundingClientRect().width,
            availableWidth: transcript.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
            scrollable: transcript.scrollHeight > transcript.clientHeight,
            composerBottom: transcript.nextElementSibling.getBoundingClientRect().bottom,
          };
        });
        assert.equal(bounds.cardWidth, bounds.availableWidth);
        assert.equal(bounds.scrollable, true);
        assert.ok(bounds.composerBottom <= 900);
        assert.ok((await composer.boundingBox()).y >= 0);
      }
      await composer.fill('Add only the mounting bolts');
      await composer.press('Enter');
      await page.getByRole('heading', { name: 'Products (1)' }).waitFor();
      assert.match(await previewToggle.innerText(), /Plumbing essentials/);
      assert.match(await previewToggle.innerText(), /1 item/);
      if (process.env.EZBOSS_TEST_CSS) {
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      }
      await page.getByRole('heading', { name: 'Products (1)' }).waitFor();
      assert.equal(await previewToggle.getAttribute('aria-expanded'), 'true');
      await previewToggle.click();
      assert.equal(await previewToggle.getAttribute('aria-expanded'), 'false');
      assert.equal(await page.getByRole('heading', { name: 'Products (1)' }).count(), 0);
      assert.equal(await page.getByRole('button', { name: 'Add to Collection', exact: true }).isEnabled(), true);
      await previewToggle.click();
      assert.equal(await page.getByLabel('Collection name').count(), 0);
      await page.getByLabel('Quantity for item 1').fill('4');
      const generation = await page.evaluate(() => window.calls.filter(call => call.url.endsWith('/generate')).at(-1));
      assert.equal(generation.body.collectionId, 42);
      await page.getByRole('button', {name: 'Add to Collection', exact: true}).click();
      if (width === 390) {
        await page.getByRole('button', {name: 'Retry saving collection'}).waitFor();
        assert.equal(await page.getByLabel('Quantity for item 1').isDisabled(), true);
        await page.getByRole('button', {name: 'Retry saving collection'}).click();
      }
      await page.waitForURL('**/collections/42');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const additions = await page.evaluate(() => window.calls.filter(call => call.url.endsWith('/append')));
    assert.deepEqual(additions[0].body, additions[1].body);
    assert.notEqual(additions[2].body.requestId, additions[1].body.requestId);
    assert.deepEqual(additions[0].body.items, [{contentType:'products',itemId:12,quantity:4}]);
    assert.equal(additions[0].body.collectionId, 42);
    assert.equal(additions[0].body.collection, undefined);
    assert.equal(additions[0].headers['x-ai-key'], undefined);
    assert.equal(await page.evaluate(() => window.saveAttempts), 2);
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
    await page.getByPlaceholder('API endpoint URL').fill('https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1');
    await page.getByRole('button', { name: 'Add Provider', exact: true }).click();
    await page.getByLabel('Model ID', { exact: true }).fill('custom-model');
    await page.getByRole('button', { name: 'Add Model', exact: true }).click();
    await page.getByLabel('Model', { exact: true }).selectOption('custom:private-provider:custom-model');
    assert.equal(await page.getByLabel('Provider API key').inputValue(), '');
    await page.getByLabel('Provider API key').fill('qwen-test-key');
    await saveSettings();
    assert.equal(await page.getByRole('heading', { name: 'Describe your job' }).count(), 1);
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.getByLabel('Describe your job').fill('Install a sink');
      await page.getByRole('button', { name: 'Generate collection', exact: true }).click();
      await page.getByText('Collection Preview', { exact: true }).waitFor();
      const request = await page.evaluate(() => window.calls.filter(call => call.url.endsWith('/generate')).at(-1));
      assert.equal(request.body.provider, 'custom');
      assert.equal(request.body.baseUrl, 'https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1');
      assert.equal(request.body.model, 'custom-model');
      assert.equal(request.headers['x-ai-key'], 'qwen-test-key');
      await page.getByRole('button', { name: 'Reset', exact: true }).click();
    }
    assert.deepEqual(pageErrors, []);
    await page.evaluate(()=>{window.auth={...window.auth,membershipId:'reload'};window.render()});
    await page.getByRole('button', { name: 'AI Settings', exact: true }).first().click();
    await page.getByRole('button', { name: 'OpenAI', exact: true }).waitFor();
    await page.evaluate(()=>{window.auth={...window.auth,membershipId:'two'};window.render()});
    await page.getByRole('button', { name: 'AI Settings', exact: true }).first().click();
    await page.getByRole('option', { name: 'custom-model' }).waitFor({state:'attached'});
    assert.equal(await page.getByLabel('Model', { exact: true }).inputValue(), 'custom:private-provider:custom-model');
    assert.equal(await page.getByLabel('Provider API key').inputValue(), 'qwen-test-key');
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
    await page.evaluate(()=>{
      window.hold=false;window.settingsUnavailable=true;window.calls=[];
      window.auth={...window.auth,membershipId:'pending'};window.render();
    });
    await page.getByRole('button', {name:'AI Settings',exact:true}).first().click();
    await page.getByRole('alert').filter({hasText:'Settings service unavailable.'}).waitFor();
    assert.equal(await page.getByRole('button', {name:'Save Settings',exact:true}).isDisabled(), true);
    await page.getByLabel('Provider API key').fill('session-only-key');
    await page.getByRole('button', {name:'Use for this session'}).click();
    await page.getByLabel('Describe your job').fill('Generate while settings are unavailable');
    await page.getByRole('button', {name:'Generate collection',exact:true}).click();
    await page.getByText('Collection Preview',{exact:true}).waitFor();
    assert.deepEqual(await page.evaluate(()=>window.calls.filter(call=>call.url.endsWith('/collection-ai-settings') && call.body)), []);
    await page.evaluate(()=>{window.settingsUnavailable=false});
    await page.getByRole('button', {name:'AI Settings',exact:true}).first().click();
    await page.getByRole('button', {name:'Retry loading settings'}).click();
    await page.getByRole('option', {name:'Claude Sonnet 5.5'}).waitFor({state:'attached'});
    assert.equal(await page.getByRole('button', {name:'Save Settings',exact:true}).isEnabled(), true);
    for (const width of [390, 1280]) {
      await page.setViewportSize({width,height:844});
      await page.evaluate(()=>{window.auth={...window.auth,membershipId:'custom-account'};window.render()});
      await page.getByRole('button', {name:'AI Settings',exact:true}).first().click();
      await page.getByText('https://token-plan.maas.qwencloudapi.com/compatible-mode/v1/chat/completions', {exact:true}).waitFor();
      assert.equal(await page.getByLabel('Model', {exact:true}).inputValue(), 'custom:acme:example-model');
      assert.equal(await page.getByLabel('Provider API key').inputValue(), '');
      await page.getByLabel('Provider API key').fill('acme-temporary-key');
      await saveSettings();
      await page.getByLabel('Describe your job').fill('Install a sink');
      await page.getByRole('button', {name:'Generate collection',exact:true}).click();
      await page.getByText('Sink supply kit', {exact:true}).waitFor();
      const request = await page.evaluate(() => window.calls.filter(call => call.url.endsWith('/generate')).at(-1));
      assert.equal(request.headers['x-ai-key'], 'acme-temporary-key');
      assert.equal(request.body.provider, 'custom');
      assert.equal(request.body.baseUrl, 'https://token-plan.maas.qwencloudapi.com/compatible-mode/v1');
      assert.equal(request.body.model, 'example-model');
      assert.equal(page.frames().length, 1);
      const storedKeys = await page.evaluate(() => JSON.stringify(sessionStorage));
      assert.equal(storedKeys.includes('acme-temporary-key'), false);
      await page.evaluate(()=>{window.auth={...window.auth,membershipId:'three'};window.render()});
      await page.getByRole('button', {name:'Toilet installation'}).waitFor();
    }
    await page.evaluate(()=>{window.auth={...window.auth,membershipId:'denied'};window.render()});
    await page.getByRole('button', {name:'AI Settings',exact:true}).first().click();
    await page.getByRole('alert').filter({hasText:'AI settings access denied'}).waitFor();
    assert.equal(await page.getByRole('button', {name:'Use for this session'}).count(), 0);
    assert.equal(await page.getByLabel('Provider API key').isDisabled(), true);
    await page.evaluate(()=>{window.auth={...window.auth,canPerform:()=>false};window.render()});
    await page.getByRole('alert').filter({hasText:'Your company permissions'}).waitFor();
    await page.getByText('AI Settings requires collection read/write and inventory read access.').waitFor();
    assert.equal(await page.getByLabel('Provider API key').isDisabled(), true);
    assert.equal(await page.getByRole('button',{name:'Generate collection',exact:true}).isDisabled(),true);
  } finally { await browser.close(); }
});
