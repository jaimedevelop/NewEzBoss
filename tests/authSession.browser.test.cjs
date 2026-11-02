// node --test tests/authSession.browser.test.cjs (set PLAYWRIGHT_MODULE if needed)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
let chromium;
try { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')); } catch {}

for (const viewport of [{width:1280,height:800}, {width:390,height:844}]) test(`Auth0-only routing rejects stale session results at ${viewport.width}px`, { skip: !chromium && 'Provide Playwright via PLAYWRIGHT_MODULE' }, async () => {
  const { outputFiles } = await build({
    stdin: { contents: `
      import React, { StrictMode } from 'react';
      import { createRoot } from 'react-dom/client';
      import App from './src/App';
      import { getApiAccessToken } from './src/services/apiAuth';
      window.serviceToken = getApiAccessToken;
      window.state = {isAuthenticated:true,isLoading:false,user:{sub:'auth0|alice',email:'alice@example.com',name:'Alice'}};
      window.mode = {onboarded:true,failApi:false,delayProfile:false};
      window.counts = {bridge:0,logout:0,cache:0};
      window.fetch = async (url, options) => {
        const who = new Headers(options.headers).get('Authorization').replace('Bearer ', '');
        if (/firebase|firestore|googleapis/.test(url)) throw Error('Forbidden provider request');
        if(window.mode.failApi) return {ok:false,status:503};
        if(url.includes('/account/me')) return {ok:true,status:200,json:async()=>({
          memberships:[{id:'00000000-0000-4000-8000-000000000001',kind:'owner',companyName:'Test company',isActive:true,companyIsActive:true}],
          companyContext:{membershipId:'00000000-0000-4000-8000-000000000001',kind:'owner'},effectivePermissions:null
        })};
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
    bundle: true, write: false, format: 'iife', define: { 'import.meta.env.VITE_API_URL': '"https://api.test"', 'import.meta.env.VITE_AUTH0_DOMAIN': '"test.auth0.com"', 'import.meta.env.VITE_AUTH0_CLIENT_ID': '"test-client"', 'import.meta.env.VITE_AUTH0_AUDIENCE': '"https://api.test"' },
    plugins: [{ name:'auth-mocks', setup(b) {
      b.onResolve({filter:/^@auth0\/auth0-react$|^@auth0\/auth0-spa-js$|categories\/hierarchyApi$|utils\/productCache$|services\/accessControl$/}, args=>({path:args.path,namespace:'mock'}));
      b.onResolve({filter:/^\.\/(pages|mobile|mainComponents)\//}, args => args.importer.endsWith('/src/App.tsx') ? {path:args.path,namespace:'page'} : undefined);
      b.onLoad({filter:/.*/,namespace:'mock'}, args=> {
        let contents;
        if(args.path.includes('auth0-react')) contents=`const getAccessTokenSilently=async()=>{if(window.mode.tokenError)throw Object.assign(Error('Token renewal failed'),{error:window.mode.tokenError});return window.state.user.sub}; const logout=async()=>{window.counts.logout++}; export const useAuth0=()=>({...window.state,getAccessTokenSilently,logout,loginWithRedirect:async(options)=>{window.redirectOptions=options;window.counts.login=(window.counts.login||0)+1}});`;
        else if(args.path.includes('auth0-spa-js')) contents=`export class Auth0Client {async getTokenSilently(){if(window.mode.tokenError)throw Object.assign(Error('Token renewal failed'),{error:window.mode.tokenError});return window.mode.emptyToken?undefined:window.state.user.sub}}`;
        else if(args.path.includes('accessControl')) contents=`export const getMyPermissions=async()=>{if(window.mode.failPermissions)throw Error('Permissions unavailable');return {isSuperuser:false,pageKeys:['dashboard','projects'],featureKeys:['allowed']}};`;
        else contents='export const invalidateHierarchyCache=()=>window.counts.cache++; export const invalidateCache=()=>window.counts.cache++;';
        return {contents,loader:'js'};
      });
      b.onLoad({filter:/.*/,namespace:'page'}, args=>({contents:`import React from 'react'; import {useAuthContext} from ${JSON.stringify(process.cwd()+'/src/contexts/AuthContext.tsx')}; export default function Page({children}) {const ctx=useAuthContext(); window.ctx=ctx; return <div data-page=${JSON.stringify(args.path)}>{children || ${JSON.stringify(args.path)}}</div>}`,loader:'tsx',resolveDir:process.cwd()}));
    }}],
  });
  const browser = await chromium.launch({ channel:'chrome', headless:true });
  try {
    const page = await browser.newPage({ viewport });
    await page.route('https://app.test/**', route=>route.fulfill({body:'<div id="root"></div>',contentType:'text/html'}));
    const start = async (path='/dashboard') => {
      await page.goto('https://app.test'+path);
      await page.addScriptTag({content:outputFiles[0].text});
      await page.waitForFunction(()=>window.ctx && !window.ctx.isLoading);
    };
    await start();
    assert.equal(await page.evaluate(()=>window.ctx.bridgeError),undefined);
    assert.equal(await page.locator('[data-page="./pages/dashboard/Dashboard"]').count(),1);
    assert.deepEqual(await page.evaluate(()=>[window.ctx.currentUser.uid,window.ctx.userProfile.userId,window.counts.bridge,window.ctx.canAccessPage('projects'),window.ctx.canAccessPage('finances')]),['auth0_alice',123,0,true,false]);
    await page.evaluate(()=>window.ctx.updateProfile({firstName:'Updated'}));
    assert.equal(await page.evaluate(()=>window.ctx.currentUser.profile.firstName),'Updated');
    await page.evaluate(()=>window.ctx.refreshUserProfile());
    assert.equal(await page.evaluate(()=>window.ctx.userProfile.firstName),'auth0|alice');
    await page.evaluate(()=>{window.mode.failApi=true;void window.ctx.retryInitialization()});
    await page.getByText('Unable to load your account').waitFor();
    await page.evaluate(()=>window.mode.failApi=false);
    await page.getByRole('button',{name:'Try again'}).click();
    await page.locator('[data-page="./pages/dashboard/Dashboard"]').waitFor();
    assert.equal(await page.evaluate(()=>window.counts.bridge),0);
    await page.evaluate(()=>{window.mode.onboarded=false;void window.ctx.retryInitialization()});
    await page.waitForURL('**/landing/onboarding');
    assert.equal(await page.evaluate(()=>window.ctx.canAccessPage('projects')),false);
    await page.evaluate(()=>{window.mode.onboarded=true;void window.ctx.completeOnboarding()});
    await page.waitForURL('**/dashboard');
    await page.evaluate(()=>{window.mode.failPermissions=true;void window.ctx.retryInitialization()});
    await page.getByText('Unable to load your account').waitFor();
    assert.equal(await page.locator('[data-page="./pages/dashboard/Dashboard"]').count(),0);
    await page.getByRole('link',{name:'Account requests and terms'}).click();
    await page.locator('[data-page="./pages/settings/components/AccountLifecycleSection"]').waitFor();
    assert.equal(await page.locator('[data-page="./pages/dashboard/Dashboard"]').count(),0);
    await page.goBack();
    await page.getByText('Unable to load your account').waitFor();
    await page.evaluate(()=>window.mode.failPermissions=false);
    await page.getByRole('button',{name:'Try again'}).click();
    await page.locator('[data-page="./pages/dashboard/Dashboard"]').waitFor();
    await page.evaluate(()=>{history.pushState({}, '', '/finances');window.dispatchEvent(new PopStateEvent('popstate'))});
    await page.waitForURL('**/dashboard');
    // Missing/expired sessions must use authorization, not retry the same token.
    for (const code of ['missing_refresh_token', 'login_required', 'consent_required', 'interaction_required', 'invalid_grant']) {
      await page.evaluate(code=>{window.mode.tokenError=code;void window.ctx.retryInitialization()}, code);
      await page.getByRole('button',{name:'Continue sign in'}).waitFor();
      assert.equal(await page.getByRole('button',{name:'Try again',exact:true}).count(),0);
      await page.getByRole('button',{name:'Continue sign in'}).click();
      assert.deepEqual(await page.evaluate(()=>window.redirectOptions),{appState:{returnTo:'/dashboard'}});
      assert.equal(await page.evaluate(()=>window.counts.logout),0);
      await page.evaluate(()=>{window.mode.tokenError=null;window.state={...window.state,user:{sub:'auth0|recovered-'+window.counts.login}};window.render()});
      await page.locator('[data-page="./pages/dashboard/Dashboard"]').waitFor();
    }
    assert.equal(await page.evaluate(()=>window.counts.login),5);
    // Expiration during service calls must expose recovery without logout.
    for (const mode of [{tokenError:'invalid_grant'}, {emptyToken:true}]) {
      await page.evaluate(async mode => {
        Object.assign(window.mode, mode);
        await window.serviceToken().catch(() => {});
      }, mode);
      await page.getByRole('button',{name:'Continue sign in'}).click();
      assert.equal(await page.evaluate(()=>window.counts.logout),0);
      assert.deepEqual(await page.evaluate(()=>window.redirectOptions),{appState:{returnTo:'/dashboard'}});
      await page.evaluate(()=>{window.mode.tokenError=null;window.mode.emptyToken=false;window.state={...window.state,user:{sub:'auth0|service-recovered-'+window.counts.login}};window.render()});
      await page.locator('[data-page="./pages/dashboard/Dashboard"]').waitFor();
    }
    // Old profile result must not populate a new account.
    await page.evaluate(()=>{window.mode.delayProfile=true;void window.ctx.refreshUserProfile()});
    await page.waitForFunction(()=>!!window.releaseProfile);
    await page.evaluate(()=>{window.mode.delayProfile=false;window.state={...window.state,user:{sub:'auth0|bob',name:'Bob'}};window.render()});
    await page.waitForFunction(()=>window.ctx.currentUser?.uid==='auth0_bob' && window.ctx.userProfile?.firstName==='auth0|bob');
    await page.evaluate(()=>window.releaseProfile());
    assert.equal(await page.evaluate(()=>window.ctx.userProfile.firstName),'auth0|bob');
    await page.evaluate(()=>{void window.ctx.signOut()});
    await page.waitForURL('**/landing');
    assert.equal(await page.evaluate(()=>window.counts.logout),1);
    assert.equal(await page.evaluate(()=>window.ctx.currentUser),null);
    // Logged-out Auth0 visitor also reaches the public route.
    await page.evaluate(()=>{window.state={isAuthenticated:false,isLoading:false};window.render()});
    await page.locator('[data-page="./pages/landing/Landing"]').waitFor();
  } finally { await browser.close(); }
});
