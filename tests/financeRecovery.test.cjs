const test=require('node:test');const assert=require('node:assert/strict');const {build}=require('esbuild');
test('finance polling reports failure and then recovery for the same collection',async()=>{
 const state={fail:true};const window=new EventTarget();window.setInterval=()=>1;
 const events=[];window.addEventListener('ezboss:finance-read-error',e=>events.push(['error',e.detail.kind]));window.addEventListener('ezboss:finance-recovered',e=>events.push(['recovered',e.detail]));
 const {outputFiles}=await build({entryPoints:['src/services/finances/financeApi.ts'],bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'request',setup(b){b.onResolve({filter:/collectionsApi$/},()=>({path:'request',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export async function collectionsApiRequest(){if(state.fail)throw new Error("Request failed: 404");return []}'}));}}]});
 const module={exports:{}};new Function('module','exports','window','state','clearInterval',outputFiles[0].text)(module,module.exports,window,state,()=>{});
 const dispose=module.exports.financeSubscribe('bank-accounts',()=>{});
 await new Promise(setImmediate);assert.deepEqual(events,[['error','bank-accounts']]);
 state.fail=false;window.dispatchEvent(new Event('focus'));await new Promise(setImmediate);
 assert.deepEqual(events,[['error','bank-accounts'],['recovered','bank-accounts']]);dispose();
});
