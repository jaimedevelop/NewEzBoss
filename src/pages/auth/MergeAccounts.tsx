import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../../mainComponents/auth/AuthLayout';
import { authClient, authRequest, authReturnTo } from '../../services/authClient';

type Status = {canLinkGoogle:boolean;canAddPassword:boolean;googleConnected:boolean;hasPassword:boolean;email:string};
type Challenge = {id:string;factor:'email'|'totp'};

export default function MergeAccounts() {
 const params=new URLSearchParams(window.location.search);
 const kind=params.get('kind')==='password'?'password':'google';
 const hosted=params.has('hosted');
 const returnTo=authReturnTo();
 const path='/auth/merge?'+new URLSearchParams({kind,...(hosted?{hosted:'1'}:{}),returnTo});
 const login='/login?returnTo='+encodeURIComponent(path);
 const [status,setStatus]=useState<Status|null>(null),[loading,setLoading]=useState(true);
 const [currentPassword,setCurrentPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[code,setCode]=useState('');
 const [challenge,setChallenge]=useState<Challenge|null>(null),[done,setDone]=useState(false),[busy,setBusy]=useState(false);
 const [error,setError]=useState(params.has('linkError')?'Google could not be connected. Choose a verified Google account with the same email and try again.':'');
 const [canGoogle,setCanGoogle]=useState(false);
 useEffect(()=>{
  let active=true;
  void authRequest('/ezboss/config').then(config=>{if(active)setCanGoogle(config.providers.includes('google'));}).catch(()=>{});
  void authRequest('/ezboss/merge/status',{}).then(value=>{if(active)setStatus(value);}).catch(failure=>{
   if(active && failure?.status!==401)setError('Could not check your sign-in methods. Reload and try again.');
  }).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[]);
 async function google() {
  setBusy(true);setError('');
  try {
   const next=encodeURIComponent(path);
   const result=await authClient.signIn.social({provider:'google',
    callbackURL:window.location.origin+'/auth/consent?googleReturn=1&returnTo='+next,
    errorCallbackURL:window.location.origin+'/login?googleError=1&returnTo='+next});
   if(result.error || result.data?.redirect!==true)throw new Error();
  } catch {setError('Could not start Google sign-in. Try again.');setBusy(false);}
 }
 async function submit(event:FormEvent) {
  event.preventDefault();if(busy)return;
  setBusy(true);setError('');
  try {
   if(!challenge) {
    setChallenge(await authRequest('/ezboss/merge/start',{kind,...(kind==='google'?{currentPassword}:{})}));
   } else {
    if(kind==='password' && newPassword!==confirmation)throw new Error('Make both passwords match.');
    const result=await authRequest('/ezboss/merge/confirm',{kind,id:challenge.id,code:code.trim(),hosted,returnTo,
     ...(kind==='password'?{newPassword}:{})});
    if(kind==='google') {window.location.assign(result.url);return;}
    setDone(true);setNewPassword('');setConfirmation('');
   }
  } catch(failure) {
   const reason=(failure as {code?:string}).code;
   setError(reason==='MERGE_CODE_INVALID'?'That code was invalid, expired, or already used. Try a new code or start verification again.'
    :reason==='MERGE_PASSWORD_INVALID'?'Check your current EzBoss password and try again.'
    :reason==='MERGE_UNAVAILABLE'?'This merge is no longer available. Sign in again and retry.'
    :failure instanceof Error?failure.message:'Could not finish the merge.');
  } finally {setBusy(false);setCurrentPassword('');setCode('');}
 }
 const eligible=kind==='google'?status?.canLinkGoogle:status?.canAddPassword;
 const completed=done || (kind==='google' && !!status?.googleConnected);
 const title=kind==='google'?'Merge Accounts':(completed?'Password created successfully':'Create an EzBoss password');
 return <AuthLayout title={title}
  subtitle="Use Google and email sign-in with the same EzBoss account.">
  <div className="ez-identity-form" aria-busy={loading||busy}>
   {error&&<p role="alert">{error}</p>}
   {loading?<p role="status">Checking your sign-in methods…</p>:completed?<>
    <p role="status">{kind==='google'?'Google is connected to your EzBoss account.':'Your password is ready. You can now sign in with your email and password.'}</p>
    {hosted?<p>Return to the EzBoss app to sign in with your email and password.</p>:<Link to={returnTo}>Continue to EzBoss</Link>}
   </>:eligible?<form onSubmit={submit} className="ez-identity-form">
    <p>Account: {status?.email}</p>
    {!challenge?<>{kind==='google'?<><p>Confirm your EzBoss password. After verification, choose the Google account with the same email.</p>
     <label>Current password<input type="password" autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)}/></label></>
     :<p>Verify your account before adding an email password.</p>}</>:<>
     <p>{challenge.factor==='totp'?'Enter a fresh code from your authenticator app.':'Enter the six-digit code just sent to your verified email.'}</p>
     <label>{challenge.factor==='totp'?'Authenticator code':'Email code'}<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" required maxLength={6} value={code} onChange={e=>setCode(e.target.value)}/></label>
     {kind==='password'&&<><label>New password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></label>
      <label>Confirm password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label></>}
     <button type="button" className="ez-identity-link" disabled={busy} onClick={()=>{setChallenge(null);setCode('');setNewPassword('');setConfirmation('');}}>Start verification again</button>
    </>}
    <button className="ez-auth-primary" disabled={busy} type="submit">{busy?'Please wait…':challenge?(kind==='google'?'Merge Accounts':'Create password'):'Start two-step verification'}</button>
   </form>:kind==='google'?<>
    <p>Sign in with your existing EzBoss email and password to connect Google.</p><Link to={login}>Sign in with email</Link>
   </>:<>
    <p>{status?.hasPassword?'This account already has an EzBoss password.':'Sign in with Google first to verify your identity and add a password.'}</p>
    <button type="button" className="ez-social-sign-in" disabled={!canGoogle||busy} onClick={()=>void google()}>
     <img src="/google-g.svg" width="20" height="20" alt="" />Continue with Google
    </button>
    {status?.hasPassword&&<Link to="/forgot-password">Forgot password?</Link>}
   </>}
   {!completed&&(status&&!hosted?<Link to={returnTo}>Skip for now</Link>:<Link to="/login">Back to sign in</Link>)}
  </div>
 </AuthLayout>;
}
