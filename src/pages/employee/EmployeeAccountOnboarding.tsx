import { betterAuthEnabled } from '../../services/authMode';
import { authRequest } from '../../services/authClient';
import { useEffect, useRef, useState } from 'react';
import { useIdentityAuth } from '../../contexts/IdentityAuth';
import { useAuthContext } from '../../contexts/AuthContext';
const API=import.meta.env.VITE_API_URL;
const KEY='ezboss.employee.continuation';
const invitationRequests=new Map<string,Promise<any>>();
function loadInvitation(path:string,body:Record<string,string>) {
  const key=JSON.stringify([path,body]);
  let pending=invitationRequests.get(key);
  if(!pending) {
    pending=fetch(`${API}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      .then(async response=>{
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw Object.assign(new Error(data.error||'Request failed'),{status:response.status});
        return data;
      }).finally(()=>invitationRequests.delete(key));
    invitationRequests.set(key,pending);
  }
  return pending;
}
const ACCEPTED_KEY='ezboss.employee.acceptedSubject';
const fields=['name','phoneMobile','phoneOther','address','address2','city','state','zipCode','emergencyContactName','emergencyContactPhone'];
const required=['name','phoneMobile','address','city','state','zipCode','emergencyContactName','emergencyContactPhone'];
const labels=['Full name','Mobile phone','Other phone','Home address','Address line 2','City','State','ZIP code','Emergency contact name','Emergency contact phone'];
const phoneFields=['phoneMobile','phoneOther','emergencyContactPhone'];
function formatPhone(value:string) {
  const digits=value.replace(/\D/g,'');
  if(digits.length!==10)return value;
  return `(${digits.slice(0,3)})-${digits.slice(3,6)}-${digits.slice(6)}`;
}
function displayProfile(profile:Record<string,string|null>) {
  return Object.fromEntries(fields.map(field=>[field,phoneFields.includes(field)?formatPhone(profile[field]||''):profile[field]||'']));
}
export default function EmployeeAccountOnboarding() {
  const {isAuthenticated,user,loginWithRedirect,logout,getAccessTokenSilently}=useIdentityAuth();
  const {accountKind,completeOnboarding}=useAuthContext();
  const accepting=useRef(false);
  const invitationGeneration=useRef(0);
  const [continuation,setContinuation]=useState(()=>sessionStorage.getItem(KEY));
  const [preview,setPreview]=useState<{company:string;position:string}|null>(null);
  const [profile,setProfile]=useState<Record<string,string>>({});
  const [complete,setComplete]=useState(false);
  const [error,setError]=useState('');
  const [fieldErrors,setFieldErrors]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(false);
  const [invitationAttempt,setInvitationAttempt]=useState(0);
  const [acceptedSubject,setAcceptedSubject]=useState(()=>sessionStorage.getItem(ACCEPTED_KEY));
  const hasInvitationToken=new URLSearchParams(window.location.hash.slice(1)).has('token');
  const showAcceptance=window.location.pathname==='/employee-account' && !hasInvitationToken && !continuation &&
    isAuthenticated && (acceptedSubject===user?.sub || accountKind==='employee');
  const [verificationMessage,setVerificationMessage]=useState('');
  const [resendAfter,setResendAfter]=useState(0);
  useEffect(()=> {
    if(!resendAfter)return;
    const timer=window.setTimeout(()=>setResendAfter(0),Math.max(0,resendAfter-Date.now()));
    return ()=>window.clearTimeout(timer);
  },[resendAfter]);
  async function request(path:string,body?:unknown,authenticated=false) {
    if(betterAuthEnabled && path==='/account/email-verification'){await authRequest('/send-verification-email',{email:user?.email,callbackURL:window.location.origin+'/employee-account'});return {message:'If verification is needed, an email will arrive shortly.'};}
    const token=authenticated?await getAccessTokenSilently():null;
    const response=await fetch(`${API}${path}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw Object.assign(new Error(data.error||'Request failed'),{status:response.status});
    return data;
  }
  useEffect(()=> {
    let active=true;
    const generation=invitationGeneration.current;
    void (async()=> {
      try {
        const raw=new URLSearchParams(window.location.hash.slice(1)).get('token');
        if(raw) {
          const captured=await loadInvitation('/employee-account-invitations/continuation',{token:raw});
          // An obsolete effect must not erase the fragment before its replacement captures it.
          if(!active || accepting.current || generation!==invitationGeneration.current)return;
          sessionStorage.removeItem(ACCEPTED_KEY);setAcceptedSubject(null);
          sessionStorage.setItem(KEY,captured.continuation);
          // Only remove the credential after the continuation is durably captured.
          window.history.replaceState(null,'',window.location.pathname);
          if(active){setContinuation(captured.continuation);setPreview(captured);setError('');}
        } else if(continuation && accountKind!=='employee') {
          const data=await loadInvitation('/employee-account-invitations/continuation/preview',{continuation});
          if(active && !accepting.current && generation===invitationGeneration.current){setPreview(data);setError('');}
        }
      } catch(e) {
        if(active && !accepting.current && generation===invitationGeneration.current) {
          setPreview(null);
          const status=(e as {status?:number}).status;
          setError(status===400 || status===404 || status===409
            ? 'Invitation unavailable or expired. Reopen your invitation or ask the owner for a new link. If you already accepted, use normal login.'
            : 'We could not load your invitation right now. Please try again.');
        }
      }
    })();
    return ()=>{active=false;};
  },[accountKind,invitationAttempt]);
  useEffect(()=> {
    if(accountKind!=='employee')return;
    let active=true;
    void request('/account/employee-profile',undefined,true).then(data=>{
      if(active){setProfile(displayProfile(data.profile));setComplete(data.complete);setError('');sessionStorage.removeItem(KEY);setContinuation(null);}
    }).catch(()=>{if(active)setError('Unable to load your employee profile. Try reloading.');});
    return ()=>{active=false;};
  },[accountKind]);
  async function accept() {
    if(accepting.current)return;
    invitationGeneration.current++;
    accepting.current=true;setBusy(true);setError('');
    try {
      const raw=new URLSearchParams(window.location.hash.slice(1)).get('token');
      const result=await request('/employee-account-invitations/accept',raw?{token:raw}:{continuation},true);
      if(result.status==='already_used') {setError('This invitation was already accepted. Use normal login to resume.');return;}
      if(result.status!=='accepted')throw new Error('Unable to confirm invitation acceptance. Please try again.');
      if(user?.sub){sessionStorage.setItem(ACCEPTED_KEY,user.sub);setAcceptedSubject(user.sub);}
      window.history.replaceState(null,'',window.location.pathname);
      sessionStorage.removeItem(KEY);setContinuation(null);setPreview(null);
      await completeOnboarding();
    } catch(e){setError((e as Error).message);}
    finally{accepting.current=false;setBusy(false);}
  }
  async function save(finish:boolean) {
    const errors:Record<string,string>={};
    for(const field of fields) {
      const value=(profile[field]||'').trim();
      if((finish || complete) && required.includes(field) && !value)errors[field]='This field is required.';
      else if(value.length>200)errors[field]='Use 200 characters or fewer.';
      else if(phoneFields.includes(field) && value && value.replace(/\D/g,'').length!==10)errors[field]='Enter a 10-digit phone number.';
    }
    setFieldErrors(errors);setError('');
    if(Object.keys(errors).length){setError('Please correct the highlighted fields.');return;}
    setBusy(true);
    try {
      const token=await getAccessTokenSilently();
      const response=await fetch(`${API}/account/employee-profile`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({...profile,complete:finish})});
      const data=await response.json();if(!response.ok){setFieldErrors(data.fieldErrors||{});throw new Error(data.error);}
      setProfile(displayProfile(data.profile));setComplete(data.complete);setError(finish?'':'Progress saved. You can resume after signing in.');
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function authenticate(signup=false) {
    setBusy(true);setError('');
    try {
      // A switch can happen before the initial invitation capture has finished.
      // Persist it before leaving the page so the next account can resume it.
      const raw=new URLSearchParams(window.location.hash.slice(1)).get('token');
      if(raw) {
        const captured=await loadInvitation('/employee-account-invitations/continuation',{token:raw});
        sessionStorage.setItem(KEY,captured.continuation);
      }
      // Reauthentication allows another account without a logout return URL.
      await loginWithRedirect({appState:{returnTo:'/employee-account'},authorizationParams:{redirect_uri:window.location.origin+'/employee-account',...(signup?{screen_hint:'signup'}:{prompt:'login'})}});
    } catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }
  async function resendVerification() {
    setBusy(true);setError('');setVerificationMessage('');
    setResendAfter(Date.now()+60_000);
    try {
      const data=await request('/account/email-verification',{},true);
      setVerificationMessage(data.message);
    } catch(e) {setError((e as Error).message);}
    finally {setBusy(false);}
  }
  return <main className="employee-entry employee-profile"><div className="employee-entry-content"><div className="employee-brand"><img src="/EzBossLogo2.png" alt="EzBoss" /></div><section className="employee-panel space-y-5"><p className="employee-eyebrow">YOUR TEAM. ALL CONNECTED.</p>
    <h1 className="text-xl font-semibold">{showAcceptance?'Invitation accepted':accountKind==='employee'?'Your employee profile':'Employee invitation'}</h1>
    {error && <p role="status" className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">{error}</p>}
    {showAcceptance?<>
      <p role="status">Thank you for accepting your company invitation! You’re now part of the team.</p>
      <a className="primary inline-block" href="/dashboard">Go to dashboard</a>
    </>:accountKind==='employee'?<>
      {complete && <p>Profile complete. You can update your personal details here.</p>}
      <form noValidate onSubmit={e=>{e.preventDefault();void save(true);}} className="space-y-3">
        {fields.map((field,i)=><label key={field} className="block" htmlFor={`profile-${field}`}>
          {labels[i]}{required.includes(field) && <span className={fieldErrors[field]?'text-red-600':''}> *</span>}
          <input id={`profile-${field}`} className={`block w-full rounded border p-2 ${fieldErrors[field]?'border-red-600':''}`} maxLength={200} type={phoneFields.includes(field)?'tel':'text'} required={required.includes(field)} aria-invalid={!!fieldErrors[field]} aria-describedby={fieldErrors[field]?`profile-${field}-error`:undefined} value={profile[field]||''}
            onBlur={()=>{if(phoneFields.includes(field))setProfile(current=>({...current,[field]:formatPhone(current[field]||'')}));}}
            onChange={e=>{const value=e.target.value;setProfile(current=>({...current,[field]:value}));setFieldErrors(current=>{const next={...current};delete next[field];return next;});}}/>
          {fieldErrors[field] && <span id={`profile-${field}-error`} className="mt-1 block text-xs text-red-600">{fieldErrors[field]}</span>}
        </label>)}
        <p className="text-sm text-slate-600">Save progress stores your details so you can return later. Required fields must be filled in to finish your profile.</p>
        <button className="secondary" type="button" disabled={busy} onClick={()=>void save(false)}>Save progress</button>
        <button className="primary" disabled={busy} type="submit">Finish profile</button>
      </form>
    </>:<>
      {error && <button className="secondary" disabled={busy} onClick={()=>{setError('');setInvitationAttempt(value=>value+1);}}>Try again</button>}
      {preview && <p>Join {preview.company || 'your company'} as {preview.position}.</p>}
      {!isAuthenticated?<><button className="primary" disabled={!preview||busy} onClick={()=>authenticate(true)}>Create account</button><button className="secondary ml-3" disabled={!preview||busy} onClick={()=>authenticate()}>Sign in</button><p>Use email/password or Google when offered by the hosted sign-in page.</p></>:<>
        <p>Signed in as {user?.email}. Acceptance requires the verified email addressed by this invitation.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button className="flex min-h-12 items-center justify-center rounded-lg border border-transparent bg-orange-600 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={(!hasInvitationToken&&!continuation)||busy||user?.email_verified!==true} onClick={()=>void accept()}>Accept invitation and join company</button>
          <button className="flex min-h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={busy} onClick={()=>void authenticate()}>Switch account</button>
        </div>
        {user?.email_verified!==true && <div className="space-y-3 rounded border p-4">
          <p>Check your inbox for a verification email. Open its link, then return here to continue joining the company.</p>
          <button className="rounded border px-3 py-2 disabled:opacity-50" disabled={busy||resendAfter>0} onClick={()=>void resendVerification()}>{resendAfter>0?'Wait a minute to resend':'Resend verification email'}</button>
          {verificationMessage && <p role="status">{verificationMessage}</p>}
          <button className="block rounded border px-3 py-2 disabled:opacity-50" disabled={busy} onClick={()=>authenticate()}>I’ve verified my email — continue</button>
        </div>}
      </>}
    </>}
    {accountKind==='employee' && <button className="employee-signout" onClick={()=>void logout({logoutParams:{returnTo:window.location.origin}})}>Sign out</button>}
  </section><p className="employee-entry-note">Your team. Your work. All connected.</p></div></main>;
}
