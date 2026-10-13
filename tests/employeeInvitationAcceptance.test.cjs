const {test}=require('node:test');
const assert=require('node:assert/strict');
const {build}=require('esbuild');
const vm=require('node:vm');
const path=require('node:path');

test('successful acceptance survives remount, rejects other users and new invitations',async()=>{
  const storage=new Map([['ezboss.employee.continuation','invitation-a']]);
  const sessionStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
  const state=[];let cursor=0;const effects=[];
  const hooks={useState:init=>{const i=cursor++;if(!(i in state))state[i]=typeof init==='function'?init():init;return [state[i],v=>state[i]=typeof v==='function'?v(state[i]):v]},useEffect:fn=>effects.push(fn)};
  const auth={isAuthenticated:true,user:{sub:'employee-a',email_verified:true},getAccessTokenSilently:async()=> 'token'};
  let refreshes=0,fail=false;
  const context={accountKind:null,completeOnboarding:async()=>{refreshes++;state.length=0}};
  const result=await build({entryPoints:[path.resolve('src/pages/employee/EmployeeAccountOnboarding.tsx')],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',define:{'import.meta.env.VITE_API_URL':'"https://api.test"'},plugins:[{name:'mocks',setup(b){
    b.onResolve({filter:/^react$|^react\/jsx-runtime$|^@auth0\/auth0-react$|contexts\/AuthContext$/},a=>({path:a.path,namespace:'mock'}));
    b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='react'?'export const useState=hooks.useState;export const useEffect=hooks.useEffect;':a.path==='react/jsx-runtime'?'export const jsx=(type,props)=>({type,props});export const jsxs=jsx;export const Fragment="fragment";':a.path.includes('auth0')?'export const useAuth0=()=>auth;':'export const useAuthContext=()=>context;'}));
  }}]});
  const module={exports:{}};
  const window={location:{pathname:'/employee-account',hash:''}};
  vm.runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,hooks,auth,context,sessionStorage,window,URLSearchParams,fetch:async url=>({ok:!fail,json:async()=>fail?{error:'Acceptance failed'}:url.endsWith('/accept')?{status:'accepted'}:{company:'Company',position:'Employee'}})});
  const render=()=>{cursor=0;effects.length=0;return module.exports.default()};
  const nodes=t=>Array.isArray(t)?t.flatMap(nodes):t&&typeof t==='object'?[t,...nodes(t.props?.children)]:[];
  render();await Promise.all(effects.map(fn=>fn()));
  let tree=render();
  await nodes(tree).find(n=>n.type==='button'&&n.props.children==='Accept invitation and join company').props.onClick();
  // The click handler deliberately returns void; allow async acceptance and refresh to settle.
  await new Promise(resolve=>setImmediate(resolve));
  tree=render();
  assert.equal(refreshes,1);
  assert.ok(nodes(tree).some(n=>n.type==='h1'&&n.props.children==='Invitation accepted'));
  assert.ok(nodes(tree).some(n=>n.type==='a'&&n.props.href==='/dashboard'));
  state.length=0;tree=render();
  assert.ok(nodes(tree).some(n=>n.type==='h1'&&n.props.children==='Invitation accepted'));
  auth.user.sub='employee-b';tree=render();
  assert.ok(nodes(tree).some(n=>n.type==='h1'&&n.props.children==='Employee invitation'));
  auth.user.sub='employee-a';window.location.hash='#token=new-token';tree=render();
  assert.ok(nodes(tree).some(n=>n.type==='h1'&&n.props.children==='Employee invitation'));
  window.location.hash='';storage.delete('ezboss.employee.acceptedSubject');storage.set('ezboss.employee.continuation','invitation-b');state.length=0;fail=true;tree=render();
  nodes(tree).find(n=>n.type==='button'&&n.props.children==='Accept invitation and join company').props.onClick();
  await new Promise(resolve=>setImmediate(resolve));tree=render();
  assert.ok(nodes(tree).some(n=>n.props?.children==='Acceptance failed'));
  assert.equal(storage.has('ezboss.employee.acceptedSubject'),false);
});
