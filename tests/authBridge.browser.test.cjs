// node --test tests/authBridge.browser.test.cjs (set PLAYWRIGHT_MODULE if needed)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
let chromium;
try { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')); } catch {}

test('Auth0 routing survives bridge failures and rejects stale session results', { skip: !chromium && 'Provide Playwright via PLAYWRIGHT_MODULE' }, async () => {
  const { outputFiles } = await build({
    stdin: { contents: `
      import React, { StrictMode } from 'react';
      import { createRoot } from 'react-dom/client';
      import App from './src/App';
      window.state = {isAuthenticated:true,isLoading:false,user:{sub:'auth0|alice',email:'alice@example.com',name:'Alice'}};
      window.mode = {bridge:'invalid',onboarded:true,failApi:false,signOutFails:false,delayProfile:false,delayBridge:false};
      window.counts = {bridge:0,logout:0,cache:0};
      window.firebaseUser = null;
      window.fetch = async (url, options) => {
        const who = options.headers.Authorization.replace('Bearer ', '');
        if (url.endsWith('/auth/firebase-token')) {
          window.counts.bridge++;
          return {ok:true,json:async()=>({firebaseToken:who})};
        }
        if(window.mode.failApi) return {ok:false,status:503};
        if(url.endsWith('/onboarding/status')) return {ok:true,json:async()=>({onboarded:window.mode.onboarded})};
        if(url.endsWith('/profile')) {
          if(window.mode.delayProfile) await new Promise(resolve=>window.releaseProfile=resolve);
          return {ok:true,json:async()=>({userId:123,email:who+'@example.com',firstName:options.method==='PATCH'?'Updated':who})};
        }
        throw Error('Unexpected URL '+url);
      };
      const root = createRoot(document.getElementById('root'));
      window.render = () => root.render(<StrictMode><App /></StrictMode>);
      window.render();
    `, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, format: 'iife', define: { 'import.meta.env.VITE_API_URL': '"https://api.test"' },
    plugins: [{ name:'auth-mocks', setup(b) {
      b.onResolve({filter:/^@auth0\/auth0-react$|^firebase\/auth$|firebase\/config$|categories\/hierarchyApi$|utils\/productCache$|services\/accessControl$/}, args=>({path:args.path,namespace:'mock'}));
      b.onResolve({filter:/^\.\/(pages|mobile|mainComponents)\//}, args => args.importer.endsWith('/src/App.tsx') ? {path:args.path,namespace:'page'} : undefined);
      b.onLoad({filter:/.*/,namespace:'mock'}, args=> {
        let contents;
        if(args.path.includes('auth0-react')) contents=`const getAccessTokenSilently=async()=>window.state.user.sub; const logout=async()=>{window.counts.logout++}; export const useAuth0=()=>({...window.state,getAccessTokenSilently,logout,loginWithRedirect:()=>{}});`;
        else if(args.path==='firebase/auth') contents=`export const signOut=async()=>{if(window.mode.signOutFails)throw Error('signout failed');window.firebaseUser=null}; export const signInWithCustomToken=async(_,token)=>{if(window.mode.delayBridge)await new Promise(r=>window.releaseBridge=r);if(window.mode.bridge==='invalid')throw Object.assign(Error('invalid token'),{code:'auth/invalid-custom-token'});window.firebaseUser=token};`;
        else if(args.path.endsWith('firebase/config')) contents='export const auth={}';
        else if(args.path.includes('accessControl')) contents=`export const getMyPermissions=async()=>{if(window.mode.failPermissions)throw Error('Permissions unavailable');return {isSuperuser:false,pageKeys:['projects'],featureKeys:['allowed']}};`;
        else contents='export const invalidateHierarchyCache=()=>window.counts.cache++; export const invalidateCache=()=>window.counts.cache++;';
        return {contents,loader:'js'};
      });
      b.onLoad({filter:/.*/,namespace:'page'}, args=>({contents:`import React from 'react'; import {useAuthContext} from ${JSON.stringify(process.cwd()+'/src/contexts/AuthContext.tsx')}; export default function Page({children}) {const ctx=useAuthContext(); window.ctx=ctx; return <div data-page=${JSON.stringify(args.path)}>{children || ${JSON.stringify(args.path)}}</div>}`,loader:'tsx',resolveDir:process.cwd()}));
    }}],
  });
  const browser = await chromium.launch({ channel:'chrome', headless:true });
  try {
    const page = await browser.newPage();
    await page.route('https://app.test/**', route=>route.fulfill({body:'<div id="root"></div>',contentType:'text/html'}));
    const start = async (path='/dashboard') => {
      await page.goto('https://app.test'+path);
      await page.addScriptTag({content:outputFiles[0].text});
      await page.waitForFunction(()=>window.ctx && !window.ctx.isLoading);
    };
    await start();
    await page.waitForFunction(()=>window.ctx.bridgeError);
    assert.equal(await page.locator('[data-page="./pages/dashboard/Dashboard"]').count(),1);
    assert.deepEqual(await page.evaluate(()=>[window.ctx.currentUser.uid,window.ctx.userProfile.userId,window.counts.bridge,window.ctx.canAccessPage('projects'),window.ctx.canAccessPage('finances')]),['auth0_alice',123,1,true,false]);
    await page.evaluate(()=>window.ctx.updateProfile({firstName:'Updated'}));
    assert.equal(await page.evaluate(()=>window.ctx.currentUser.profile.firstName),'Updated');
    await page.evaluate(()=>window.ctx.refreshUserProfile());
    assert.equal(await page.evaluate(()=>window.ctx.userProfile.firstName),'auth0|alice');
    await page.evaluate(()=>{window.mode.failApi=true;void window.ctx.retryInitialization()});
    await page.getByText('Unable to load your account').waitFor();
    await page.evaluate(()=>window.mode.failApi=false);
    await page.getByRole('button',{name:'Try again'}).click();
    await page.locator('[data-page="./pages/dashboard/Dashboard"]').waitFor();
    assert.equal(await page.evaluate(()=>window.counts.bridge),1);
    await page.evaluate(()=>{window.mode.onboarded=false;void window.ctx.retryInitialization()});
    await page.waitForURL('**/landing/onboarding');
    assert.equal(await page.evaluate(()=>window.ctx.canAccessPage('projects')),false);
    await page.evaluate(()=>{window.mode.onboarded=true;void window.ctx.completeOnboarding()});
    await page.waitForURL('**/dashboard');
    await page.evaluate(()=>{window.mode.failPermissions=true;void window.ctx.retryInitialization()});
    await page.getByText('Unable to load your account').waitFor();
    assert.equal(await page.locator('[data-page="./pages/dashboard/Dashboard"]').count(),0);
    await page.evaluate(()=>window.mode.failPermissions=false);
    await page.getByRole('button',{name:'Try again'}).click();
    await page.locator('[data-page="./pages/dashboard/Dashboard"]').waitFor();
    await page.evaluate(()=>{history.pushState({}, '', '/finances');window.dispatchEvent(new PopStateEvent('popstate'))});
    await page.waitForURL('**/dashboard');
    // Old profile result must not populate a new account.
    await page.evaluate(()=>{window.mode.delayProfile=true;void window.ctx.refreshUserProfile()});
    await page.waitForFunction(()=>!!window.releaseProfile);
    await page.evaluate(()=>{window.mode.delayProfile=false;window.state={...window.state,user:{sub:'auth0|bob',name:'Bob'}};window.render()});
    await page.waitForFunction(()=>window.ctx.currentUser?.uid==='auth0_bob' && window.ctx.userProfile?.firstName==='auth0|bob');
    await page.evaluate(()=>window.releaseProfile());
    assert.equal(await page.evaluate(()=>window.ctx.userProfile.firstName),'auth0|bob');
    await page.evaluate(()=>{window.mode.signOutFails=true;void window.ctx.signOut()});
    await page.waitForURL('**/landing');
    assert.equal(await page.evaluate(()=>window.counts.logout),1);
    assert.equal(await page.evaluate(()=>window.ctx.currentUser),null);
    // Logged-out Auth0 visitor also reaches the public route.
    await page.evaluate(()=>{window.state={isAuthenticated:false,isLoading:false};window.render()});
    await page.locator('[data-page="./pages/landing/Landing"]').waitFor();
    // An in-flight successful bridge is cleaned up before a new account bridges.
    await start();
    await page.evaluate(()=>{window.mode.bridge='success';window.mode.delayBridge=true;window.state={...window.state,user:{sub:'auth0|charlie'}};window.render()});
    await page.waitForFunction(()=>!!window.releaseBridge);
    await page.evaluate(()=>{window.mode.delayBridge=false;window.state={...window.state,user:{sub:'auth0|dana'}};window.render()});
    await page.waitForFunction(()=>window.ctx.currentUser?.uid==='auth0_dana');
    await page.evaluate(()=>window.releaseBridge());
    await page.waitForFunction(()=>window.firebaseUser==='auth0|dana');
    assert.equal(await page.evaluate(()=>window.ctx.userProfile.firstName),'auth0|dana');
    await page.evaluate(()=>{window.mode.delayBridge=true;window.releaseBridge=null;window.state={...window.state,user:{sub:'auth0|eve'}};window.render()});
    await page.waitForFunction(()=>!!window.releaseBridge);
    await page.evaluate(()=>window.ctx.signOut());
    await page.waitForURL('**/landing');
    await page.evaluate(()=>window.releaseBridge());
    await page.waitForFunction(()=>window.firebaseUser===null);
    assert.equal(await page.evaluate(()=>window.ctx.currentUser),null);
  } finally { await browser.close(); }
});
