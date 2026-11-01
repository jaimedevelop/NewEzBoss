const test = require('node:test');
const assert = require('node:assert/strict');
const {build} = require('esbuild');
async function service() {
 const calls=[],auth={currentUser:{uid:'owner-a'}};
 const firestore={collection:(_db,name)=>name,doc:()=>({}),where:(...args)=>args,orderBy:(...args)=>args,query:(...args)=>args,Timestamp:{now:()=>123},
  addDoc:async(ref,data)=>{calls.push({ref,data});return {id:'new'};},getDocs:async q=>{calls.push({q});return {forEach(){}};},
  writeBatch:()=>({set:(_ref,data)=>calls.push({data}),commit:async()=>{calls.push({committed:true});}})};
 const {outputFiles}=await build({entryPoints:['src/services/finances/bank/transactions.ts'],bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'mock',setup(b){b.onResolve({filter:/firebase/},args=>({path:args.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='firebase/firestore'?'module.exports=globalThis.__bank.firestore;':'module.exports={db:{},auth:globalThis.__bank.auth};'}));}}]});
 const mod={exports:{}};new Function('module','exports','globalThis',outputFiles[0].text)(mod,mod.exports,{__bank:{auth,firestore}});
 return {...mod.exports,calls,auth,firestore};
}
test('bank transaction queries and writes use the signed-in owner and omit undefined import fields',async()=>{
 const s=await service();await s.createTransaction({bankAccountId:'bank',amount:1});assert.equal(s.calls[0].data.userId,'owner-a');
 await s.getTransactions('bank');assert(s.calls[1].q.some(value=>JSON.stringify(value)===JSON.stringify(['userId','==','owner-a'])));
 await s.bulkCreateTransactions([{bankAccountId:'bank',amount:1,balance:undefined}]);assert.equal(s.calls[2].data.userId,'owner-a');assert(!('balance' in s.calls[2].data));assert.equal(s.calls[3].committed,true);
});
test('bank transactions fail visibly on denial and reject oversized imports before writing',async()=>{
 const s=await service();s.firestore.getDocs=async()=>{throw Error('denied');};await assert.rejects(s.getTransactions('bank'),/denied/);
 await assert.rejects(s.bulkCreateTransactions(Array(501).fill({bankAccountId:'bank'})),/500/);assert.equal(s.calls.length,0);
 s.auth.currentUser=null;await assert.rejects(s.createTransaction({bankAccountId:'bank'}),/Sign in/);
});
