import { useEffect, useState } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
export default function PreferencesSection() {
  const {userProfile,updateProfile,accountKind}=useAuthContext();
  const [currency,setCurrency]=useState('USD');
  const [timezone,setTimezone]=useState('America/New_York');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  useEffect(()=>{setCurrency(userProfile?.currency||'USD');setTimezone(userProfile?.timezone||'America/New_York');},[userProfile]);
  async function save() {
    setMessage('');
    try {new Intl.DateTimeFormat('en',{timeZone:timezone});if(!/^[A-Z]{3}$/.test(currency))throw Error('Invalid currency');}
    catch {setMessage('Use a valid IANA timezone and three-letter currency code.');return;}
    setBusy(true);
    try {const result=await updateProfile({currency,timezone});setMessage(result.success?'Saved':result.error?.error||'Save was not confirmed. Retry.');}finally{setBusy(false);}
  }
  return <section className="space-y-5 rounded-xl border bg-white p-4 sm:p-6">
    <h3 className="text-lg font-semibold">Company display preferences</h3>
    <p>These preferences apply to company document and dashboard displays. Online customer payments remain in USD.</p>
    {accountKind==='employee'?<p>Ask your company owner to change company preferences.</p>:<>
      <label className="block">Currency code<input value={currency} onChange={e=>setCurrency(e.target.value.toUpperCase())} maxLength={3} className="block w-full rounded-lg border p-3" disabled={busy}/></label>
      <label className="block">Time zone<input value={timezone} onChange={e=>setTimezone(e.target.value)} placeholder="America/New_York" className="block w-full rounded-lg border p-3" disabled={busy}/></label>
      <button onClick={()=>void save()} disabled={busy} className="min-h-11 rounded-lg bg-orange-600 px-4 py-2 text-white disabled:opacity-50">{busy?'Saving…':'Save preferences'}</button>
    </>}
    <p role="status">{message}</p>
  </section>;
}
