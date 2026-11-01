import { useEffect, useState } from 'react';
import { getApiAccessToken } from '../../../services/apiAuth';

type DeletionRequest={id:string;status:string;version:number;createdAt:string;reviewMessage:string};
type Lifecycle={notice:string;requests:DeletionRequest[];document:null|{version:string;url:string;sha256:string;accepted:boolean}};
async function accountRequest(path:string,body?:unknown):Promise<unknown> {
  const token=await getApiAccessToken();
  const response=await fetch(`${import.meta.env.VITE_API_URL}/account/${path}`,{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(!response.ok)throw new Error(response.status===409?'Account information changed. Refresh before retrying.':'The request was not confirmed. Refresh status before retrying.');
  return response.json();
}
export default function AccountLifecycleSection() {
  const [data,setData]=useState<Lifecycle|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [confirmation,setConfirmation]=useState('');
  const [requestId,setRequestId]=useState(()=>crypto.randomUUID());
  const [reload,setReload]=useState(0);
  useEffect(()=>{let active=true;setBusy(true);setError('');setData(null);
    accountRequest('lifecycle').then(result=>{if(active)setData(result as Lifecycle);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});
    return ()=>{active=false;};
  },[reload]);
  async function action(path:string,body:unknown) {
    setBusy(true);setError('');
    try {await accountRequest(path,body);setConfirmation('');setRequestId(crypto.randomUUID());setReload(v=>v+1);}
    catch(e){setError(e instanceof Error?e.message:'Unable to submit request.');}finally{setBusy(false);}
  }
  const button='min-h-11 rounded-lg border px-4 py-2 disabled:opacity-50';
  return <section className="space-y-5 rounded-xl border bg-white p-4 sm:p-6" aria-busy={busy}>
    <h3 className="text-lg font-semibold">Account requests and terms</h3>
    {error&&<p role="alert">{error}</p>}
    <button className={button} disabled={busy} onClick={()=>setReload(v=>v+1)}>Refresh / retry</button>
    {data?.document?<div className="space-y-3">
      <p>Terms version: {data.document.version}</p>
      {data.document.url.startsWith('https://')&&<a className="underline" href={data.document.url} target="_blank" rel="noopener noreferrer">Read terms</a>}
      {data.document.accepted?<p>Accepted</p>:<button className={button} disabled={busy} onClick={()=>void action('terms-acceptance',{version:data.document!.version,sha256:data.document!.sha256,accepted:true})}>I have read and accept these terms</button>}
    </div>:<p>Reviewed terms have not been published yet.</p>}
    <p>{data?.notice}</p>
    {data?.requests.map(request=><article key={request.id} className="space-y-2 rounded-lg border p-3">
      <p>{request.status.replace(/_/g,' ')} · {new Date(request.createdAt).toLocaleString()}</p><p>{request.reviewMessage}</p>
      {['requested','under_review','action_required'].includes(request.status)&&<button className={button} disabled={busy} onClick={()=>void action(`deletion-requests/${request.id}/cancel`,{version:request.version})}>Cancel request</button>}
    </article>)}
    <label className="block">Type REQUEST DELETION to submit for review
      <input className="mt-2 block w-full rounded-lg border p-3" value={confirmation} onChange={e=>setConfirmation(e.target.value)} autoComplete="off" />
    </label>
    <button className={button} disabled={busy||!data||confirmation!=='REQUEST DELETION'} onClick={()=>void action('deletion-requests',{requestId,confirmation})}>Submit for review</button>
  </section>;
}
