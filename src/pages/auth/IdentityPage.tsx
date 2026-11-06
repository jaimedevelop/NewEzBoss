import { setCookieSignOutBarrier } from '../../services/authMode';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthLayout } from '../../mainComponents/auth/AuthLayout';
import { authClient, authRequest, authReturnTo } from '../../services/authClient';

type Mode='login'|'signup'|'verify-email'|'forgot-password'|'reset-password'|'mfa'|'consent';
const titles:Record<Mode,string>={login:'Welcome back',signup:'Create your account','verify-email':'Check your inbox','forgot-password':'Reset your password','reset-password':'Choose a new password',mfa:'Verify your sign-in',consent:'Review your account terms'};
export default function IdentityPage({mode}:{mode:Mode}) {
 const location=useLocation();
 const [email,setEmail]=useState(''),[name,setName]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[code,setCode]=useState('');
 const [show,setShow]=useState(false),[accepted,setAccepted]=useState(false),[backup,setBackup]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [config,setConfig]=useState<any>(null),[resendAfter,setResendAfter]=useState(0);
 const [resetToken]=useState(()=>new URLSearchParams(window.location.search).get('token')||'');
 const errorRef=useRef<HTMLParagraphElement>(null),submitting=useRef(false);
 const next=authReturnTo();const suffix=`?returnTo=${encodeURIComponent(next)}`;
 useEffect(()=>{let active=true;authRequest('/ezboss/config').then(value=>{if(active)setConfig(value);}).catch(()=>{if(active)setError('Authentication configuration is temporarily unavailable.');});return()=>{active=false;};},[]);
 useEffect(()=>{if(mode==='reset-password' && resetToken)window.history.replaceState({},'',window.location.pathname+suffix);},[mode,resetToken,suffix]);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 useEffect(()=>{if(!resendAfter)return;const timer=setTimeout(()=>setResendAfter(0),Math.max(0,resendAfter-Date.now()));return()=>clearTimeout(timer);},[resendAfter]);
 async function finish(){const current=await authRequest('/get-session');if(!current?.session?.id)throw new Error('Sign in again to continue.');setCookieSignOutBarrier(false);await authClient.getSession();if(mode!=='consent' && config?.termsVersion){const status=await authRequest('/ezboss/status',{});if(!status.legalAccepted){window.location.assign('/auth/consent'+suffix);return;}}window.location.replace(next);}
 async function submit(event:FormEvent){
  event.preventDefault();if(submitting.current)return;submitting.current=true;setBusy(true);setError('');setMessage('');
  try{
   if((mode==='signup'||mode==='reset-password') && (password!==confirmation || password.length<12 || password.length>128))throw new Error('Use 12–128 characters and make both passwords match.');
   if(mode==='login'){
    const result=await authRequest('/sign-in/email',{email,password});setPassword('');
    if(result.twoFactorRedirect)window.location.assign('/mfa'+suffix);else await finish();
   }else if(mode==='signup'){
    if(!accepted || !config?.termsVersion || !config?.privacyVersion)throw new Error('Review and accept the published terms and privacy policy.');
    await authRequest('/sign-up/email',{name,email,password,acceptedTermsVersion:config.termsVersion,acceptedPrivacyVersion:config.privacyVersion,callbackURL:window.location.origin+'/verify-email'+suffix});
    setPassword('');setConfirmation('');window.location.assign('/verify-email'+suffix);
   }else if(mode==='verify-email'){
    await authRequest('/send-verification-email',{email,callbackURL:window.location.origin+'/verify-email'+suffix});setResendAfter(Date.now()+60000);setMessage('If verification is needed, an email will arrive shortly. Check your inbox and spam folder.');
   }else if(mode==='forgot-password'){
    await authRequest('/request-password-reset',{email,redirectTo:window.location.origin+'/reset-password'+suffix});setMessage('If this address can be used for recovery, an email will arrive shortly.');
   }else if(mode==='reset-password'){
    if(!resetToken)throw new Error('This recovery link is missing or expired. Request a new link.');
    await authRequest('/reset-password',{token:resetToken,newPassword:password});setPassword('');setConfirmation('');setMessage('Password updated. You can now sign in.');
   }else if(mode==='consent'){
    if(!accepted)throw new Error('Review and accept the current documents.');
    await authRequest('/ezboss/consent',{termsVersion:config.termsVersion,privacyVersion:config.privacyVersion});await finish();
   }else{
    await authRequest(backup?'/two-factor/verify-backup-code':'/two-factor/verify-totp',{code,trustDevice:false});setCode('');await finish();
   }
  }catch(failure){setPassword('');setConfirmation('');setCode('');setError(failure instanceof Error?failure.message:'Unable to complete authentication.');}
  finally{submitting.current=false;setBusy(false);}
 }
 const needsEmail=['login','signup','verify-email','forgot-password'].includes(mode);
 const needsPassword=['login','signup','reset-password'].includes(mode);
 async function alternative(action:()=>Promise<unknown>){if(submitting.current)return;submitting.current=true;setBusy(true);setError('');try{const result:any=await action();if(result?.error)throw new Error('Sign-in could not finish. Please try again.');if(result?.data?.redirect!==true)await finish();}catch{setError('Sign-in was cancelled or could not finish. Please try again.');}finally{submitting.current=false;setBusy(false);}}
 return <AuthLayout title={titles[mode]} subtitle={mode==='signup'?'Create your identity first. Company setup comes later.':mode==='mfa'?'Enter a current authenticator code or use a recovery code.':'Use your EzBoss account to continue.'}>
  <form onSubmit={submit} className="ez-identity-form" aria-busy={busy} key={location.pathname}>
   {error&&<p role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}{message&&<p role="status">{message}</p>}
   {mode==='signup'&&<label>Full name<input name="name" autoComplete="name" required maxLength={160} value={name} onChange={e=>setName(e.target.value)} /></label>}
   {needsEmail&&<label>Email<input type="email" name="email" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} /></label>}
   {needsPassword&&<><label>Password<input type={show?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'} required minLength={mode==='login'?1:12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} /></label><button className="ez-identity-link" type="button" aria-pressed={show} onClick={()=>setShow(!show)}>{show?'Hide':'Show'} password</button></>}
   {(mode==='signup'||mode==='reset-password')&&<><p className="ez-auth-help">Use 12–128 characters. Password managers and paste are supported.</p><label>Confirm password<input type={show?'text':'password'} autoComplete="new-password" required value={confirmation} onChange={e=>setConfirmation(e.target.value)} /></label></>}
   {mode==='mfa'&&<><label>{backup?'Recovery code':'Authenticator code'}<input autoComplete="one-time-code" inputMode={backup?'text':'numeric'} required maxLength={128} value={code} onChange={e=>setCode(e.target.value)} /></label><button type="button" className="ez-identity-link" onClick={()=>{setBackup(!backup);setCode('');}}>{backup?'Use authenticator code':'Use a recovery code'}</button></>}
   {(mode==='signup'||mode==='consent')&&(config?.termsURL&&config?.privacyURL?<label className="ez-identity-check"><input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)} /><span>I accept the <a href={config.termsURL} target="_blank" rel="noreferrer">terms</a> and <a href={config.privacyURL} target="_blank" rel="noreferrer">privacy policy</a>.</span></label>:<p role="status">Account creation will be available once the legal documents are published.</p>)}
   <button className="ez-auth-primary" type="submit" disabled={busy||!!resendAfter||((mode==='signup'||mode==='consent')&&!config?.termsVersion)}>{busy?'Please wait…':mode==='login'?'Sign in':mode==='signup'?'Create account':mode==='mfa'?'Verify':mode==='consent'?'Accept and continue':mode==='verify-email'?'Resend verification':mode==='forgot-password'?'Send recovery link':'Update password'}</button>
  </form>
  {mode==='login'&&<div className="ez-identity-actions"><button className="ez-auth-primary" type="button" disabled={busy} onClick={()=>void alternative(()=>authClient.signIn.passkey())}>Sign in with a passkey</button>{config?.providers?.includes('google')&&<button type="button" className="ez-auth-primary" disabled={busy} onClick={()=>void alternative(()=>authClient.signIn.social({provider:'google',callbackURL:window.location.origin+'/auth/consent'+suffix}))}>Continue with Google</button>}<Link to={'/forgot-password'+suffix}>Forgot password?</Link></div>}
  <div className="ez-auth-alternate">{mode!=='login'&&<Link to={'/landing/login'+suffix}>Sign in</Link>}{mode!=='signup'&&<Link to={'/landing/signup'+suffix}>Create account</Link>}</div>
 </AuthLayout>;
}
