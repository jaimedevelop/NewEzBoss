const {test}=require('node:test');const assert=require('node:assert/strict');const {build}=require('esbuild');const {readFile,mkdir}=require('node:fs/promises');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
test('Better Auth forms validate and fit desktop/mobile widths without credential persistence',async()=>{
 const {outputFiles}=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import App from './src/App';import{BetterIdentityProvider}from'./src/contexts/IdentityAuth';import{installCookieSessionTransport}from'./src/services/authMode';installCookieSessionTransport();createRoot(document.getElementById('root')).render(<BetterIdentityProvider><App/></BetterIdentityProvider>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic',define:{'import.meta.env':JSON.stringify({VITE_AUTH_PROVIDER:'better-auth',VITE_API_URL:'/api'})},loader:{'.css':'empty','.png':'dataurl'},plugins:[{name:'vite-url-assets',setup(b){b.onResolve({filter:/\?url$/},()=>({path:'asset',namespace:'fixture-url'}));b.onLoad({filter:/.*/,namespace:'fixture-url'},()=>({contents:'export default "/fixture-worker.js";'}));}}]});
 const script=outputFiles[0].text,css=await readFile('src/mainComponents/auth/auth.css','utf8'),logo=await readFile('public/EzBossLogo.png');
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{for(const width of [320,375,390,768,1280]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],requests=[];let sessionUnavailable=false, mergeKind=null;page.on('pageerror',e=>errors.push(e.message));
  const assertRegularInputs=async(expectedCount)=>{
   const inputs=page.locator('.ez-auth input:not([type="checkbox"], [type="radio"])');
   await page.waitForFunction(({selector,count})=>document.querySelectorAll(selector).length===count,
    {selector:'.ez-auth input:not([type="checkbox"], [type="radio"])',count:expectedCount});
   assert.deepEqual(await inputs.evaluateAll(fields=>fields.map(field=>getComputedStyle(field).fontWeight)),Array(expectedCount).fill('400'));
  };
  await page.route('**/*',async route=>{const url=new URL(route.request().url());
   if(url.pathname.startsWith('/api/auth/')){
    requests.push(url.pathname);
    if(url.pathname.endsWith('/ezboss/config'))return route.fulfill({json:{appOrigin:url.origin,providers:mergeKind?['google']:[],termsVersion:'fixture-1',privacyVersion:'fixture-1',termsURL:url.origin+'/legal/terms',privacyURL:url.origin+'/legal/privacy'}});
    if(url.pathname.endsWith('/get-session'))return sessionUnavailable ? route.fulfill({status:503,json:{error:'fixture outage'}}) : route.fulfill({json:null});
    if(url.pathname.endsWith('/merge/status'))return route.fulfill({json:{email:'fixture@example.test',canLinkGoogle:mergeKind==='google',canAddPassword:mergeKind==='password',googleConnected:mergeKind==='password'}});
    if(url.pathname.endsWith('/merge/start')){
     const body=route.request().postDataJSON();
     assert.equal(body.kind,mergeKind);
     if(mergeKind==='google')assert.equal(body.currentPassword,'fixture current password');
     return route.fulfill({json:{id:'fixture-challenge',factor:mergeKind==='google'?'totp':'email'}});
    }
    if(url.pathname.endsWith('/merge/confirm')){
     const body=route.request().postDataJSON();
     assert.equal(body.code,'123456');
     assert.equal(body.id,'fixture-challenge');
     if(mergeKind==='password')assert.equal(body.newPassword,'fixture created password');
     return route.fulfill({json:mergeKind==='google'?{url:url.origin+'/fixture-google'}:{ok:true}});
    }
    if(url.pathname.endsWith('/sign-up/email')){
     assert.equal(route.request().postDataJSON().password,'Boss1!xy');
     return route.fulfill({json:{user:{email:'fixture@example.test'}}});
    }
    if(url.pathname.endsWith('/sign-in/email'))return route.fulfill({json:{twoFactorRedirect:true}});
    if(url.pathname.endsWith('/request-password-reset'))return route.fulfill({json:{status:true}});
    return route.fulfill({status:503,json:{error:'fixture unavailable'}});
   }
   if(url.pathname.endsWith('EzBossLogo.png'))return route.fulfill({contentType:'image/png',body:logo});
   if(url.pathname.endsWith('.png'))return route.fulfill({status:204});
   return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}*{box-sizing:border-box}${css}</style><div id="root"></div><script>${script.replaceAll('</script>','<\\/script>')}</script>`});
  });
  try{
   if ([390,1280].includes(width)) {
    sessionUnavailable=true;
    await page.goto('http://localhost:5173/access-control');
    await page.getByRole('heading',{name:'Sign-in error'}).waitFor();
    await page.evaluate(()=>window.recoveryPageMarker=true);
    sessionUnavailable=false;
    await page.getByRole('button',{name:'Retry authentication'}).click();
    await page.getByRole('heading',{name:'Sign-in error'}).waitFor({state:'hidden'});
    assert.equal(await page.evaluate(()=>window.recoveryPageMarker),true,'retry keeps the same document');
   }
   await page.goto('http://localhost:5173/login');await page.getByRole('heading',{name:'Welcome back',exact:true}).waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}px`);
   if(process.env.AUTH_SCREENSHOT_DIRECTORY && [390,1280].includes(width)){await mkdir(process.env.AUTH_SCREENSHOT_DIRECTORY,{recursive:true});await page.screenshot({path:process.env.AUTH_SCREENSHOT_DIRECTORY+`/login-${width}.png`,fullPage:true});}
   if(width===1280){await page.evaluate(()=>document.body.style.zoom='2');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow at 200% zoom');await page.evaluate(()=>document.body.style.zoom='');}
   await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Password',{exact:true}).fill('fixture password');
   const password=page.getByLabel('Password',{exact:true}),showPassword=page.getByRole('button',{name:'Show password',exact:true});
   await assertRegularInputs(2);
   const field=await password.boundingBox(),toggle=await showPassword.boundingBox();
   assert.ok(toggle.x>=field.x && toggle.y>=field.y && toggle.x+toggle.width<=field.x+field.width && toggle.y+toggle.height<=field.y+field.height);
   await showPassword.click();assert.equal(await password.getAttribute('type'),'text');
   assert.equal(await password.evaluate(input=>getComputedStyle(input).fontWeight),'400');
   await page.getByRole('button',{name:'Hide password',exact:true}).press('Enter');
   assert.equal(await password.getAttribute('type'),'password');assert.equal(await password.inputValue(),'fixture password');
   await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/mfa?**');await page.getByLabel('Authenticator code',{exact:true}).waitFor();
   await assertRegularInputs(1);
   assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('fixture password')),false);
   assert.ok(requests.some(path=>path.endsWith('/sign-in/email')));
   await page.goto('http://localhost:5173/signup');await page.getByLabel('Full name',{exact:true}).fill('Fixture User');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');
   const ruleStates=()=>page.getByRole('list',{name:'Password requirements'}).getByRole('listitem').evaluateAll(rows=>rows.map(row=>row.dataset.state));
   const confirmation=page.getByLabel('Confirm password',{exact:true});
   const createAccount=page.getByRole('button',{name:'Create account',exact:true});
   await assertRegularInputs(4);
   assert.deepEqual(await ruleStates(),['pending','pending','pending','pending']);
   await page.getByRole('checkbox').check();
   await password.fill('boss 1xy');await confirmation.fill('boss 1xy');
   assert.deepEqual(await ruleStates(),['met','pending','pending','met']);
   await createAccount.click();await page.getByRole('alert').waitFor();
   assert.deepEqual(await ruleStates(),['met','failed','failed','met']);
   assert.equal(await password.inputValue(),'boss 1xy');
   await password.fill('Boss1!x');
   assert.deepEqual(await ruleStates(),['failed','met','met','met']);
   await password.fill('Boss1!xy');
   assert.deepEqual(await ruleStates(),['met','met','met','met']);
   await createAccount.click();await page.getByText('Make both passwords match.').waitFor();
   assert.equal(requests.filter(path=>path.endsWith('/sign-up/email')).length,0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`signup overflow at ${width}px`);
   await confirmation.fill('Boss1!xy');await createAccount.click();
   await page.waitForURL(url=>url.pathname==='/verify-email');
   assert.equal(requests.filter(path=>path.endsWith('/sign-up/email')).length,1);
   await page.goto('http://localhost:5173/login');
   const recoveryLink=page.locator('.ez-identity-password').getByRole('link',{name:'Forgot password?'});
   const recovery=await recoveryLink.boundingBox(),passwordBox=await password.boundingBox();
   const submitBox=await page.getByRole('button',{name:'Sign in',exact:true}).boundingBox();
   assert.ok(recovery.y>=passwordBox.y+passwordBox.height && recovery.y+recovery.height<=submitBox.y);
   await recoveryLink.click();await page.waitForURL(url=>url.pathname==='/forgot-password');await page.getByLabel('Email',{exact:true}).fill('unknown@example.test');
   await assertRegularInputs(1);
   await page.getByRole('button',{name:'Send recovery link'}).click();
   await page.getByText('If this address can be used for recovery, an email will arrive shortly.').waitFor();
   await page.goto('http://localhost:5173/reset-password?token=private-fixture-code');await page.getByRole('heading',{name:'Choose a new password'}).waitFor();await page.waitForFunction(()=>!location.search.includes('token='));
   await assertRegularInputs(2);
   await page.goto('http://localhost:5173/verify-email');
   await assertRegularInputs(1);
   if([375,1280].includes(width)){
    mergeKind='google';
    await page.goto('http://localhost:5173/login');
    await page.getByRole('button',{name:'Sign in with Google'}).waitFor();
    await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(button=>button.textContent.includes('Sign in with Google')).disabled);
    assert.equal(await page.getByRole('link',{name:/merge accounts|connect google|create an ezboss password/i}).count(),0);
    await page.goto('http://localhost:5173/login?googleError=1&error=account_not_linked');
    await page.getByRole('link',{name:'Merge Accounts',exact:true}).click();
    await page.getByLabel('Current password').fill('fixture current password');
    await page.getByRole('button',{name:'Start two-step verification'}).click();
    await page.getByLabel('Authenticator code').fill('123456');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.getByRole('button',{name:'Merge Accounts',exact:true}).click();
    await page.waitForURL('**/fixture-google');

    mergeKind='password';
    await page.goto('http://localhost:5173/auth/merge?kind=password&hosted=1');
    await page.getByRole('button',{name:'Start two-step verification'}).click();
    await page.getByLabel('Email code').fill('123456');
    await page.getByLabel('New password').fill('fixture created password');
    await page.getByLabel('Confirm password').fill('fixture created password');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.getByRole('button',{name:'Create password',exact:true}).click();
    await page.getByText('Return to the EzBoss app to sign in with your email and password.').waitFor();
    assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('fixture created password')),false);
   }
   assert.equal((await context.cookies()).length,0);assert.deepEqual(errors,[]);
  }catch(error){throw new Error(`width ${width} at ${page.url()}: ${error.message}; page errors: ${errors.join('; ')}`);}finally{await context.close();}
 }}finally{await browser.close();}
});
