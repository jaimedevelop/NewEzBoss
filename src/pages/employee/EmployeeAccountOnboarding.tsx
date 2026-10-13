import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useAuthContext } from '../../contexts/AuthContext';
const API=import.meta.env.VITE_API_URL;
const KEY='ezboss.employee.continuation';
const ACCEPTED_KEY='ezboss.employee.acceptedSubject';
const fields=['name','phoneMobile','phoneOther','address','address2','city','state','zipCode','emergencyContactName','emergencyContactPhone'];
const required=['name','phoneMobile','address','city','state','zipCode','emergencyContactName','emergencyContactPhone'];
const labels=['Full name','Mobile phone','Other phone','Home address','Address line 2','City','State','ZIP code','Emergency contact name','Emergency contact phone'];
export default function EmployeeAccountOnboarding() {
  const {isAuthenticated,user,loginWithRedirect,logout,getAccessTokenSilently}=useAuth0();
  const {accountKind,completeOnboarding}=useAuthContext();
  const [continuation,setContinuation]=useState(()=>sessionStorage.getItem(KEY));
  const [preview,setPreview]=useState<{company:string;position:string}|null>(null);
  const [profile,setProfile]=useState<Record<string,string>>({});
  const [complete,setComplete]=useState(false);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
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
    const token=authenticated?await getAccessTokenSilently():null;
    const response=await fetch(`${API}${path}`,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const data=await response.json();
    if(!response.ok) throw new Error(data.error||'Request failed');
    return data;
  }
  useEffect(()=> {
    let active=true;
    void (async()=> {
      try {
        const raw=new URLSearchParams(window.location.hash.slice(1)).get('token');
        if(raw) {
          sessionStorage.removeItem(ACCEPTED_KEY);setAcceptedSubject(null);
          const captured=await request('/employee-account-invitations/continuation',{token:raw});
          sessionStorage.setItem(KEY,captured.continuation);
          // Only remove the credential after the continuation is durably captured.
          window.history.replaceState(null,'',window.location.pathname);
          if(active){setContinuation(captured.continuation);setPreview(captured);}
        } else if(continuation && accountKind!=='employee') {
          const data=await request('/employee-account-invitations/continuation/preview',{continuation});
          if(active)setPreview(data);
        }
      } catch {if(active)setError('Invitation unavailable or expired. Reopen your invitation or ask the owner for a new link. If you already accepted, use normal login.');}
    })();
    return ()=>{active=false;};
  },[accountKind]);
  useEffect(()=> {
    if(accountKind!=='employee')return;
    let active=true;
    void request('/account/employee-profile',undefined,true).then(data=>{
      if(active){setProfile(data.profile);setComplete(data.complete);setError('');sessionStorage.removeItem(KEY);setContinuation(null);}
    }).catch(()=>{if(active)setError('Unable to load your employee profile. Try reloading.');});
    return ()=>{active=false;};
  },[accountKind]);
  async function accept() {
    setBusy(true);setError('');
    try {
      const result=await request('/employee-account-invitations/accept',{continuation},true);
      if(result.status==='already_used') {setError('This invitation was already accepted. Use normal login to resume.');return;}
      if(result.status!=='accepted')throw new Error('Unable to confirm invitation acceptance. Please try again.');
      if(user?.sub){sessionStorage.setItem(ACCEPTED_KEY,user.sub);setAcceptedSubject(user.sub);}
      sessionStorage.removeItem(KEY);setContinuation(null);setPreview(null);
      await completeOnboarding();
    } catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }
  async function save(finish:boolean) {
    setBusy(true);setError('');
    try {
      const token=await getAccessTokenSilently();
      const response=await fetch(`${API}/account/employee-profile`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({...profile,complete:finish})});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      setProfile(data.profile);setComplete(data.complete);setError(finish?'':'Progress saved. You can resume after signing in.');
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  function authenticate(signup=false) {
    void loginWithRedirect({appState:{returnTo:'/employee-account'},authorizationParams:{redirect_uri:window.location.origin+'/employee-account',...(signup?{screen_hint:'signup'}:{prompt:'login'})}});
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
  return <main className="employee-entry employee-profile"><div className="employee-entry-content"><div className="employee-brand">EZ<span>BOSS</span></div><section className="employee-panel space-y-5"><p className="employee-eyebrow">YOUR TEAM. ALL CONNECTED.</p>
    <h1 className="text-xl font-semibold">{showAcceptance?'Invitation accepted':accountKind==='employee'?'Your employee profile':'Employee invitation'}</h1>
    {error && <p role="status" className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">{error}</p>}
    {showAcceptance?<>
      <p role="status">Thank you for accepting your company invitation! You’re now part of the team.</p>
      <a className="primary inline-block" href="/dashboard">Go to dashboard</a>
    </>:accountKind==='employee'?<>
      {complete && <p>Profile complete. You can update your personal details here.</p>}
      <form onSubmit={e=>{e.preventDefault();void save(true);}} className="space-y-3">
        {fields.map((field,i)=><label key={field} className="block">{labels[i]}{required.includes(field)?' *':''}<input className="block w-full rounded border p-2" maxLength={200} required={required.includes(field)} value={profile[field]||''} onChange={e=>setProfile({...profile,[field]:e.target.value})}/></label>)}
        <button className="secondary" type="button" disabled={busy} onClick={()=>void save(false)}>Save progress</button>
        <button className="primary" disabled={busy} type="submit">Finish profile</button>
      </form>
    </>:<>
      {preview && <p>Join {preview.company || 'your company'} as {preview.position}.</p>}
      {!isAuthenticated?<><button className="primary" disabled={!preview||busy} onClick={()=>authenticate(true)}>Create account</button><button className="secondary ml-3" disabled={!preview||busy} onClick={()=>authenticate()}>Sign in</button><p>Use email/password or Google when offered by the hosted sign-in page.</p></>:<>
        <p>Signed in as {user?.email}. Acceptance requires the verified email addressed by this invitation.</p>
        <button className="rounded bg-orange-600 px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed" disabled={!preview||busy||user?.email_verified!==true} onClick={()=>void accept()}>Accept invitation and join company</button>
        {user?.email_verified!==true && <div className="space-y-3 rounded border p-4">
          <p>Check your inbox for a verification email. Open its link, then return here to continue joining the company.</p>
          <button className="rounded border px-3 py-2 disabled:opacity-50" disabled={busy||resendAfter>0} onClick={()=>void resendVerification()}>{resendAfter>0?'Wait a minute to resend':'Resend verification email'}</button>
          {verificationMessage && <p role="status">{verificationMessage}</p>}
          <button className="block rounded border px-3 py-2 disabled:opacity-50" disabled={busy} onClick={()=>authenticate()}>I’ve verified my email — continue</button>
        </div>}
        <button className="secondary" disabled={busy} onClick={()=>void logout({logoutParams:{returnTo:window.location.origin+'/employee-account'}})}>Switch account</button>
      </>}
    </>}
    {accountKind==='employee' && <button className="employee-signout" onClick={()=>void logout({logoutParams:{returnTo:window.location.origin}})}>Sign out</button>}
  </section><p className="employee-entry-note">Your team. Your work. All connected.</p></div></main>;
}
