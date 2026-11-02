import test from 'node:test';
import assert from 'node:assert/strict';
import { beginAccountBrowserSession, clearAccountBrowserData, migrateBrowserCredentials, browserStorageCleanupFailed } from '../src/services/security/browserStorage';
function storage(){
 const s=Object.create(null);
 Object.defineProperties(s,{getItem:{configurable:true,value(k:string){return this[k]??null;}},setItem:{configurable:true,value(k:string,v:string){this[k]=v;}},removeItem:{configurable:true,value(k:string){delete this[k];}}});return s;
}
test('same-account reload preserves offline drafts and the supplier handoff; identity transition purges them',()=>{
 const s=storage();const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:s});
 try {
  beginAccountBrowserSession('alice');s['ezboss:finance-drafts:alice']='unsaved';s.ezboss_supplier_data='pending';
  beginAccountBrowserSession('alice');assert.equal(s['ezboss:finance-drafts:alice'],'unsaved');assert.equal(s.ezboss_supplier_data,'pending');
  beginAccountBrowserSession('bob');assert.equal(s['ezboss:finance-drafts:alice'],undefined);assert.equal(s.ezboss_supplier_data,undefined);
  s['ezboss:finance-drafts:bob']='unsaved';clearAccountBrowserData();assert.equal(s['ezboss:finance-drafts:bob'],undefined);
 }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete (globalThis as any).localStorage;}
});
test('unavailable or throwing browser storage never aborts credential cleanup',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('access denied');}});
 try {assert.doesNotThrow(()=>migrateBrowserCredentials());assert.doesNotThrow(()=>clearAccountBrowserData());assert.doesNotThrow(()=>beginAccountBrowserSession('alice'));}
 finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete (globalThis as any).localStorage;}
 for(const operation of ['getItem','setItem','removeItem']){
  const s=storage();s['@@auth0spajs@@old']='old';s.collection_ai_settings='{}';
  Object.defineProperty(s,operation,{value(){throw Error('denied');}});
  assert.doesNotThrow(()=>migrateBrowserCredentials(s));
 }
 assert.equal(browserStorageCleanupFailed(),true);
});
