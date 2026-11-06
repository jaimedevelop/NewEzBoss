const {test}=require('node:test');const assert=require('node:assert/strict');const {build}=require('esbuild');const {readFile,mkdir}=require('node:fs/promises');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
test('Better Auth forms validate and fit desktop/mobile widths without credential persistence',async()=>{
 const {outputFiles}=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import App from './src/App';import{BetterIdentityProvider}from'./src/contexts/IdentityAuth';import{installCookieSessionTransport}from'./src/services/authMode';installCookieSessionTransport();createRoot(document.getElementById('root')).render(<BetterIdentityProvider><App/></BetterIdentityProvider>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic',define:{'import.meta.env':JSON.stringify({VITE_AUTH_PROVIDER:'better-auth',VITE_API_URL:'/api'})},loader:{'.css':'empty','.png':'dataurl'},plugins:[{name:'vite-url-assets',setup(b){b.onResolve({filter:/\?url$/},()=>({path:'asset',namespace:'fixture-url'}));b.onLoad({filter:/.*/,namespace:'fixture-url'},()=>({contents:'export default "/fixture-worker.js";'}));}}]});
 const script=outputFiles[0].text,css=await readFile('src/mainComponents/auth/auth.css','utf8'),logo=await readFile('public/EzBossLogo.png');
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_EXECUTABLE||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try{for(const width of [320,375,390,768,1280]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{const url=new URL(route.request().url());
   if(url.pathname.startsWith('/api/auth/')){
    requests.push(url.pathname);
    if(url.pathname.endsWith('/ezboss/config'))return route.fulfill({json:{appOrigin:url.origin,providers:[],termsVersion:'fixture-1',privacyVersion:'fixture-1',termsURL:url.origin+'/legal/terms',privacyURL:url.origin+'/legal/privacy'}});
    if(url.pathname.endsWith('/get-session'))return route.fulfill({json:null});
    if(url.pathname.endsWith('/sign-in/email'))return route.fulfill({json:{twoFactorRedirect:true}});
    if(url.pathname.endsWith('/request-password-reset'))return route.fulfill({json:{status:true}});
    return route.fulfill({status:503,json:{error:'fixture unavailable'}});
   }
   if(url.pathname.endsWith('EzBossLogo.png'))return route.fulfill({contentType:'image/png',body:logo});
   if(url.pathname.endsWith('.png'))return route.fulfill({status:204});
   return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}*{box-sizing:border-box}${css}</style><div id="root"></div><script>${script.replaceAll('</script>','<\\/script>')}</script>`});
  });
  try{
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
