import { useEffect, useState } from 'react';
import { ArrowLeft, Copy, Mail, MessageSquareText, Send, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { positionRequest, PositionApiError, type Catalog, type Membership } from '../../../services/companyPositions/companyPositions';
import { invitationRequest, deliveryLabel, type AccountInvitation, type InvitationResult, type InvitationAction, invitationTimestamp } from '../../../services/employees/accountInvitations';
import { updateEmployee, type Employee } from '../../../services/employees';
const button = 'border rounded-lg px-3 py-2 disabled:opacity-50';
const field = 'w-full border rounded-lg p-3 mt-2 font-normal';
const message = (e: unknown) => e instanceof Error ? e.message : 'Request failed';
export default function EmployeeInvitations({ inviteRequest, target, onTargetHandled, onChanged, onStatuses, actionTarget, onActionHandled, onBusy }: {
  inviteRequest: number;
  actionTarget: { invitation: AccountInvitation; action: InvitationAction } | null; onActionHandled: () => void; onBusy: (busy: boolean) => void;
  target: Employee | null; onTargetHandled: () => void; onChanged: (employeeId: string) => void; onStatuses: (items: AccountInvitation[], allowed: boolean) => void;
}) {
  const [membership, setMembership] = useState(''), [choices, setChoices] = useState<Membership[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(false), [employee, setEmployee] = useState<Employee | null>(null);
  const [email, setEmail] = useState(''), [positionId, setPositionId] = useState(''), [delivery, setDelivery] = useState<'email' | 'copy'>('email');
  const [mode, setMode] = useState<'choose' | 'email' | 'copy'>('choose');
  const [attempted, setAttempted] = useState(false);
  const [requestId, setRequestId] = useState(''), [result, setResult] = useState<InvitationResult | null>(null), [copyState, setCopyState] = useState('');
  const load = async (selected: string) => {
    setError(''); setCatalog(null);
    try {
      const account = await positionRequest<{ companyContext: { membershipId: string; kind: string } | null; memberships: Membership[] }>(`/me${selected ? `?membershipId=${encodeURIComponent(selected)}` : ''}`, '');
      setChoices(account.memberships);
      const context = account.companyContext;
      if (!context) throw new Error('Select an active company membership.');
      const owner = account.memberships.find(m => m.id === context.membershipId);
      if (owner?.kind !== 'owner') throw new Error('Invitation management requires the company owner.');
      setMembership(context.membershipId);
      const data = await positionRequest<Catalog>('/positions', context.membershipId);
      if (!data.authority.capabilities['manage:invitations']?.allowed) throw new Error('Invitation management permission required.');
      setCatalog(data);
      const items = (await invitationRequest<{ invitations: AccountInvitation[] }>(context.membershipId)).invitations;
      onStatuses(items, true);
    } catch (e) { onStatuses([], false); if (e instanceof PositionApiError && e.memberships) setChoices(e.memberships); setError(message(e)); }
  };
  useEffect(() => { void load(''); }, []);
  const open = (existing: Employee | null) => {
    setMode('choose'); setEmployee(existing); setEmail(existing?.email || ''); setPositionId(catalog?.positions.find(p => p.isDefault)?.id || ''); setDelivery('email');
    setAttempted(false); setRequestId(crypto.randomUUID()); setResult(null); setCopyState(''); setError(''); setModal(true);
  };
  useEffect(() => { if (inviteRequest) open(null); }, [inviteRequest]);
  useEffect(() => { if (target) { open(target); onTargetHandled(); } }, [target]);
  useEffect(() => {
    if (modal && catalog && !positionId) setPositionId(catalog.positions.find(p => p.isDefault)?.id || '');
  }, [modal, catalog, positionId]);
  const refresh = async () => {
    const items = (await invitationRequest<{ invitations: AccountInvitation[] }>(membership)).invitations;
    onStatuses(items, true);
  };
  useEffect(() => {
    if (!membership || !catalog) return;
    const check = () => {
      if (document.visibilityState === 'visible' && !busy) void refresh().catch(() => {});
    };
    const timer = window.setInterval(check, 30000);
    window.addEventListener('focus', check);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', check); };
  }, [membership, catalog, busy]);
  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); setCopyState('Link copied. Share only with the intended employee.'); }
    catch { setCopyState('Clipboard unavailable. Select and copy the link below manually.'); }
  };
  const run = async (action: () => Promise<InvitationResult>, copyLink = delivery === 'copy') => {
    setBusy(true); setError(''); setResult(null); setCopyState('');
    try {
      const response = await action();
      if (response.deliveryStatus) response.invitation.deliveryStatus = response.deliveryStatus;
      setMode(copyLink ? 'copy' : 'email'); setResult(response); setModal(true);
      if (response.url && copyLink) await copy(response.url);
      await refresh();
    } catch (e) { setError(`${message(e)} Check or reload status before retrying.`); }
    finally { setBusy(false); }
  };
  useEffect(() => { onBusy(busy); }, [busy]);
  useEffect(() => {
    if (!actionTarget) return;
    const { invitation, action } = actionTarget;
    onActionHandled();
    setEmployee(null); setMode(action === 'resend' ? 'email' : 'copy');
    setDelivery(action === 'resend' ? 'email' : 'copy');
    void run(() => invitationRequest<InvitationResult>(membership, `/${invitation.id}/${action}`, action === 'regenerate' ? { delivery: 'copy' } : {}), action === 'regenerate');
  }, [actionTarget]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    await run(async () => {
      if (employee?.id && email.trim() !== (employee.email || '')) {
        const saved = await updateEmployee(employee.id, { email: email.trim() });
        if (!saved.success) throw new Error(saved.error || 'Could not save employee email');
        onChanged(employee.id);
      }
      return invitationRequest<InvitationResult>(membership, '', { requestId, email: email.trim(), positionId, delivery, ...(employee?.id ? { employeeId: Number(employee.id) } : {}) });
    });
  };
  const close = () => { if (busy) return; setModal(false); setResult(null); setCopyState(''); setError(''); };
  return <section className={choices.length > 1 || (error && !modal) ? "bg-white border rounded-xl p-4 space-y-3" : ""}>
    {choices.length > 1 && <label>Company<select className={field} disabled={busy} value={membership} onChange={e => void load(e.target.value)}><option value="">Select explicitly</option>{choices.filter(m => m.isActive).map(m => <option key={m.id} value={m.id}>{m.companyName?.trim() || `Company ${m.ownerId}`} ({m.kind})</option>)}</select></label>}
    {error && !modal && <p role="alert" className="text-red-700">{error}</p>}
    {modal && createPortal(<div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4"><div role="dialog" aria-modal="true" aria-label="Invite Employee" className={`bg-white rounded-xl w-full ${mode === 'choose' ? 'max-w-md' : 'max-w-2xl'} max-h-[90dvh] overflow-y-auto p-6 space-y-5 shadow-xl`}>
      <div className="flex items-center gap-3">
        {mode !== 'choose' && !result && <button disabled={busy || attempted} onClick={() => setMode('choose')} aria-label="Back to invitation options" className="p-1 text-gray-500 disabled:opacity-50"><ArrowLeft size={20}/></button>}
        {mode !== 'choose' && <div className="rounded-lg bg-orange-100 p-3 text-orange-600">{mode === 'email' ? <Mail/> : <Copy/>}</div>}
        <div className="flex-1"><h3 className="text-xl font-semibold">{mode === 'choose' ? 'Invite Employee' : mode === 'email' ? 'Send Employee Invitation' : 'Copy Employee Invitation Link'}</h3><p className="mt-1 text-sm text-gray-500">{mode === 'choose' ? 'Choose how to invite your employee.' : employee?.name || 'Invite an employee to your company.'}</p></div>
        <button disabled={busy} onClick={close} aria-label="Close" className="p-1 text-gray-500 disabled:opacity-50"><X size={20}/></button>
      </div>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {mode === 'choose' ? <div className="space-y-3">
        <button onClick={() => { setMode('email'); setDelivery('email'); }} className="flex w-full items-center gap-3 rounded-lg border p-4 text-left hover:bg-orange-50"><Mail className="text-orange-600"/><span><strong className="block">Send via email</strong><span className="text-sm text-gray-600">Send an invitation to your employee.</span></span></button>
        <button disabled className="flex w-full items-center gap-3 rounded-lg border p-4 text-left opacity-60 cursor-not-allowed"><MessageSquareText className="text-gray-500"/><span><strong className="block">Send via text</strong><span className="text-sm text-gray-600">Coming soon</span></span></button>
        <button onClick={() => { setMode('copy'); setDelivery('copy'); }} className="flex w-full items-center gap-3 rounded-lg border p-4 text-left hover:bg-orange-50"><Copy className="text-orange-600"/><span><strong className="block">Copy link</strong><span className="text-sm text-gray-600">Create an invitation link you can share.</span></span></button>
      </div> : result ? <div className="space-y-3"><p>Invitation: {result.invitation.status}</p><p role="status" className="text-gray-700">{deliveryLabel[result.invitation.deliveryStatus]}</p><p>Expires {invitationTimestamp(result.invitation.expiresAt)}</p>{mode === 'copy' && (result.url ? <><button className={button} onClick={() => void copy(result.url!)}>Copy Link Again</button><input aria-label="Invitation link — keep private" className={field} readOnly value={result.url} onFocus={e => e.target.select()} /></> : <p>No link returned. Refresh status and regenerate if a new copy is needed.</p>)}{mode === 'copy' && <p role="status" className="text-green-700">{copyState}</p>}</div> : <form onSubmit={submit} className="space-y-4">
        {employee && !employee.email && <p className="text-sm">Add the missing legacy email here. It will be saved before inviting; employee ID and assignments are retained.</p>}
        <label className="block text-sm font-medium text-gray-700">To<input className={field} type="email" required maxLength={254} value={email} disabled={busy || attempted} onChange={e => setEmail(e.target.value)} /></label>
        <label className="block text-sm font-medium text-gray-700">Position<select className={field} required value={positionId} disabled={busy || attempted} onChange={e => setPositionId(e.target.value)}><option value="">Select position</option>{catalog?.positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>

        {attempted && <p className="text-sm">Retry preserves this request and its details to avoid duplicate invitations. Check status before starting another invitation.</p>}
        <p className="text-sm">Links expire in 72 hours and require the intended verified email. No profile form is required upfront.</p>
        <div className="flex flex-wrap justify-end gap-3 border-t pt-5"><button type="button" className="px-4 py-2 text-gray-700 disabled:opacity-50" disabled={busy || attempted} onClick={() => setMode('choose')}>Back</button><button type="button" className="px-4 py-2 text-gray-700" disabled={busy} onClick={close}>Cancel</button><button className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-50" disabled={busy || !catalog || !positionId || !email.trim() || employee?.isActive === false}>{mode === 'email' ? <Send size={18}/> : <Copy size={18}/>} {busy ? 'Working…' : mode === 'email' ? 'Send Invitation' : 'Create and Copy Link'}</button></div>
        {employee?.isActive === false && <p>Activate employment through Edit before inviting.</p>}
      </form>}
      {result && <div className="flex justify-end border-t pt-4"><button className={button} disabled={busy} onClick={close}>Done</button></div>}
    </div></div>, document.body)}
  </section>;
}
