const {test}=require('node:test');const assert=require('node:assert/strict');const {build}=require('esbuild');const {readFile,mkdir}=require('node:fs/promises');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
test('Better Auth forms validate and fit desktop/mobile widths without credential persistence',async()=>{
 const {outputFiles}=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import App from './src/App';import{BetterIdentityProvider}from'./src/contexts/IdentityAuth';import{installCookieSessionTransport}from'./src/services/authMode';import{getCookieSessionHandle}from'./src/services/authClient';window.getCookieSessionHandle=getCookieSessionHandle;installCookieSessionTransport();createRoot(document.getElementById('root')).render(<BetterIdentityProvider><App/></BetterIdentityProvider>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic',define:{'import.meta.env':JSON.stringify({VITE_AUTH_PROVIDER:'better-auth',VITE_API_URL:'/api'})},loader:{'.css':'empty','.png':'dataurl'},plugins:[{name:'vite-url-assets',setup(b){b.onResolve({filter:/\?url$/},()=>({path:'asset',namespace:'fixture-url'}));b.onLoad({filter:/.*/,namespace:'fixture-url'},()=>({contents:'export default "/fixture-worker.js";'}));}}]});
 const script=outputFiles[0].text,css=await readFile('src/mainComponents/auth/auth.css','utf8'),logo=await readFile('public/EzBossLogo.png');
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{for(const width of [320,375,390,768,1280]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],requests=[];let pendingIdentity=true,migrations=0;let termsVersion="fixture-1",googleSession=false,legalAccepted=false,configUnavailable=false,sessionUnavailable=false,rateLimitOnce=false,recoveredSession;page.on('pageerror',e=>errors.push(e.message));
  let signOutRetryAt;
  await page.route('**/*',async route=>{const url=new URL(route.request().url());
   if(url.pathname.startsWith('/api/auth/')){
    requests.push(url.pathname);
    if(url.pathname.endsWith('/ezboss/config') && configUnavailable)return route.fulfill({status:503,headers:{'X-EzBoss-Request-Id':'config-outage-id'},json:{}});
    if(url.pathname.endsWith('/ezboss/config'))return route.fulfill({json:{appOrigin:url.origin,providers:["google"],googleMigrationEnabled:true,termsVersion,privacyVersion:'fixture-1',termsURL:url.origin+'/legal/terms',privacyURL:url.origin+'/legal/privacy'}});
    if(url.pathname.endsWith('/ezboss/status'))return route.fulfill({json:{legalAccepted}});
    if(url.pathname.endsWith('/sign-out')){
     if(!signOutRetryAt){
      signOutRetryAt=Date.now()+2000;
      return route.fulfill({status:429,headers:{'X-Retry-After':'2'},json:{}});
     }
     assert.ok(Date.now()>=signOutRetryAt, `sign-out retried ${signOutRetryAt-Date.now()} ms early (${route.request().method()})`);
     googleSession=false;
     return route.fulfill({json:{success:true}});
    }
    if(url.pathname.endsWith('/get-session')){
     if(rateLimitOnce){
      rateLimitOnce=false;
      recoveredSession=Date.now()+2000;
      return route.fulfill({status:429,headers:{'X-Retry-After':'2','X-EzBoss-Request-Id':'fixture-limit-id'},json:{}});
     }
     if(recoveredSession) assert.ok(Date.now()>=recoveredSession,'the next session request respects the cooldown');
     if(googleSession)return route.fulfill({json:{session:{id:'session'},user:{id:'user'}}});
     return sessionUnavailable ? route.fulfill({status:503,json:{error:'fixture outage'}}) : route.fulfill({json:null});
    }
    if(url.pathname.endsWith('/sign-in/social'))return route.fulfill({status:400,json:{code:'fixture'}});
    if(url.pathname.endsWith('/sign-in/email'))return route.fulfill({json:{twoFactorRedirect:true}});
    if(url.pathname.endsWith('/request-password-reset'))return route.fulfill({json:{status:true}});
    return route.fulfill({status:503,json:{error:'fixture unavailable'}});
   }
   if(url.pathname==='/api/account/me')return route.fulfill({json:{pendingIdentity}});
   if(url.pathname==='/api/account/google-migration'){
    assert.equal(route.request().method(),'POST');
    assert.equal(route.request().headers()['x-ezboss-session'],'session');
    migrations++;pendingIdentity=false;
    return route.fulfill({status:204});
   }
   if(url.pathname.endsWith('EzBossLogo.png'))return route.fulfill({contentType:'image/png',body:logo});
   if(url.pathname.endsWith('.png'))return route.fulfill({status:204});
   return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}*{box-sizing:border-box}${css}</style><div id="root"></div><script>${script.replaceAll('</script>','<\\/script>')}</script>`});
  });
  try{
   if ([390,1280].includes(width)) {
    await page.goto('http://localhost:5173/login');
    const social=page.waitForRequest(req=>req.url().endsWith('/api/auth/sign-in/social'));
    await page.getByRole('button',{name:'Continue with Google'}).click();
    assert.equal((await social).postDataJSON().requestSignUp,true);
    googleSession=true;
    const callback='http://localhost:5173/auth/google/complete?returnTo=%2Fprojects';
    await page.route('**/projects',route=>route.fulfill({contentType:'text/html',body:'Workspace fixture'}));
    await page.goto(callback);
    await page.waitForURL('**/auth/consent?returnTo=%2Fprojects',{timeout:10000});
    await page.evaluate(()=>localStorage.setItem('ezboss.cookie.signedOut','1'));
    legalAccepted=true;
    await page.goto(callback);
    await page.waitForURL('**/projects',{timeout:10000});
    assert.equal(await page.evaluate(()=>localStorage.getItem('ezboss.cookie.signedOut')),null);
    termsVersion=null;
    legalAccepted=false;
    await page.goto(callback);
    await page.waitForURL('**/projects',{timeout:10000});
    termsVersion='fixture-1';
    assert.equal(migrations,1);
    googleSession=false;
    configUnavailable=true;
    await page.goto('http://localhost:5173/auth/consent?returnTo=%2F');
    await page.getByText('Request ID config-outage-id').waitFor();
    assert.equal(await page.getByRole('button',{name:'Accept and continue'}).isEnabled(),false);
    configUnavailable=false;
    await page.getByRole('button',{name:'Retry authentication configuration'}).click();
    await page.getByRole('checkbox').waitFor();
    assert.equal(await page.getByRole('button',{name:'Retry authentication configuration'}).count(),0);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));

    sessionUnavailable=true;
    const readsBeforeLogout=requests.filter(path=>path.endsWith('/get-session')).length;
    await page.evaluate(()=>localStorage.setItem('ezboss.cookie.signedOut','1'));
    await page.goto('http://localhost:5173/landing/login');
    await page.getByRole('heading',{name:'Welcome back',exact:true}).waitFor();
    assert.equal(requests.filter(path=>path.endsWith('/get-session')).length,readsBeforeLogout);
    await page.evaluate(()=>localStorage.removeItem('ezboss.cookie.signedOut'));
    await page.goto('http://localhost:5173/access-control');
    await page.getByRole('heading',{name:'Sign-in error'}).waitFor();
    await page.evaluate(()=>window.recoveryPageMarker=true);
    sessionUnavailable=false;
    await page.getByRole('button',{name:'Retry authentication'}).click();
    await page.getByRole('heading',{name:'Sign-in error'}).waitFor({state:'hidden'});
    assert.equal(await page.evaluate(()=>window.recoveryPageMarker),true,'retry keeps the same document');
    rateLimitOnce=true;
    await page.goto('http://localhost:5173/access-control');
    await page.getByText('Too many attempts. Try again in 2 seconds.').waitFor();
    await page.getByText('Request ID fixture-limit-id').waitFor();
    await page.evaluate(()=>window.recoveryPageMarker=true);
    const readsDuringCooldown=requests.filter(path=>path.endsWith('/get-session')).length;
    await page.getByRole('button',{name:'Retry authentication'}).click();
    assert.equal(requests.filter(path=>path.endsWith('/get-session')).length,readsDuringCooldown);
    await page.getByRole('heading',{name:'Sign-in error'}).waitFor({state:'hidden'});
    assert.equal(requests.filter(path=>path.endsWith('/get-session')).length,readsDuringCooldown+1);
    assert.equal(await page.evaluate(()=>window.recoveryPageMarker),true);
    recoveredSession=undefined;

    googleSession=true;
    await page.goto('http://localhost:5173/account-requests');
    const signOut=page.getByRole('button',{name:'Sign out',exact:true});
    await signOut.waitFor();
    rateLimitOnce=true;
    const resumedSession=page.waitForResponse(response=>response.url().endsWith('/api/auth/get-session'));
    const account=await page.evaluate(async ()=>{
     const now=Date.now;
     Date.now=()=>now()+11_000;
     try {
      document.dispatchEvent(new Event('visibilitychange'));
      const token=await window.getCookieSessionHandle();
      const response=await fetch('/api/account/me',{headers:{Authorization:'Bearer '+token}});
      return response.json();
     } finally {
      Date.now=now;
     }
    });
    assert.equal((await resumedSession).status(),429);
    assert.equal(account.pendingIdentity,pendingIdentity);
    recoveredSession=undefined;
    await signOut.click();
    await page.getByRole('heading',{name:'Unable to complete sign-out'}).waitFor();
    assert.equal(await page.getByRole('alert').textContent(),'Too many attempts. Try again in 2 seconds.');
    assert.equal(await page.evaluate(()=>localStorage.getItem('ezboss.cookie.signedOut')),'1');
    const retrySignOut=page.getByRole('button',{name:'Retry sign-out'});
    await retrySignOut.click();
    assert.equal(requests.filter(path=>path.endsWith('/sign-out')).length,1);
    await new Promise(resolve=>setTimeout(resolve, Math.max(0,signOutRetryAt+250-Date.now())));
    await retrySignOut.click();
    await page.waitForURL('**/landing/login');
    assert.equal(requests.filter(path=>path.endsWith('/sign-out')).length,2);
    await page.evaluate(()=>localStorage.removeItem('ezboss.cookie.signedOut'));
   }
   await page.goto('http://localhost:5173/login');await page.getByRole('heading',{name:'Welcome back',exact:true}).waitFor();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}px`);
   if(process.env.AUTH_SCREENSHOT_DIRECTORY && [390,1280].includes(width)){await mkdir(process.env.AUTH_SCREENSHOT_DIRECTORY,{recursive:true});await page.screenshot({path:process.env.AUTH_SCREENSHOT_DIRECTORY+`/login-${width}.png`,fullPage:true});}
   if(width===1280){await page.evaluate(()=>document.body.style.zoom='2');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow at 200% zoom');await page.evaluate(()=>document.body.style.zoom='');}
   await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');await page.getByLabel('Password',{exact:true}).fill('fixture password');
   await page.getByRole('button',{name:'Show password',exact:true}).click();assert.equal(await page.getByLabel('Password',{exact:true}).getAttribute('type'),'text');
   await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/mfa?**');await page.getByLabel('Authenticator code',{exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('fixture password')),false);
   assert.ok(requests.some(path=>path.endsWith('/sign-in/email')));
   await page.goto('http://localhost:5173/signup');await page.getByLabel('Full name',{exact:true}).fill('Fixture User');await page.getByLabel('Email',{exact:true}).fill('fixture@example.test');
   await page.getByLabel('Password',{exact:true}).fill('fixture password 123');await page.getByLabel('Confirm password',{exact:true}).fill('different password');await page.getByRole('checkbox').check();
   await page.getByRole('button',{name:'Create account',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(requests.filter(path=>path.endsWith('/sign-up/email')).length,0);
   await page.goto('http://localhost:5173/forgot-password');await page.getByLabel('Email',{exact:true}).fill('unknown@example.test');await page.getByRole('button',{name:'Send recovery link'}).click();
   await page.getByText('If this address can be used for recovery, an email will arrive shortly.').waitFor();
   await page.goto('http://localhost:5173/reset-password?token=private-fixture-code');await page.getByRole('heading',{name:'Choose a new password'}).waitFor();await page.waitForFunction(()=>!location.search.includes('token='));
   assert.equal((await context.cookies()).length,0);assert.deepEqual(errors,[]);
  }catch(error){throw new Error(`${error.message}; page errors: ${errors.join('; ')}`);}finally{await context.close();}
 }}finally{await browser.close();}
});
