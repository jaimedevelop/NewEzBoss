const test=require('node:test');const assert=require('node:assert/strict');const {build}=require('esbuild');const {webcrypto}=require('node:crypto');
async function service(){
 const calls=[];const api={financeWrite:async(...args)=>{calls.push(args);return {id:'new',imported:1,duplicates:0}},financeList:async(...args)=>{calls.push(args);return []}};
 const {outputFiles}=await build({entryPoints:['src/services/finances/bank/transactions.ts'],bundle:true,write:false,platform:'node',format:'cjs',plugins:[{name:'api',setup(b){b.onResolve({filter:/financeApi$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'module.exports=globalThis.__api'}));}}]});
 const m={exports:{}};new Function('module','exports','globalThis','crypto',outputFiles[0].text)(m,m.exports,{__api:api},webcrypto);return {...m.exports,calls,api};
}
test('transactions use API and stable retry identity without authoritative owner payload',async()=>{
 const s=await service();const row={bankAccountId:'bank',date:'2026-11-02',amount:-12,description:'Fuel',status:'pending',category:'Fuel'};
 assert.equal(await s.createTransaction(row),'new');assert.equal(s.calls[0][0],'bank-transactions');assert.equal(s.calls[0][2].userId,undefined);
 await s.getTransactions('bank/a');assert.equal(s.calls[1][1],'bankAccountId=bank%2Fa');
 await s.bulkCreateTransactions([row]);await s.bulkCreateTransactions([row]);assert.equal(s.calls[2][2].importId,s.calls[3][2].importId);
 await s.bulkCreateTransactions([row],'file-sha');assert.equal(s.calls[4][2].importId,'file-sha');
});
test('API denial propagates to caller instead of reporting successful import',async()=>{
 const s=await service();s.api.financeWrite=async()=>{throw Error('denied')};s.api.financeList=async()=>{throw Error('denied')};
 await assert.rejects(s.getTransactions('bank'),/denied/);await assert.rejects(s.bulkCreateTransactions([]),/denied/);
});
