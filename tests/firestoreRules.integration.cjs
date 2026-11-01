// Run only via the demo-project emulator; never connects to a real Firebase project.
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const modules=process.env.EZBOSS_RULES_MODULES;
if(!modules||!process.env.FIRESTORE_EMULATOR_HOST)throw Error('Use the local rules emulator with explicit test SDK modules');
const {initializeTestEnvironment,assertFails,assertSucceeds}=require(path.join(modules,'@firebase/rules-unit-testing'));
const {doc,setDoc,getDoc,updateDoc,deleteDoc,collection,query,where,getDocs}=require(path.join(modules,'firebase/firestore'));
test('Firestore denies migrated data and foreign owners; legacy writes preserve tenant identity',async()=>{
  const env=await initializeTestEnvironment({projectId:'demo-ezboss-week4',firestore:{rules:fs.readFileSync('firestore.rules','utf8')}});
  try {
    await env.withSecurityRulesDisabled(async ctx=>{
      for(const name of ['estimates','estimateTokens','users','projects','collections','unknown','bankAccounts','transaction_categories'])await setDoc(doc(ctx.firestore(),name,'fixture'),{userId:'owner',name:'TEST'});
    });
    const owner=env.authenticatedContext('owner').firestore(),foreign=env.authenticatedContext('other').firestore(),guest=env.unauthenticatedContext().firestore();
    for(const name of ['estimates','estimateTokens','users','projects','collections','unknown']) {
      await assertFails(getDoc(doc(owner,name,'fixture')));
      await assertFails(setDoc(doc(owner,name,'new'),{userId:'owner'}));
    }
    for(const name of ['bankAccounts','financeCategories','budgetGoals','payments','calendarEvents','bank_transactions','transaction_categories']) {
      await assertSucceeds(setDoc(doc(owner,name,'mine'),{userId:'owner',name:'TEST'}));
      await assertSucceeds(getDoc(doc(owner,name,'mine')));
      await assertSucceeds(updateDoc(doc(owner,name,'mine'),{name:'changed'}));
      await assertFails(updateDoc(doc(owner,name,'mine'),{userId:'other'}));
      await assertFails(getDoc(doc(foreign,name,'mine')));
      await assertFails(deleteDoc(doc(foreign,name,'mine')));
      await assertFails(setDoc(doc(owner,name,'foreign'),{userId:'other'}));
      await assertFails(getDoc(doc(guest,name,'mine')));
      await assertSucceeds(getDocs(query(collection(owner,name),where('userId','==','owner'))));
      await assertFails(setDoc(doc(owner,name,'mine','nested','private'),{userId:'owner'}));
      await assertSucceeds(deleteDoc(doc(owner,name,'mine')));
    }
  }finally{await env.cleanup();}
});
