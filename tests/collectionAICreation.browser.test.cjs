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
      window.fetch=async(url,init)=>{
        window.calls.push({url,headers:init.headers,body:JSON.parse(init.body)});
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
    bundle: true, write: false, format: 'iife', jsx: 'automatic',
    nodePaths: (process.env.NODE_PATH || '').split(':').filter(Boolean),
    define: { 'import.meta.env': JSON.stringify({ VITE_API_URL: 'https://api.test' }) },
    plugins: [{ name: 'session', setup(b) {
      b.onResolve({filter:/contexts\/AuthContext$/},()=>({path:'auth',namespace:'mock'}));
      b.onResolve({filter:/apiAuth$/},()=>({path:'token',namespace:'mock'}));
      b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='auth'
        ? 'export const useAuthContext=()=>window.auth;'
        : 'export const getApiAccessToken=async()=> "access-token";'}));
    } }],
  });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route('https://app.test/**', r=>r.fulfill({body:'<div id="root"></div>',contentType:'text/html'}));
    await page.goto('https://app.test/collections/ai');
    await page.addScriptTag({content:outputFiles[0].text});
    await page.getByLabel('Provider API key').fill('temporary-secret');
    await page.getByLabel('Describe your job').fill('Install a toilet');
    await page.getByRole('button',{name:'Generate collection',exact:true}).click();
    await page.getByText('Review collection',{exact:true}).waitFor();
    assert.equal(await page.locator('img').count(),0);
    let call = await page.evaluate(()=>window.calls[0]);
    assert.equal(call.url,'https://api.test/native-collection-ai/generate');
    assert.equal(call.headers.Authorization,'Bearer access-token');
    assert.equal(call.headers['x-ai-key'],'temporary-secret');
    assert.equal(call.body.model,'claude-sonnet-4-6');
    assert.equal(JSON.stringify(await page.evaluate(()=>({...localStorage,...sessionStorage}))).includes('temporary-secret'),false);
    await page.getByLabel('Quantity for item 1').fill('3');
    await page.evaluate(()=>window.failGeneration=true);
    await page.getByRole('button',{name:'Generate again',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'Provider unavailable'}).waitFor();
    assert.equal(await page.getByLabel('Quantity for item 1').inputValue(),'3');
    await page.getByRole('button',{name:'Save reviewed collection',exact:true}).click();
    await page.getByRole('button',{name:'Retry saving collection'}).waitFor();
    assert.equal(await page.getByLabel('Collection name').isDisabled(),true);
    await page.getByRole('button',{name:'Retry saving collection'}).click();
    await page.waitForURL('**/collections/42');
    const saves=await page.evaluate(()=>window.calls.filter(c=>c.url.endsWith('/save')));
    assert.deepEqual(saves[0].body,saves[1].body);
    assert.equal(saves[0].body.collection.items[0].quantity,3);
    assert.equal(saves[0].headers['x-ai-key'],undefined);
    await page.evaluate(()=>{window.auth={...window.auth,membershipId:'two'};window.render()});
    await page.waitForFunction(()=>document.querySelector('input[type=password]')?.value==='');
    assert.equal(await page.getByLabel('Describe your job').inputValue(),'');
    assert.equal(await page.getByText('Review collection',{exact:true}).count(),0);
    await page.getByLabel('Provider API key').fill('another-secret');
    await page.getByRole('combobox').selectOption('openai');
    assert.equal(await page.getByLabel('Provider API key').inputValue(),'');
    await page.getByLabel('Provider API key').fill('openai-secret');
    await page.getByLabel('Describe your job').fill('Pending job');
    await page.evaluate(()=>{window.hold=true;window.failGeneration=false});
    await page.getByRole('button',{name:'Generate collection',exact:true}).click();
    await page.waitForFunction(()=>!!window.release);
    await page.evaluate(()=>{window.auth={...window.auth,membershipId:'three'};window.render()});
    await page.waitForFunction(()=>document.querySelector('input[type=password]')?.value==='');
    await page.evaluate(()=>window.release());
    await page.waitForTimeout(50);
    assert.equal(await page.getByText('Review collection',{exact:true}).count(),0);
    await page.evaluate(()=>{window.auth={...window.auth,canPerform:()=>false};window.render()});
    await page.getByRole('alert').filter({hasText:'Your company permissions'}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Generate collection',exact:true}).isDisabled(),true);
  } finally { await browser.close(); }
});
