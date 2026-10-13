const { test } = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
let chromium;
try { ({chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright')); } catch {}

test('invitation confirmation survives account refresh and reload and stays scoped to the accepting user', {skip:!chromium && 'Provide Playwright via PLAYWRIGHT_MODULE'}, async () => {
  const { outputFiles } = await build({
    stdin: { contents: `
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import Onboarding from './src/pages/employee/EmployeeAccountOnboarding';
      window.subject='employee-a'; window.kind=null; window.fail=false;
      window.fetch=async(url)=>({ok:!window.fail,json:async()=>window.fail?{error:'Acceptance failed'}:
        url.endsWith('/accept')?{status:'accepted',membershipId:'membership-a'}:
        url.endsWith('/employee-profile')?{profile:{},complete:false}:
        {company:'Test Company',position:'Employee',continuation:'new-invitation'}});
      const root=createRoot(document.getElementById('root'));
      window.render=()=>root.render(<Onboarding/>);
      window.refresh=async()=>{root.render(null);await new Promise(r=>setTimeout(r,20));window.render()};
      window.render();
    `, resolveDir: process.cwd(), loader: 'tsx' },
    bundle:true, write:false, format:'iife', jsx:'automatic',
    define:{'import.meta.env.VITE_API_URL':'"https://api.test"'},
    plugins:[{name:'session-mocks',setup(b){
      b.onResolve({filter:/^@auth0\/auth0-react$|contexts\/AuthContext$/},a=>({path:a.path,namespace:'mock'}));
      b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path.includes('auth0')?
        `export const useAuth0=()=>({isAuthenticated:true,user:{sub:window.subject,email:'employee@example.com',email_verified:true},getAccessTokenSilently:async()=> 'token',logout:async()=>{},loginWithRedirect:async()=>{}})`:
        `export const useAuthContext=()=>({accountKind:window.kind,completeOnboarding:()=>window.refresh()})`}));
    }}],
  });
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const page=await browser.newPage();
    await page.route('https://app.test/**',r=>r.fulfill({body:'<div id="root"></div>',contentType:'text/html'}));
    await page.goto('https://app.test/employee-account');
    await page.evaluate(()=>sessionStorage.setItem('ezboss.employee.continuation','invitation-a'));
    await page.addScriptTag({content:outputFiles[0].text});
    await page.getByRole('button',{name:'Accept invitation and join company'}).click();
    await page.getByRole('heading',{name:'Invitation accepted'}).waitFor();
    await page.waitForTimeout(50);
    assert.match(await page.locator('main').innerText(),/Thank you for accepting/);
    assert.equal(await page.getByRole('link',{name:'Go to dashboard'}).getAttribute('href'),'/dashboard');
    assert.equal(await page.getByRole('button',{name:'Accept invitation and join company'}).count(),0);
    await page.reload();
    await page.addScriptTag({content:outputFiles[0].text});
    await page.getByRole('heading',{name:'Invitation accepted'}).waitFor();
    await page.evaluate(()=>{window.subject='employee-b';window.render()});
    await page.getByRole('heading',{name:'Employee invitation',exact:true}).waitFor();
    await page.goto('https://app.test/employee-account#token=new-token');
    await page.addScriptTag({content:outputFiles[0].text});
    await page.getByRole('button',{name:'Accept invitation and join company'}).waitFor();
    await page.evaluate(()=>{window.fail=true});
    await page.getByRole('button',{name:'Accept invitation and join company'}).click();
    await page.getByText('Acceptance failed',{exact:true}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'Invitation accepted'}).count(),0);
  } finally { await browser.close(); }
});
