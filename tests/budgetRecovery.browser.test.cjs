const {test}=require('node:test');const assert=require('node:assert/strict');const {build}=require('esbuild');
let chromium;try{({chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'));}catch{}
for(const width of [1280,390]) test(`Budget recovery, periods, stale conflicts and draft isolation at ${width}px`,{skip:!chromium&&'Provide PLAYWRIGHT_MODULE'},async()=>{
 const {outputFiles}=await build({stdin:{resolveDir:process.cwd(),loader:'tsx',contents:`
 import React from 'react';import{createRoot}from'react-dom/client';import{BrowserRouter}from'react-router-dom';
 import Budget from './src/pages/finances/components/budget/Budget';import{setCompanySession}from'./src/services/companySession';
 const RealDate=Date;window.now='2026-11-30T12:00:00';window.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[window.now]));}static now(){return new RealDate(window.now).getTime()}};
 window.mode={failRead:true,failSave:false,delaySave:false,delayRead:false};window.writes=[];
 window.rows={categories:[{id:'fuel',name:'Fuel',type:'expense'}],goals:[{id:'monthly',categoryId:'fuel',amount:100,period:'monthly',year:2026,month:11,version:1},{id:'yearly',categoryId:'fuel',amount:1200,period:'yearly',year:2026,version:1}]};
 window.fetch=async(url,options={})=>{
  const kind=url.split('/legacy-finance/')[1]?.split('?')[0];
  if(options.method==='POST'){
   const body=JSON.parse(options.body);const target=window.rows;window.writes.push(body);if(window.mode.delaySave)await new Promise(r=>window.releaseSave=r);
   if(window.mode.failSave)return{ok:false,status:503,json:async()=>({error:'Save was not confirmed'})};
   const old=target.goals.find(g=>g.categoryId===body.categoryId&&g.period===body.period&&g.year===body.year&&(g.period==='yearly'||g.month===body.month));
   if(old&&(old.version!==body.expectedVersion||old.id!==body.expectedId))return{ok:false,status:409,json:async()=>({error:'Budget goal changed'})};
   const saved={...body,id:old?.id||'new',version:(old?.version||0)+1};target.goals=[...target.goals.filter(g=>g.id!==saved.id),saved];if(window.mode.loseResponse)return{ok:false,status:503,json:async()=>({error:'Save was not confirmed'})};return{ok:true,status:201,json:async()=>saved};
  }
  if(window.mode.failRead)return{ok:false,status:503,json:async()=>({error:'Read unavailable'})};
  const snapshot=structuredClone(kind==='finance-categories'?window.rows.categories:window.rows.goals);
  if(window.mode.delayRead)await new Promise(r=>(window.readReleases??=[]).push(r));
  return{ok:true,status:200,json:async()=>snapshot};
 };
 setCompanySession('A');const root=createRoot(document.getElementById('root'));window.show=true;window.render=()=>root.render(<BrowserRouter>{window.show?<Budget/>:<p>Away</p>}</BrowserRouter>);window.render();
 window.switchCompany=(id)=>{setCompanySession(id);window.rows={categories:[{id:'fuel',name:'Fuel',type:'expense'}],goals:[]};window.render()};
 `},bundle:true,write:false,jsx:'automatic',format:'iife',define:{'import.meta.env.VITE_API_URL':'"https://api.test"'},plugins:[{name:'auth',setup(b){
 b.onResolve({filter:/contexts\/AuthContext$/},()=>({path:'auth',namespace:'mock'}));
 b.onResolve({filter:/apiAuth$/},()=>({path:'token',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='auth'?`const value={currentUser:{uid:'owner'}};export const useAuthContext=()=>value;`:`export const getApiAccessToken=async()=> 'token';`}));
 }}]});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 const page=await browser.newPage({viewport:{width,height:900}});page.setDefaultTimeout(5000);page.on('pageerror',e=>console.error('Budget fixture:',e.message));await page.route('https://app.test/**',r=>r.fulfill({body:'<div id="root"></div>',contentType:'text/html'}));await page.goto('https://app.test/finances/budget');await page.addScriptTag({content:outputFiles[0].text});
 await page.getByText('Budget editing is unavailable',{exact:false}).waitFor();assert.equal(await page.getByLabel('Fuel budget amount').count(),0);
 await page.evaluate(()=>window.mode.failRead=false);await page.getByRole('button',{name:'Retry loading saved data'}).click();
 const amount=page.getByLabel('Fuel budget amount');await amount.waitFor();assert.equal(await amount.inputValue(),'100');
 await amount.fill('12.34');await page.evaluate(()=>window.mode.failRead=true);await page.getByRole('button',{name:'Reload saved data',exact:true}).click();await page.getByText('Showing previously loaded',{exact:false}).waitFor();assert.equal(await amount.inputValue(),'12.34');
 await page.evaluate(()=>{window.mode.failRead=false;window.rows.goals[0].amount=200;window.rows.goals[0].version=2;});await page.getByRole('button',{name:'Retry loading saved data'}).click();await page.getByText('The saved goal changed',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'Save Changes',exact:true}).isDisabled(),true);assert.equal(await amount.inputValue(),'12.34');
 await page.getByRole('button',{name:'Keep my amount using this saved version'}).click();await page.evaluate(()=>window.mode.failSave=true);await page.getByRole('button',{name:'Save Changes',exact:true}).click();await page.getByText('Save was not confirmed.',{exact:false}).first().waitFor();assert.equal(await amount.inputValue(),'12.34');
 await page.evaluate(()=>{window.mode.failSave=false;window.mode.delaySave=true;window.writes=[];});await page.getByRole('button',{name:'Save Changes',exact:true}).evaluate(b=>{b.click();b.click()});await page.waitForFunction(()=>window.releaseSave);assert.equal(await page.evaluate(()=>window.writes.length),1);await page.evaluate(()=>{window.mode.delaySave=false;window.releaseSave()});await page.getByRole('button',{name:'Saving…',exact:true}).waitFor({state:'detached'});await page.getByRole('button',{name:'Save Changes',exact:true}).waitFor({state:'detached'});assert.equal(await amount.inputValue(),'12.34');
 await amount.fill('15.55');await page.evaluate(()=>window.mode.loseResponse=true);await page.getByRole('button',{name:'Save Changes',exact:true}).click();await page.getByText('Save was not confirmed.',{exact:false}).first().waitFor();assert.equal(await amount.inputValue(),'15.55');await page.evaluate(()=>window.mode.loseResponse=false);await page.getByRole('button',{name:'Reload saved data without losing drafts'}).click();await page.getByText('The saved goal changed',{exact:false}).waitFor();assert.equal(await amount.inputValue(),'15.55');await page.getByRole('button',{name:'Discard draft and use saved amount'}).click();assert.equal(await amount.inputValue(),'15.55');
 await page.getByLabel('Budget period').selectOption('yearly');assert.equal(await amount.inputValue(),'1200');await amount.fill('1500.25');await page.getByRole('button',{name:'Save Changes',exact:true}).click();await page.getByRole('button',{name:'Saving…',exact:true}).waitFor({state:'detached'});await page.getByRole('button',{name:'Save Changes',exact:true}).waitFor({state:'detached'});const yearly=await page.evaluate(()=>window.writes.at(-1));assert.equal(yearly.period,'yearly');assert.equal(yearly.month,undefined);
 await page.getByLabel('Budget period').selectOption('monthly');await page.evaluate(()=>window.now='2026-12-01T12:00:00');await amount.fill('33.33');await page.getByRole('button',{name:'Save Changes',exact:true}).click();await page.getByRole('button',{name:'Saving…',exact:true}).waitFor({state:'detached'});await page.getByRole('button',{name:'Save Changes',exact:true}).waitFor({state:'detached'});assert.equal(await page.evaluate(()=>window.writes.at(-1).month),11);
 await amount.fill('44.44');assert.equal(await page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented}),true);
 await page.getByLabel('Budget month').selectOption('12');assert.equal(await amount.inputValue(),'');await page.getByLabel('Budget month').selectOption('11');assert.equal(await amount.inputValue(),'44.44');
 await page.evaluate(()=>{window.show=false;window.render()});await page.getByText('Away',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>{const e=new Event('beforeunload',{cancelable:true});window.dispatchEvent(e);return e.defaultPrevented}),true);await page.evaluate(()=>{window.show=true;window.render()});await page.getByLabel('Budget month').selectOption('11');assert.equal(await amount.inputValue(),'44.44');
 // A delayed A response and A's draft must not publish into the new company session.
 await page.evaluate(()=>window.mode.delayRead=true);await page.getByRole('button',{name:'Reload saved data',exact:true}).click();await page.waitForFunction(()=>window.readReleases?.length>=2);await page.evaluate(()=>{window.mode.delayRead=false;window.switchCompany('B');window.readReleases.forEach(r=>r())});await page.getByLabel('Fuel budget amount').waitFor();await page.waitForFunction(()=>document.querySelector('[aria-label="Fuel budget amount"]')?.value==='');assert.equal(await page.getByRole('button',{name:'Save Changes',exact:true}).count(),0);
 await amount.fill('99.99');await page.evaluate(()=>{window.mode.delaySave=true;window.releaseSave=undefined});await page.getByRole('button',{name:'Save Changes',exact:true}).click();await page.waitForFunction(()=>window.releaseSave);await page.evaluate(()=>{window.switchCompany('C');window.mode.delaySave=false;window.releaseSave()});await page.waitForFunction(()=>document.querySelector('[aria-label="Fuel budget amount"]')?.value==='');assert.equal(await page.getByRole('button',{name:'Save Changes',exact:true}).count(),0);
 }finally{await browser.close()}
});
