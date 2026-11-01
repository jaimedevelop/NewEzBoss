const {test}=require('node:test');
const assert=require('node:assert/strict');
const {build}=require('esbuild');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');

test('account requests preserve retry identity, show persisted review status and reject stale terms at 360/390/768 px',async()=>{
  const {outputFiles}=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Account from './src/pages/settings/components/AccountLifecycleSection';createRoot(document.getElementById('root')).render(<Account/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','import.meta.env.VITE_API_URL':'"https://api.example.invalid"'},plugins:[{name:'test-auth-boundary',setup(b){b.onResolve({filter:/services\/apiAuth$/},()=>({path:'auth',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export async function getApiAccessToken(){return "test-token";}'}));}}]});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    for(const width of [360,390,768]) {
      const page=await browser.newPage({viewport:{width,height:900}});
      let requests=[];let submitted=null;let loseResponse=true;
      await page.route('https://api.example.invalid/account/**',async route=>{
        const request=route.request(),url=new URL(request.url());
        if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type'}});
        const headers={'access-control-allow-origin':'*','content-type':'application/json'};
        if(url.pathname.endsWith('/lifecycle'))return route.fulfill({headers,body:JSON.stringify({notice:'Business records are preserved during review.',requests,document:{version:'v1',url:'https://legal.example.invalid/terms',sha256:'a'.repeat(64),accepted:false}})});
        const body=request.postDataJSON();
        if(url.pathname.endsWith('/terms-acceptance'))return route.fulfill({status:409,headers,body:'{}'});
        if(url.pathname.endsWith('/cancel')){requests=[];return route.fulfill({headers,body:'{}'});}
        if(loseResponse){loseResponse=false;submitted=body;return route.fulfill({status:503,headers,body:'{}'});}
        assert.equal(body.requestId,submitted.requestId);
        requests=[{id:body.requestId,status:'requested',version:1,createdAt:'2026-10-31T12:00:00Z',reviewMessage:''}];
        return route.fulfill({status:201,headers,body:JSON.stringify(requests[0])});
      });
      await page.route('https://app.example.invalid/',route=>route.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));
      await page.goto('https://app.example.invalid/');
      const assets=fs.readdirSync('dist/assets').filter(n=>n.endsWith('.css'));
      for(const asset of assets)await page.addStyleTag({content:fs.readFileSync(path.join('dist/assets',asset),'utf8')});
      await page.addScriptTag({content:outputFiles[0].text});
      const submit=page.getByRole('button',{name:'Submit for review'});
      await page.getByText('Business records are preserved during review.').waitFor();
      assert.equal(await submit.isDisabled(),true);
      await page.getByRole('textbox').fill('REQUEST DELETION');await submit.click();
      await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('textbox').inputValue(),'REQUEST DELETION');
      await submit.click();await page.getByRole('button',{name:'Cancel request'}).waitFor();
      assert.equal(await page.getByRole('textbox').inputValue(),'');
      await page.getByRole('button',{name:'I have read and accept these terms'}).click();
      await page.getByRole('alert').waitFor();assert.equal(await page.getByText('Accepted',{exact:true}).count(),0);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.getByRole('button',{name:'Cancel request'}).click();
      await page.getByRole('button',{name:'Cancel request'}).waitFor({state:'detached'});
      await page.close();
    }
  }finally{await browser.close();}
});
