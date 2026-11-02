const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {build}=require('esbuild');
async function setup(){
 const state={subject:'admin',popup:0,fresh:0};
 const sdk={getUser:async()=>({sub:state.subject}),loginWithPopup:async options=>{state.popup++;state.options=options;},getTokenSilently:async options=>{assert.equal(options.cacheMode,'off');state.fresh++;return 'fresh-token';}};
 const {outputFiles}=await build({entryPoints:['src/services/security/adminStepUp.ts'],bundle:true,write:false,format:'iife',globalName:'stepup',plugins:[{name:'sdk',setup(b){b.onResolve({filter:/apiAuth$/},()=>({path:'sdk',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const getAuth0Client=()=>globalThis.sdk;'}));}}]});
 const ctx=vm.createContext({sdk,Headers,Response});vm.runInContext(outputFiles[0].text,ctx);return {...ctx.stepup,state,sdk};
}
const denial=()=>new Response(JSON.stringify({code:'ADMIN_STEP_UP_REQUIRED'}),{status:403});
test('admin action waits for explicit verification, bypasses token cache and retries its original body once',async()=>{
 const s=await setup();let approve;const ready=new Promise(resolve=>{s.installAdminStepUpPresenter(action=>{approve=action;resolve();return new Promise((accept,reject)=>{s.finish=()=>action().then(accept,reject);});});});
 const calls=[];const fetcher=async(url,init)=>{calls.push({url,init});return calls.length===1?denial():new Response('{}');};
 const pending=s.adminFetch('https://api.test/roles',{method:'PATCH',body:'{"role":1}',headers:{Authorization:'Bearer old'}},fetcher);
 await ready;assert.equal(s.state.popup,0);assert.equal(typeof approve,'function');s.finish();
 assert.equal((await pending).status,200);assert.equal(calls.length,2);assert.equal(calls[1].init.body,calls[0].init.body);
 assert.equal(calls[1].init.headers.get('Authorization'),'Bearer fresh-token');assert.equal(s.state.options.authorizationParams.max_age,0);assert.equal(s.state.options.authorizationParams.acr_values,'urn:ezboss:phishing-resistant-mfa');
});
test('denial after verification is returned without looping',async()=>{
 const s=await setup();s.installAdminStepUpPresenter(action=>action());let calls=0;
 assert.equal((await s.adminFetch('https://api.test/roles',{},async()=>{calls++;return denial();})).status,403);assert.equal(calls,2);
});
test('cancelled verification and account switching never replay an admin mutation',async()=>{
 for(const mode of ['cancel','switch']){
  const s=await setup();let calls=0;
  s.installAdminStepUpPresenter(action=>mode==='cancel'?Promise.reject(new Error('cancelled')):action());
  s.sdk.loginWithPopup=async()=>{s.state.subject='other';};
  await assert.rejects(s.adminFetch('https://api.test/roles',{method:'DELETE'},async()=>{calls++;return denial();}));assert.equal(calls,1);
 }
});
test('concurrent assurance denials share one verification prompt',async()=>{
 const s=await setup();let prompts=0;s.installAdminStepUpPresenter(async action=>{prompts++;return action();});
 const fetcher=async(_url,init)=>new Headers(init?.headers).has('Authorization')?new Response('{}'):denial();
 await Promise.all([s.adminFetch('https://api.test/roles',{},fetcher),s.adminFetch('https://api.test/users',{},fetcher)]);assert.equal(prompts,1);
});
