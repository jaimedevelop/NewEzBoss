import { setCookieSignOutBarrier } from '../../services/authMode';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Eye, EyeOff, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { AuthLayout } from '../../mainComponents/auth/AuthLayout';
import { authClient, authRequest, authReturnTo, readCookieSession } from '../../services/authClient';

type Mode='login'|'signup'|'verify-email'|'forgot-password'|'reset-password'|'mfa'|'consent';
const titles:Record<Mode,string>={login:'Welcome back',signup:'Create your account','verify-email':'Check your inbox','forgot-password':'Reset your password','reset-password':'Choose a new password',mfa:'Verify your sign-in',consent:'Review your account terms'};
function googleSignInError(search: string) {
 const params=new URLSearchParams(search);
 if(!params.has('googleError'))return '';
 switch(params.get('error')){
  case 'account_not_linked':
   return 'This Google account isn’t connected to an EzBoss sign-in. If you already use this email with EzBoss, sign in with your password to merge.';
  case 'signup_disabled':
   return 'This Google account can’t sign in to EzBoss. Use an existing EzBoss sign-in or create an account.';
  case 'SOCIAL_MFA_CONTINUATION_REQUIRED':
   return 'This EzBoss account uses an authenticator. Sign in with your EzBoss email and password, then enter your code.';
  default:
   return 'Google sign-in could not finish. Try again or sign in with your password.';
 }
}
export default function IdentityPage({mode}:{mode:Mode}) {
 const location=useLocation();
 const [email,setEmail]=useState(''),[name,setName]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[code,setCode]=useState('');
 const [show,setShow]=useState(false),[accepted,setAccepted]=useState(false),[backup,setBackup]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [signupAttempted,setSignupAttempted]=useState(false);
 const signupRules = [
  { label: 'At least 8 characters', met: password.length >= 8 },
  { label: 'At least one uppercase letter', met: /\p{Lu}/u.test(password) },
  { label: 'At least one symbol', met: /[\p{P}\p{S}]/u.test(password) },
  { label: 'At least one number', met: /\p{Nd}/u.test(password) },
 ];
 useEffect(()=>{setSignupAttempted(false);},[mode]);
 const [error,setError]=useState(()=>mode==='login' ? googleSignInError(location.search) : '');
 const [config,setConfig]=useState<any>(null),[resendAfter,setResendAfter]=useState(0);
 const [retryCount,setRetryCount]=useState(0);
 const [resetToken]=useState(()=>new URLSearchParams(window.location.search).get('token')||'');
 const errorRef=useRef<HTMLParagraphElement>(null),submitting=useRef(false);
 const params=new URLSearchParams(location.search);
 const googleMismatch=params.has('googleError') && params.get('error')==='account_not_linked';
 const destination=authReturnTo();
 const requested=new URL(destination,window.location.origin);
 const fromMerge=requested.pathname==='/auth/merge';
 const mergeDestination='/auth/merge?'+new URLSearchParams({
  kind:'google',
  returnTo:fromMerge ? requested.searchParams.get('returnTo') || '/' : destination,
  ...(fromMerge && requested.searchParams.has('hosted') ? {hosted:'1'} : {}),
 });
 const next=mode==='login' && googleMismatch ? mergeDestination : destination;
 const suffix=`?returnTo=${encodeURIComponent(next)}`;
 useEffect(()=>{let active=true;authRequest('/ezboss/config').then(value=>{if(active)setConfig(value);}).catch(()=>{if(active)setError('Authentication configuration is temporarily unavailable.');});return()=>{active=false;};},[retryCount]);
 useEffect(()=>{if(mode==='reset-password' && resetToken)window.history.replaceState({},'',window.location.pathname+suffix);},[mode,resetToken,suffix]);
 useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
 useEffect(()=>{if(!resendAfter)return;const timer=setTimeout(()=>setResendAfter(0),Math.max(0,resendAfter-Date.now()));return()=>clearTimeout(timer);},[resendAfter]);
 const googleReturn=mode==='consent' && new URLSearchParams(location.search).has('googleReturn');
 const [checkingGoogleReturn,setCheckingGoogleReturn]=useState(true);
 useEffect(()=>{
  if(!googleReturn || !config)return;
  let active=true;
  async function resumeGoogleSignIn(){
   try{
    const current=await readCookieSession();
    if(!current?.session?.id){
     window.location.replace('/login'+suffix+'&googleError=1');
     return;
    }
    const status=config.termsVersion ? await authRequest('/ezboss/status',{}) : {legalAccepted:true};
    if(!active)return;
    setCookieSignOutBarrier(false);
    if(status.legalAccepted)window.location.replace(next);
    else setCheckingGoogleReturn(false);
   }catch(failure){
    if(active)setError(failure instanceof Error ? failure.message : 'Could not finish Google sign-in. Try again.');
   }
  }
  void resumeGoogleSignIn();
  return()=>{active=false;};
 },[googleReturn,config,next,suffix,retryCount]);
 async function finish(){const current=await readCookieSession();if(!current?.session?.id)throw new Error('Sign in again to continue.');setCookieSignOutBarrier(false);if(mode!=='consent' && config?.termsVersion){const status=await authRequest('/ezboss/status',{});if(!status.legalAccepted){window.location.assign('/auth/consent'+suffix);return;}}window.location.replace(next);}
 async function submit(event:FormEvent){
  event.preventDefault();if(submitting.current)return;
  if(mode==='signup'){
   setSignupAttempted(true);
   if(signupRules.some(rule=>!rule.met)){setError('Your password must meet all four requirements.');return;}
   if(password.length>128){setError('Use no more than 128 characters.');return;}
   if(password!==confirmation){setError('Make both passwords match.');return;}
  }
  submitting.current=true;setBusy(true);setError('');setMessage('');
  try{
   if(mode==='reset-password' && (password!==confirmation || password.length<12 || password.length>128))throw new Error('Use 12–128 characters and make both passwords match.');
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
  }catch(failure){setPassword('');setConfirmation('');setCode('');setSignupAttempted(false);
   const invalidPassword=(failure as {code?:string}).code==='INVALID_EMAIL_OR_PASSWORD';
   setError(mode==='login' && invalidPassword
    ? 'Email or password did not match.'
    : failure instanceof Error?failure.message:'Unable to complete authentication.');
  }
  finally{submitting.current=false;setBusy(false);}
 }
 const needsEmail=['login','signup','verify-email','forgot-password'].includes(mode);
 const needsPassword=['login','signup','reset-password'].includes(mode);
 async function signInWithGoogle(){
  if(submitting.current)return;
  submitting.current=true;setBusy(true);setError('');
  const origin=window.location.origin;
  try{
   const result=await authClient.signIn.social({
    provider:'google',
    callbackURL:origin+'/auth/consent'+suffix+'&googleReturn=1',
    errorCallbackURL:origin+'/login'+suffix+'&googleError=1',
   });
   if(result.error || result.data?.redirect!==true)throw new Error();
  }catch{
   setError('Google sign-in could not start. Try again or sign in with your password.');
   submitting.current=false;setBusy(false);
  }
 }
 if(googleReturn && checkingGoogleReturn)return <AuthLayout title="Signing in" subtitle="Use your EzBoss account to continue.">
  {error ? <div className="ez-identity-form">
   <p role="alert">{error}</p>
   <button type="button" className="ez-auth-primary" onClick={()=>{setError('');setRetryCount(count=>count+1);}}>Try again</button>
   <Link to={'/login'+suffix}>Back to sign in</Link>
  </div> : <p role="status">Finishing Google sign-in…</p>}
 </AuthLayout>;
 return <AuthLayout title={titles[mode]} subtitle={mode==='signup'?'Create your identity first. Company setup comes later.':mode==='mfa'?'Enter a current authenticator code or use a recovery code.':'Use your EzBoss account to continue.'}>
  <form onSubmit={submit} onInvalidCapture={mode==='signup' ? ()=>setSignupAttempted(true) : undefined} className="ez-identity-form" aria-busy={busy} key={location.pathname}>
   {error&&<p role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}{message&&<p role="status">{message}</p>}
   {mode==='signup'&&<label>Full name<input name="name" autoComplete="name" required maxLength={160} value={name} onChange={e=>setName(e.target.value)} /></label>}
   {mode==='login'&&<p className="ez-auth-help">If you use Google Authenticator, sign in with your EzBoss email and password first. Enter the code when prompted.</p>}
   {needsEmail&&<label>Email<input type="email" name="email" autoComplete="username" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} /></label>}
   {needsPassword && (
    <div className="ez-identity-password">
     <label htmlFor="identity-password">Password</label>
     <div className="ez-identity-password-input">
      <input id="identity-password" type={show ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'reset-password' ? 12 : undefined} maxLength={mode === 'signup' ? undefined : 128} aria-describedby={mode === 'signup' ? 'signup-password-rules' : undefined} value={password} onChange={e => { setPassword(e.target.value); if (mode==='signup' && signupAttempted) setError(''); }} />
      <button className="ez-identity-password-toggle" type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(visible => !visible)}>
       {show ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
      </button>
     </div>
     {mode === 'signup' && <ul id="signup-password-rules" className="ez-password-rules" role="list" aria-label="Password requirements">
      {signupRules.map(({label,met})=><li key={label} data-state={met ? 'met' : signupAttempted ? 'failed' : 'pending'}>
       <span className="ez-password-rule-mark" aria-hidden="true">{met ? <Check size={16} /> : signupAttempted ? <X size={16} /> : '•'}</span>
       {label}<span className="ez-password-rule-status">: {met ? 'met' : 'not met'}</span>
      </li>)}
     </ul>}
     {mode === 'login' && <Link to={'/forgot-password' + suffix}>Forgot password?</Link>}
    </div>
   )}
   {(mode==='signup'||mode==='reset-password')&&<>{mode==='reset-password'&&<p className="ez-auth-help">Use 12–128 characters. Password managers and paste are supported.</p>}<label>Confirm password<input type={show?'text':'password'} autoComplete="new-password" required value={confirmation} onChange={e=>{setConfirmation(e.target.value);if(mode==='signup' && signupAttempted)setError('');}} /></label></>}
   {mode==='mfa'&&<><label>{backup?'Recovery code':'Authenticator code'}<input autoComplete="one-time-code" inputMode={backup?'text':'numeric'} required maxLength={128} value={code} onChange={e=>setCode(e.target.value)} /></label><button type="button" className="ez-identity-link" onClick={()=>{setBackup(!backup);setCode('');}}>{backup?'Use authenticator code':'Use a recovery code'}</button></>}
   {(mode==='signup'||mode==='consent')&&(config?.termsURL&&config?.privacyURL?<label className="ez-identity-check"><input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)} /><span>I accept the <a href={config.termsURL} target="_blank" rel="noreferrer">terms</a> and <a href={config.privacyURL} target="_blank" rel="noreferrer">privacy policy</a>.</span></label>:<p role="status">Account creation will be available once the legal documents are published.</p>)}
   <button className="ez-auth-primary" type="submit" disabled={busy||!!resendAfter||((mode==='signup'||mode==='consent')&&!config?.termsVersion)}>{busy?'Please wait…':mode==='login'?'Sign in':mode==='signup'?'Create account':mode==='mfa'?'Verify':mode==='consent'?'Accept and continue':mode==='verify-email'?'Resend verification':mode==='forgot-password'?'Send recovery link':'Update password'}</button>
  </form>
  {mode==='login'&&<div className="ez-identity-actions">
   <button type="button" className="ez-social-sign-in" disabled={busy || !config?.providers?.includes('google')} onClick={()=>void signInWithGoogle()}>
    <img src="/google-g.svg" width="20" height="20" alt="" />Sign in with Google
   </button>
   <button type="button" className="ez-social-sign-in" disabled>Sign in with Apple</button>
   {googleMismatch&&config?.providers?.includes('google')&&<Link to={mergeDestination}>Merge Accounts</Link>}
  </div>}
  <div className="ez-auth-alternate">{mode!=='login'&&<Link to={'/landing/login'+suffix}>Sign in</Link>}{mode!=='signup'&&<Link to={'/landing/signup'+suffix}>Create account</Link>}</div>
 </AuthLayout>;
}
