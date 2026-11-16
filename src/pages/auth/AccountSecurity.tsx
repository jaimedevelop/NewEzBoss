import QRCode from 'qrcode';
import { setCookieSignOutBarrier } from '../../services/authMode';
import { useEffect, useState } from 'react';
import { authClient, authRequest } from '../../services/authClient';
export default function AccountSecurity() {
 const [password,setPassword]=useState(''),[code,setCode]=useState(''),[setup,setSetup]=useState<{totpURI:string;backupCodes:string[]}|null>(null);
 const [qr,setQr]=useState(''),[currentSessionId,setCurrentSessionId]=useState('');
 const [keys,setKeys]=useState<any[]>([]),[sessions,setSessions]=useState<any[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [authenticatorEnabled,setAuthenticatorEnabled]=useState<boolean|null>(null);
 const [google,setGoogle]=useState<'unavailable'|'available'|'connected'>('unavailable');
 async function reload(){const [k,s,current]=await Promise.all([authRequest('/passkey/list-user-passkeys'),authRequest('/list-sessions'),authRequest('/get-session')]);setKeys(k);setSessions(s);setCurrentSessionId(current?.session?.id||'');setAuthenticatorEnabled(current?.user ? current.user.twoFactorEnabled===true : null);}
 useEffect(()=>{void reload().catch(()=>setMessage('Security settings are temporarily unavailable.'));return()=>{setSetup(null);setQr('');};},[]);
 useEffect(()=>{
  let active=true;
  async function loadGoogleStatus(){
   const config=await authRequest('/ezboss/config');
   if(!active || !config.providers.includes('google'))return;
   const status=await authRequest('/ezboss/merge/status',{});
   if(active)setGoogle(status.googleConnected?'connected':'available');
  }
  void loadGoogleStatus().catch(()=>{if(active)setMessage('Could not check whether Google is connected.');});
  return()=>{active=false;};
 },[]);
 async function action(operation:()=>Promise<unknown>){if(busy)return;setBusy(true);setMessage('');try{await operation();await reload();}catch{setMessage('This security action could not finish. Use a new code or sign in again and retry.');}finally{setBusy(false);setPassword('');setCode('');}}
 async function addPasskey() {
  if (busy) return;
  if (!window.isSecureContext || typeof window.PublicKeyCredential !== 'function') {
   setMessage('Open EzBoss in a browser that supports passkeys over a secure connection.');
   return;
  }
  setBusy(true);
  setMessage('');
  try {
   const { error } = await authClient.passkey.addPasskey();
   if (error) {
    const authCode='code' in error ? error.code : undefined;
    if (authCode === 'SESSION_NOT_FRESH' || error.status === 401) {
     setMessage('Sign out, sign back in, then add your passkey within five minutes.');
    } else if (authCode === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED') {
     setMessage('This passkey is already registered. Choose a different passkey to add another.');
    } else if (authCode === 'ERROR_CEREMONY_ABORTED' || authCode === 'ERROR_PASSTHROUGH_SEE_CAUSE_PROPERTY') {
     setMessage('The device did not complete the passkey prompt. Try again and follow the prompt on your device.');
    } else if (authCode === 'ERROR_INVALID_RP_ID' || authCode === 'ERROR_INVALID_DOMAIN' || authCode === 'INVALID_ORIGIN') {
     setMessage('Passkey setup is unavailable at this address. Contact your EzBoss administrator with the site address.');
    } else if (error.status === 429) {
     setMessage('Too many passkey attempts. Wait a moment and try again.');
    } else {
     setMessage('EzBoss could not add the passkey. Try again or contact your EzBoss administrator if it keeps happening.');
    }
    return;
   }
   setMessage('Passkey added. You can now use it to verify administrator access.');
   await reload().catch(() => setMessage('Passkey added. Reload Settings to see it in the list.'));
  } catch {
   setMessage('Could not reach EzBoss to finish adding the passkey. Reload Settings to check whether it was added before trying again.');
  } finally {
   setBusy(false);
  }
 }
 return <section className="card space-y-4 p-6" aria-busy={busy}><h2 className="text-xl font-semibold">Account security</h2><p>Passkeys are required for administrator verification. Authenticator codes protect password sign-in.</p>{message&&<p role="status">{message}</p>}
  {google==='connected'&&<p>Google is connected.</p>}
  {google!=='unavailable'&&authenticatorEnabled===true&&<p>Google sign-in is unavailable while your authenticator is enabled. Use your EzBoss password and authenticator code to sign in.</p>}
  <label className="block">Current password<input className="block w-full border p-3" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
  <button className="btn-primary min-h-11" disabled={busy||!password} onClick={()=>void action(async()=>{const result=await authRequest('/two-factor/enable',{password});setSetup(result);setQr(await QRCode.toDataURL(result.totpURI,{width:256,margin:2}));})}>Set up authenticator</button>
  {setup&&<div className="space-y-3"><p>Add this setup URI to your authenticator, then verify its current code. Keep it private.</p><img src={qr} width={256} height={256} alt="Private authenticator enrollment QR code" /><details><summary>Manual authenticator setup</summary><code className="block break-all select-all">{setup.totpURI}</code></details><label className="block">Authenticator code<input className="block border p-3" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value)} /></label><button className="btn-primary min-h-11" disabled={busy||!code} onClick={()=>void action(async()=>{await authRequest('/two-factor/verify-totp',{code});setMessage('Authenticator verified. Save your recovery codes privately, then dismiss them.');})}>Verify authenticator</button><p>Save these recovery codes once. Each can be used only once.</p><ul>{setup.backupCodes.map(value=><li key={value}><code>{value}</code></li>)}</ul><button className="min-h-11 underline" onClick={()=>{setSetup(null);setQr('');}}>I saved my recovery codes</button></div>}
  <div><button className="btn-primary min-h-11" disabled={busy} onClick={()=>void addPasskey()}>Add a passkey</button><ul>{keys.map(key=><li key={key.id}>{key.name||'Passkey'} — {new Date(key.createdAt).toLocaleDateString()}</li>)}</ul></div>
  <h3 className="font-semibold">Sessions</h3><ul>{sessions.map(session=><li className="py-2" key={session.id}>Signed in {new Date(session.createdAt).toLocaleString()} <button className="min-h-11 underline" disabled={busy} onClick={()=>void action(async()=>{await authRequest('/revoke-session',{token:session.token});if(session.id===currentSessionId){setCookieSignOutBarrier(true);window.location.replace('/landing/login');}})}>Revoke session</button></li>)}</ul>
  <p className="text-sm">Factor removal and administrator recovery require a verified recovery procedure. Contact the account operator for recovery.</p>
 </section>;
}
