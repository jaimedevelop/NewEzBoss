import React, { useState } from 'react';
import {createRoot} from 'react-dom/client';
import { EzBossLoader, EzBossLoadingProvider } from '../../../src/mainComponents/ui/EzBossLoader';
function Scenario({ signedIn, signIn }: { signedIn: boolean; signIn: () => void }) {
 const [loading,setLoading]=useState(false);
 const [compact,setCompact]=useState(false);
 const [ready,setReady]=useState(false);
 function navigate(startup=false){
  setReady(false);setLoading(true);
  const started=performance.now();let uncovered=0;let covered=0;let fadeFrames=0;let skeletonFrames=0;
  function sample(){
   const elapsed=performance.now()-started;
   const overlay=document.querySelector('.ezboss-page-reveal');
   if(document.querySelector('[data-ready]') && elapsed<1550){if(overlay)covered++;else uncovered++;}
   if(overlay){const opacity=Number(getComputedStyle(overlay).opacity);if(opacity>0 && opacity<1)fadeFrames++;}
   if(document.querySelector('.ezboss-skeleton'))skeletonFrames++;
   if(elapsed<(startup?2150:1100))requestAnimationFrame(sample);
   else document.querySelector('#result')!.textContent=JSON.stringify({startup,uncovered,covered,fadeFrames,skeletonFrames});
  }
  requestAnimationFrame(sample);
  setTimeout(()=>{if(startup)signIn();setLoading(false);setReady(true)},startup?200:700);
 }
 return <main style={{fontFamily:'sans-serif',padding:30}}><h1>EzBoss loading verification</h1><button onClick={()=>navigate(true)} disabled={signedIn}>Sign in</button><button onClick={()=>navigate()}>Load tab</button><button onClick={()=>{setCompact(true);setTimeout(()=>setCompact(false),200)}}>Save action</button><output id="result" />{loading && <EzBossLoader variant={signedIn?'skeleton':'brand'}/>}{compact && <EzBossLoader size={16}/>} {ready && <article data-ready>Loaded destination</article>}</main>
}
function Fixture(){
 const [signedIn,setSignedIn]=useState(false);
 return <EzBossLoadingProvider ready={signedIn}><Scenario signedIn={signedIn} signIn={()=>setSignedIn(true)}/></EzBossLoadingProvider>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Fixture/></React.StrictMode>);
