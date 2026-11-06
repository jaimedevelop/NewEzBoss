const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {build}=require('esbuild');
async function setup(){
 const {outputFiles}=await build({entryPoints:['src/services/authMode.ts'],bundle:true,write:false,format:'iife',globalName:'mode',define:{'import.meta.env':JSON.stringify({VITE_AUTH_PROVIDER:'better-auth',VITE_API_URL:'/api'})}});
 const calls=[],saved=new Map();
 const window={location:{origin:'https://alpha.example'},dispatchEvent(){},fetch:async(input,init)=>{calls.push({input,init});return new Response('{}');}};
 const context=vm.createContext({window,URL,Headers,Request,Response,Event,DOMException,crypto:require('node:crypto'),localStorage:{getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)}});
 vm.runInContext(outputFiles[0].text,context);context.mode.installCookieSessionTransport();return{context,window,calls,saved};
}
test('cookie transport marker is stripped, never treated as a bearer credential, and cannot target another origin',async()=>{
 const {context,window,calls}=await setup();const handle=context.mode.createCookieSessionHandle('fixture-user','fixture-session');
 await window.fetch('https://alpha.example/api/profile',{method:'PATCH',headers:{Authorization:`Bearer ${handle}`}});
 const init=calls[0].init;assert.equal(init.credentials,'include');assert.equal(init.headers.has('Authorization'),false);assert.equal(init.headers.get('X-EzBoss-CSRF'),'1');assert.equal(init.headers.get('X-EzBoss-Identity'),'fixture-user');assert.equal(init.headers.get('X-EzBoss-Session'),'fixture-session');
 for(const target of ['https://evil.example/api/profile','https://alpha.example/api-evil/profile'])await assert.rejects(window.fetch(target,{headers:{Authorization:`Bearer ${handle}`}}));
 assert.equal(calls.length,1);
 await window.fetch('https://alpha.example/api/client-auth/me',{headers:{Authorization:'Bearer independent-client-token'}});
 assert.equal(calls[1].init.headers.Authorization,'Bearer independent-client-token');assert.equal(calls[1].init.credentials,undefined);
 context.mode.setCookieSignOutBarrier(false);await assert.rejects(window.fetch('https://alpha.example/api/profile',{headers:{Authorization:`Bearer ${handle}`}}));
});
test('sign-out barrier stores only nonsecret flags and an identity-change epoch',async()=>{
 const {context,saved}=await setup();assert.equal(context.mode.cookieSignOutBarrier(),false);
 context.mode.setCookieSignOutBarrier(true);assert.equal(context.mode.cookieSignOutBarrier(),true);assert.equal(saved.get('ezboss.cookie.signedOut'),'1');assert.match(saved.get('ezboss.cookie.identityEpoch'),/^[0-9a-f-]{36}$/);
 context.mode.setCookieSignOutBarrier(false);assert.equal(saved.size,1);assert.equal(saved.has('ezboss.cookie.signedOut'),false);assert.equal(context.mode.cookieSignOutBarrier(),false);
});
