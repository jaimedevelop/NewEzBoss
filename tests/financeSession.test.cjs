const test=require('node:test');const assert=require('node:assert/strict');const {build}=require('esbuild');
async function session(){
 const state={token:async()=> 'token',fetch:async()=>({ok:true,status:200,json:async()=>[]}),fetches:0};
 const {outputFiles}=await build({stdin:{contents:"export {collectionsApiRequest} from './src/services/collections/collectionsApi'; export {setCompanySession} from './src/services/companySession';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',define:{'import.meta.env.VITE_API_URL':'"https://api.test"'},plugins:[{name:'token',setup(b){b.onResolve({filter:/apiAuth$/},a=>({path:a.path,namespace:'token'}));b.onLoad({filter:/.*/,namespace:'token'},()=>({contents:'export const getApiAccessToken=()=>globalThis.state.token()'}));}}]});
 const m={exports:{}};new Function('module','exports','globalThis','fetch',outputFiles[0].text)(m,m.exports,{state},(...args)=>{state.fetches++;return state.fetch(...args)});return {...m.exports,state};
}
test('company switch during token renewal prevents stale writes',async()=>{
 const s=await session();let release;s.state.token=()=>new Promise(r=>release=r);s.setCompanySession('a');
 const pending=s.collectionsApiRequest('/legacy-finance/bank-accounts',{method:'POST',body:'{}'});s.setCompanySession('b');release('token');
 await assert.rejects(pending,/Company session changed/);assert.equal(s.state.fetches,0);
});
test('company switch while parsing response discards stale data',async()=>{
 const s=await session();let release;let entered;const parsing=new Promise(r=>entered=r);
 s.state.fetch=async()=>({ok:true,status:200,json:()=>{entered();return new Promise(r=>release=r)}});s.setCompanySession('a');
 const pending=s.collectionsApiRequest('/legacy-finance/bank-accounts');await parsing;s.setCompanySession('b');release([{id:'old-company'}]);
 await assert.rejects(pending,/Company session changed/);
});
