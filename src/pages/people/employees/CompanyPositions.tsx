import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Plus, Settings, Users, X } from 'lucide-react';
import { positionRequest, PositionApiError, type Catalog, type Position, type Policy, type Override, type Membership } from '../../../services/companyPositions/companyPositions';

const field = 'w-full border border-gray-300 rounded-lg p-2';
const button = 'px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50';
const message = (e: unknown) => e instanceof Error ? e.message : 'Request failed';

// Uses Access Control's page/action checkbox and save/delete form pattern.
// All requests stay in /account; global roles and users are never used here.
export default function CompanyPositions({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'employees' | 'settings'>('employees');
  const [membership, setMembership] = useState('');
  const [choices, setChoices] = useState<Membership[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [employees, setEmployees] = useState<{ id: number; name: string; positionId: string | null }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState<Position | null | undefined>();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async (selected: string) => {
    setLoading(true); setError(''); setPosition(undefined); setPolicy(null);
    if (selected && selected !== membership) { setCatalog(null); setEmployees([]); setSelectedId(null); }
    try {
      const account = await positionRequest<{ companyContext: { membershipId: string } | null; memberships: Membership[] }>(`/me${selected ? `?membershipId=${encodeURIComponent(selected)}` : ''}`, '');
      setChoices(account.memberships);
      if (!account.companyContext) throw new Error('No active company membership');
      const id = account.companyContext.membershipId;
      setMembership(id);
      const data = await positionRequest<Catalog>('/positions', id);
      setCatalog(data);
      if (data.canManageEmployees) {
        const list = await positionRequest<{ employees: typeof employees }>('/position-employees', id);
        setEmployees(list.employees);
      }
    } catch (e) {
      if (e instanceof PositionApiError && e.memberships) setChoices(e.memberships);
      setError(message(e));
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(''); }, []);
  useEffect(() => {
    if (!open) { setSelectedId(null); setPosition(undefined); setPolicy(null); setTab('employees'); }
  }, [open]);
  const selected = catalog?.positions.find(p => p.id === selectedId);
  if (!open) return null;
  return <Modal title={selected?.name || 'Positions'} busy={busy} onClose={onClose} onBack={selected ? () => setSelectedId(null) : undefined} headerActions={catalog?.canManagePositions ? <button type="button" disabled={busy || loading} onClick={() => setPosition(null)} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-medium text-white hover:from-orange-600 hover:to-orange-700 disabled:opacity-50"><Plus className="h-4 w-4" />New Position</button> : undefined}><section className="space-y-4">
    {choices.length > 1 && <label>Company membership<select className={field} disabled={busy || loading} value={membership} onChange={e => void load(e.target.value)}><option value="" disabled>Select a company explicitly</option>{choices.filter(m => m.isActive).map(m => <option key={m.id} value={m.id}>{m.companyName?.trim() || `Company ${m.ownerId}`} ({m.kind})</option>)}</select></label>}
    {loading && <p>Loading company access…</p>}
    {error && <p role="alert" className="text-red-700">{error} <button className={button} onClick={() => void load(membership)}>Reload</button></p>}
    {catalog && <>
      {!selected && <div className="grid grid-cols-1 gap-3">{catalog.positions.map(p => <button key={p.id} className="rounded-xl border border-gray-200 p-4 text-left hover:border-orange-400 hover:bg-orange-50 transition-colors" onClick={() => { setSelectedId(p.id); setTab('employees'); }}><div className="flex items-center justify-between gap-2"><strong>{p.name}</strong>{p.isDefault && <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">Default</span>}</div><p className="mt-2 text-sm text-gray-500">{p.description}</p><p className="mt-3 text-sm text-gray-600">{p.assignedCount} assigned employees</p></button>)}</div>}
      {selected && <div className="space-y-4"><div role="tablist" aria-label="Position details" className="flex gap-8 border-b border-gray-200">{(['employees', 'settings'] as const).map(value => { const Icon = value === 'employees' ? Users : Settings; return <button key={value} type="button" role="tab" id={`position-tab-${value}`} aria-selected={tab === value} aria-controls={`position-panel-${value}`} className={`flex items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${tab === value ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`} onClick={() => setTab(value)}><Icon className="h-4 w-4" />{value === 'employees' ? 'Assigned Employees' : 'Settings'}</button>; })}</div><div role="tabpanel" id={`position-panel-${tab}`} aria-labelledby={`position-tab-${tab}`}>
        {tab === 'employees' && (catalog.canManageEmployees ? <div className="space-y-2">{employees.filter(e => e.positionId === selected.id).map(e => <button key={e.id} disabled={busy || e.id === catalog.context.employeeId} className="block w-full rounded-lg border p-3 text-left hover:bg-gray-50 disabled:opacity-50" onClick={async () => { setBusy(true); setError(''); try { setPolicy(await positionRequest<Policy>(`/position-employees/${e.id}`, membership)); } catch (e) { setError(message(e)); } finally { setBusy(false); } }}>{e.name}</button>)}{!employees.some(e => e.positionId === selected.id) && <p className="text-sm text-gray-500">No employees assigned to this position.</p>}</div> : <p>Employee management permission is required to view assigned employees.</p>)}
        {tab === 'settings' && (catalog.canManagePositions && catalog.context.positionId !== selected.id ? <PositionEditor key={selected.id + selected.updatedAt} inline catalog={catalog} position={selected} onClose={() => setTab('employees')} onSave={async body => { await positionRequest(`/positions/${selected.id}`, membership, 'PUT', body); await load(membership); }} /> : <p>You do not have permission to edit this position.</p>)}
      </div></div>}
      {position !== undefined && <PositionEditor catalog={catalog} position={position} onClose={() => setPosition(undefined)} onSave={async body => {
        await positionRequest(position ? `/positions/${position.id}` : '/positions', membership, position ? 'PUT' : 'POST', body); await load(membership);
      }} onDelete={position ? async () => { await positionRequest(`/positions/${position.id}`, membership, 'DELETE', { updatedAt: position.updatedAt }); await load(membership); } : undefined} />}
      {policy && catalog.context.kind === 'owner' && <button className={button} disabled={busy} onClick={async () => {
        setBusy(true); setError('');
        try { await positionRequest(`/position-employees/${policy.membership.employeeId}/status`, membership, 'POST', {isActive: !policy.membership.isActive, updatedAt: policy.membership.updatedAt}); await load(membership); }
        catch(e) { setError(message(e)); } finally { setBusy(false); }
      }}>{policy.membership.isActive ? 'Suspend company access' : 'Reactivate company access'}</button>}
      {policy && <EmployeeEditor catalog={catalog} policy={policy} onClose={() => setPolicy(null)} request={async (body, preview) => positionRequest<Policy>(`/position-employees/${policy.membership.employeeId}${preview ? '/preview' : ''}`, membership, preview ? 'POST' : 'PUT', body)} onSaved={() => void load(membership)} />}
    </>}
  </section></Modal>;
}

function Modal({ title, children, onClose, busy, onBack, headerActions }: { title: string; children: React.ReactNode; onClose: () => void; busy: boolean; onBack?: () => void; headerActions?: React.ReactNode }) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.focus();
    return () => { previous?.focus(); };
  }, []);
  return createPortal(<div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4"><div ref={dialog} tabIndex={-1} onKeyDown={e => {
    if (e.key === 'Escape' && !busy) { e.stopPropagation(); onClose(); }
    if (e.key === 'Tab') {
      const controls = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') || []);
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  }} role="dialog" aria-modal="true" aria-label={title} className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2">{onBack && <button type="button" aria-label="Back to all positions" disabled={busy} onClick={onBack} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"><ArrowLeft className="h-5 w-5" /></button>}<h3 className="text-xl font-semibold">{title}</h3></div><div className="flex shrink-0 items-center gap-2">{headerActions}<button type="button" aria-label={`Close ${title}`} disabled={busy} onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"><X className="h-5 w-5" /></button></div></div>{children}</div></div>, document.body);
}
function PositionEditor({ catalog, position, onClose, onSave, onDelete, inline = false }: { inline?: boolean; catalog: Catalog; position: Position | null; onClose: () => void; onSave: (body: unknown) => Promise<void>; onDelete?: () => Promise<void> }) {
  const [isDefault, setIsDefault] = useState(position?.isDefault || false);
  const [name, setName] = useState(position?.name || '');
  const [description, setDescription] = useState(position?.description || '');
  const [pages, setPages] = useState(position?.pageKeys || []);
  const [actions, setActions] = useState(position?.capabilityKeys || []);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const run = async (action: () => Promise<void>) => { setBusy(true); setError(''); try { await action(); onClose(); } catch (e) { setError(message(e)); } finally { setBusy(false); } };
  const content = <>
    <label className="flex items-center gap-2"><input type="checkbox" checked={isDefault} disabled={busy || position?.isDefault} onChange={e => setIsDefault(e.target.checked)} />Make default position for all employees</label>
    <p className="text-sm text-gray-500">The default is used for new employee invitations. Existing assignments stay in place.</p>
    <label className="block">Position name<input className={field} value={name} maxLength={100} disabled={busy} onChange={e => setName(e.target.value)} /></label>
    <label className="block">Description<textarea className={field} value={description} maxLength={2000} disabled={busy} onChange={e => setDescription(e.target.value)} /></label>
    <p className="text-sm">Page grants do not grant actions. Deferred actions below are unavailable; selecting them stores future policy. Grants are limited to your authority and the owner's ceiling.</p>
    {catalog.pages.map(page => <div key={page} className="border rounded-lg p-3 space-y-2"><label><input type="checkbox" disabled={busy || (!catalog.authority.pages[page]?.allowed && !pages.includes(page))} checked={pages.includes(page)} onChange={e => {
      setPages(e.target.checked ? [...pages, page] : pages.filter(p => p !== page)); if (!e.target.checked) setActions(actions.filter(a => catalog.capabilities[a] !== page));
    }} /> {page} — configured page access</label>
      {pages.includes(page) && <div className="pl-5">{Object.entries(catalog.capabilities).filter(([, p]) => p === page).map(([key]) => <label key={key} className="block text-sm"><input type="checkbox" checked={actions.includes(key)} disabled={busy || (!catalog.authority.capabilities[key]?.allowed && !actions.includes(key))} onChange={e => setActions(e.target.checked ? [...actions, key] : actions.filter(a => a !== key))} /> {key} {catalog.availableCapabilities.includes(key) ? '(implemented capability; rollout restrictions apply)' : '(unavailable — deferred)'}</label>)}</div>}
    </div>)}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <button className={button} disabled={busy || !name.trim()} onClick={() => void run(() => onSave({ name, description, isDefault, pageKeys: pages, capabilityKeys: actions, ...(position ? { updatedAt: position.updatedAt } : {}) }))}>Save position</button>
    {onDelete && <div>{position?.assignedCount ? <p>Reassign all employees before deletion.</p> : <button className={button} disabled={busy} onClick={() => setConfirmDelete(true)}>Delete position</button>}{confirmDelete && <button className={button} disabled={busy} onClick={() => void run(onDelete)}>Confirm deletion</button>}</div>}
  </>;
  return inline ? <div className="space-y-4">{content}</div> : <Modal title={position ? 'Edit company position' : 'New Position'} busy={busy} onClose={onClose}>{content}</Modal>;
}
function EmployeeEditor({ catalog, policy, onClose, request, onSaved }: { catalog: Catalog; policy: Policy; onClose: () => void; request: (body: unknown, preview: boolean) => Promise<Policy>; onSaved: () => void }) {
  const [positionId, setPositionId] = useState(policy.membership.positionId);
  const [overrides, setOverrides] = useState<Override[]>(policy.overrides);
  const [result, setResult] = useState(policy.effective);
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const run = async (preview: boolean) => {
    setBusy(true); setError('');
    try { const updated = await request({ positionId, overrides, updatedAt: policy.membership.updatedAt }, preview); setResult(updated.effective); setDirty(false); if (!preview) { onSaved(); onClose(); } }
    catch (e) { setError(message(e)); } finally { setBusy(false); }
  };
  return <Modal title={`Employee access: ${policy.membership.name}`} busy={busy} onClose={onClose}>
    <p>Occupation remains unchanged. {policy.membership.isActive ? '' : 'Membership inactive: company access denied.'}</p>
    <label className="block">Permission position<select className={field} disabled={busy} value={positionId} onChange={e => { setPositionId(e.target.value); setDirty(true); }}>{catalog.positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <p className="text-sm">Inherit follows the position; Deny removes access. A denied page blocks its actions. Deferred controls remain unavailable even when policy allows them.</p>
    {catalog.pages.map(page => <div key={page} className="border rounded-lg p-3">{['', ...Object.entries(catalog.capabilities).filter(([, p]) => p === page).map(([k]) => k)].map(key => {
      const effect = overrides.find(o => o.pageKey === page && o.capabilityKey === key)?.effect || 'inherit';
      const decision = key ? result.capabilities[key] : result.pages[page];
      const authority = key ? catalog.authority.capabilities[key] : catalog.authority.pages[page];
      return <label key={key} className="flex flex-wrap gap-2 items-center py-1 text-sm"><span className="flex-1">{key || page}{key && !catalog.availableCapabilities.includes(key) ? ' (unavailable — deferred)' : ''}</span><select aria-label={`${key || page} override`} className="border rounded p-1" value={effect} disabled={busy} onChange={e => { setOverrides([...overrides.filter(o => !(o.pageKey === page && o.capabilityKey === key)), { pageKey: page, capabilityKey: key, effect: e.target.value as Override['effect'] }]); setDirty(true); }}><option value="inherit">Inherit</option><option value="allow" disabled={!authority?.allowed}>Allow</option><option value="deny">Deny</option></select><span>{dirty ? 'Preview required' : `${decision?.allowed ? 'Allowed policy' : 'Denied'} · ${decision?.source}`}</span></label>;
    })}</div>)}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <button className={button} disabled={busy} onClick={() => void run(true)}>Preview resulting access</button>{' '}<button className={button} disabled={busy || dirty} onClick={() => void run(false)}>Save employee access</button>
  </Modal>;
}
