import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import {
  createEstimateRequest, deleteEstimateRequest, deleteRequestPhoto, getEstimateRequest, getMarketplaceCompany,
  MarketplaceApiError, submitEstimateRequest, updateEstimateRequest, uploadRequestPhoto, withdrawEstimateRequest,
  type EstimateRequest, type MarketplaceCompany, type MarketplaceIdentity, type RequestInput,
} from '../../services/marketplace';
import { errorMessage, fieldClass, isConflict, Loading, panelClass, primaryClass, RequestPhotos, RequestSummary, secondaryClass, StateBadge, useUnsavedChanges } from './shared';

function emptyInput(name: string): RequestInput {
  return { title: '', scope: '', contactName: name, contactPhone: '', serviceAddress: { address: '', address2: '', city: '', state: '', zipCode: '' }, selectedServiceNames: [], measurements: [] };
}
function inputFromRequest(value: EstimateRequest): RequestInput {
  return { title: value.title, scope: value.scope, contactName: value.contactName, contactPhone: value.contactPhone, serviceAddress: value.serviceAddress, selectedServiceNames: value.selectedServiceNames, measurements: value.measurements };
}
function submissionError(input: RequestInput) {
  if (!input.title.trim() || !input.scope.trim() || !input.contactName.trim()) return 'Enter a job title, description, and contact name before reviewing.';
  if (!input.serviceAddress.address.trim() || !input.serviceAddress.city.trim() || !input.serviceAddress.state.trim() || !input.serviceAddress.zipCode.trim()) return 'Enter the job address, city, state, and ZIP/postal code.';
  if (input.measurements.some(item => !Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 1000000)) return 'Measurements need a quantity greater than zero, up to 1,000,000.';
  return '';
}
export default function RequestEditor({ identity }: { identity: MarketplaceIdentity }) {
  const { id, slug } = useParams<{ id: string; slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [record, setRecord] = useState<EstimateRequest | null>(null);
  const [company, setCompany] = useState<MarketplaceCompany | null>(null);
  const [input, setInput] = useState<RequestInput>(() => emptyInput(identity.name));
  const [savedInput, setSavedInput] = useState(() => JSON.stringify(emptyInput(identity.name)));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [message, setMessage] = useState('');
  const [reload, setReload] = useState(0);
  const generation = useRef(0);
  const submissionKey = useRef(crypto.randomUUID());
  const dirty = (!record || record.state === 'draft') && JSON.stringify(input) !== savedInput;
  useUnsavedChanges(dirty);

  useEffect(() => {
    const version = ++generation.current;
    const controller = new AbortController();
    setLoading(true); setBusy(false); setError(''); setConflict(false); setRecord(null); setCompany(null); setSharing(false);
    submissionKey.current = crypto.randomUUID();
    const load = async () => {
      if (id) {
        const request = await getEstimateRequest(id, controller.signal);
        if (generation.current !== version) return;
        setRecord(request); setInput(inputFromRequest(request)); setSavedInput(JSON.stringify(inputFromRequest(request)));
        setReview(request.state === 'draft' && location.state?.review === true);
        if (request.state === 'draft') {
          const nextCompany = await getMarketplaceCompany(request.companySlug, controller.signal);
          if (generation.current === version) setCompany(nextCompany);
        }
      } else if (slug) {
        const nextCompany = await getMarketplaceCompany(slug, controller.signal);
        if (generation.current !== version) return;
        setCompany(nextCompany); setInput(emptyInput(identity.name)); setSavedInput(JSON.stringify(emptyInput(identity.name))); setReview(false);
        if (!nextCompany.industries.includes('construction')) setError('Job requests are currently available for Construction companies.');
      }
    };
    void load().catch(reason => { if (generation.current === version) setError(errorMessage(reason)); }).finally(() => { if (generation.current === version) setLoading(false); });
    return () => { generation.current = version + 1; controller.abort(); };
    // location.state only initializes a newly saved draft's review step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, slug, identity.id, identity.name, reload]);

  function update(patch: Partial<RequestInput>) { setInput(value => ({ ...value, ...patch })); setMessage(''); setError(''); }
  function accept(value: EstimateRequest) { setRecord(value); setInput(inputFromRequest(value)); setSavedInput(JSON.stringify(inputFromRequest(value))); }
  async function save(openReview = false) {
    if (busy) return;
    const validation = openReview ? submissionError(input) : '';
    if (validation) { setError(validation); return; }
    if (openReview && input.selectedServiceNames.some(name => !company?.services.some(service => service.name === name))) { setError('A selected service is no longer offered. Remove it or choose another service.'); return; }
    const current = generation.current;
    setBusy(true); setError(''); setConflict(false); setMessage('');
    try {
      const value = record ? await updateEstimateRequest(record.id, record.version, input) : await createEstimateRequest(slug || '', input);
      if (generation.current !== current) return;
      accept(value); setReview(openReview); setSharing(false);
      if (!record) navigate(`/marketplace/requests/${value.id}`, { replace: true, state: { review: openReview } });
      else setMessage(openReview ? '' : 'Draft saved. The company cannot see it until you submit.');
    } catch (reason) { if (generation.current === current) { setError(errorMessage(reason)); setConflict(isConflict(reason)); } }
    finally { if (generation.current === current) setBusy(false); }
  }
  async function submit() {
    if (!record || !company || !sharing || busy) return;
    const current = generation.current;
    setBusy(true); setError(''); setConflict(false);
    try {
      const value = await submitEstimateRequest(record.id, record.version, company.catalogFingerprint, submissionKey.current);
      if (generation.current === current) { accept(value); setReview(false); setMessage('Your request was submitted to the company for review. Contractor pricing is pending.'); }
    } catch (reason) {
      if (generation.current !== current) return;
      setError(errorMessage(reason)); setConflict(isConflict(reason));
      if (reason instanceof MarketplaceApiError && reason.code === 'CATALOG_CHANGED') {
        try {
          const updated = await getMarketplaceCompany(record.companySlug);
          if (generation.current === current) { setCompany(updated); setReview(false); setSharing(false); setConflict(false); setError('This company changed its services. Review the current choices below and review your request again before submitting. Your job details have been kept.'); }
        } catch { /* Preserve the original actionable submit error. */ }
      }
    } finally { if (generation.current === current) setBusy(false); }
  }
  async function mutate(action: 'withdraw' | 'delete') {
    if (!record || busy || !window.confirm(action === 'delete' ? 'Delete this private draft and its photos?' : 'Withdraw this request from company review?')) return;
    const current = generation.current; setBusy(true); setError(''); setConflict(false);
    try {
      if (action === 'delete') { await deleteEstimateRequest(record.id, record.version); if (generation.current === current) navigate('/marketplace/requests', { replace: true }); }
      else { const value = await withdrawEstimateRequest(record.id, record.version); if (generation.current === current) accept(value); }
    } catch (reason) { if (generation.current === current) { setError(errorMessage(reason)); setConflict(isConflict(reason)); } }
    finally { if (generation.current === current) setBusy(false); }
  }
  async function photo(file?: File, attachmentId?: string) {
    if (!record || busy) return;
    if (dirty) { setError('Save your changes before adding or removing photos.'); return; }
    if (file && (file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) { setError('Choose a JPEG, PNG, or WebP photo up to 5 MB.'); return; }
    const current = generation.current; setBusy(true); setError(''); setConflict(false);
    try {
      const value = file ? await uploadRequestPhoto(record.id, record.version, file) : await deleteRequestPhoto(record.id, attachmentId || '', record.version);
      if (generation.current === current) accept(value);
    } catch (reason) { if (generation.current === current) { setError(errorMessage(reason)); setConflict(isConflict(reason)); } }
    finally { if (generation.current === current) setBusy(false); }
  }
  if (loading) return <Loading>Loading your job request…</Loading>;
  const editable = !record || record.state === 'draft';
  const companyName = company?.displayName || record?.companyName || 'Construction company';
  const unavailable = !company || !company.industries.includes('construction');
  return <div className="mx-auto max-w-4xl space-y-6">
    <Link to="/marketplace/requests" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-700"><ArrowLeft size={18} />My job requests</Link>
    <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-orange-700">{companyName}</p><h1 className="mt-1 text-3xl font-bold text-slate-900">{editable ? review ? 'Review your job request' : 'Plan a construction job' : record?.title || 'Job request'}</h1></div>{record && <StateBadge state={record.state} />}</header>
    <div className="rounded-xl border border-orange-100 bg-orange-50 px-5 py-4 text-sm leading-6 text-orange-900"><strong>Contractor pricing pending.</strong> Describe the work and send it for review. This request does not create a quote, signed agreement, or payment obligation.</div>
    {error && <div role="alert" className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{error}</p>{conflict && <><p>Your entered details are still here. Reload only when you are ready to discard unsaved edits and see the latest request.</p><button type="button" className={secondaryClass} onClick={() => { if (!dirty || window.confirm('Discard unsaved edits and load the latest request?')) setReload(value => value + 1); }}>Reload latest request</button></>}</div>}
    {message && <p role="status" className="rounded-xl bg-green-50 p-4 text-sm text-green-800">{message}</p>}
    {editable && !review ? <form className={`${panelClass} space-y-6`} onSubmit={event => { event.preventDefault(); void save(true); }}>
      <fieldset disabled={busy} className="space-y-6 disabled:opacity-70">
        <label className="block text-sm font-semibold text-slate-700">Job title<input className={fieldClass} value={input.title} maxLength={160} onChange={event => update({ title: event.target.value })} placeholder="For example, replace a leaking kitchen sink" /></label>
        <label className="block text-sm font-semibold text-slate-700">Describe the work<textarea className={fieldClass} value={input.scope} maxLength={10000} rows={5} onChange={event => update({ scope: event.target.value })} placeholder="What needs to be done? Include condition, access, timing, and any questions." /></label>
        <fieldset><legend className="text-sm font-semibold text-slate-700">Services</legend><p className="mt-1 text-xs leading-5 text-slate-500">Choose any relevant services, or leave these unchecked for other construction work.</p><div className="mt-3 space-y-2">{company?.services.map((service, index) => <label key={`${service.name}-${index}`} className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={input.selectedServiceNames.includes(service.name)} disabled={!input.selectedServiceNames.includes(service.name) && input.selectedServiceNames.length >= 20} onChange={event => update({ selectedServiceNames: event.target.checked ? [...new Set([...input.selectedServiceNames, service.name])] : input.selectedServiceNames.filter(name => name !== service.name) })} className="mt-1 accent-orange-600" /><span><strong className="block text-slate-800">{service.name}</strong>{service.description && <span className="mt-1 block text-slate-500">{service.description}</span>}</span></label>)}{input.selectedServiceNames.filter(name => !company?.services.some(service => service.name === name)).map(name => <div key={name} className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><span>{name} — no longer available</span><button type="button" onClick={() => update({ selectedServiceNames: input.selectedServiceNames.filter(value => value !== name) })} className="font-semibold underline">Remove</button></div>)}</div></fieldset>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700">Contact name<input className={fieldClass} value={input.contactName} maxLength={160} onChange={event => update({ contactName: event.target.value })} /></label><label className="block text-sm font-semibold text-slate-700">Contact phone (optional)<input className={fieldClass} type="tel" value={input.contactPhone} maxLength={50} onChange={event => update({ contactPhone: event.target.value })} /></label></div>
        <p className="text-sm text-slate-500">Verified contact email: <span className="break-all font-medium text-slate-700">{identity.email}</span></p>
        <fieldset><legend className="text-sm font-semibold text-slate-700">Job location</legend><div className="mt-3 grid gap-4 sm:grid-cols-2">{([{ key: 'address', label: 'Street address' }, { key: 'address2', label: 'Apartment / suite (optional)' }, { key: 'city', label: 'City' }, { key: 'state', label: 'State / region' }, { key: 'zipCode', label: 'ZIP / postal code' }] as const).map(field => <label key={field.key} className="block text-sm font-medium text-slate-700">{field.label}<input className={fieldClass} value={input.serviceAddress[field.key]} maxLength={field.key === 'zipCode' ? 30 : 200} onChange={event => update({ serviceAddress: { ...input.serviceAddress, [field.key]: event.target.value } })} /></label>)}</div></fieldset>
        <fieldset><legend className="text-sm font-semibold text-slate-700">Measurements (optional)</legend><p className="mt-1 text-xs leading-5 text-slate-500">Measurements describe scope only. The contractor will verify them before pricing.</p><div className="mt-3 space-y-3">{input.measurements.map((item, index) => <div key={index} className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_110px_150px_36px]"><label className="col-span-2 text-xs font-medium text-slate-600 sm:col-span-1">Description<input className={fieldClass} value={item.description} maxLength={200} onChange={event => update({ measurements: input.measurements.map((value, position) => position === index ? { ...value, description: event.target.value } : value) })} /></label><label className="text-xs font-medium text-slate-600">Quantity<input className={fieldClass} type="number" min="0.01" max="1000000" step="any" value={item.quantity || ''} onChange={event => update({ measurements: input.measurements.map((value, position) => position === index ? { ...value, quantity: Number(event.target.value) } : value) })} /></label><label className="text-xs font-medium text-slate-600">Unit<select className={fieldClass} value={item.unit} onChange={event => update({ measurements: input.measurements.map((value, position) => position === index ? { ...value, unit: event.target.value as typeof item.unit } : value) })}><option value="sq-ft">Square feet</option><option value="linear-ft">Linear feet</option><option value="each">Each</option><option value="room">Rooms</option></select></label><button type="button" className="self-end rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700" aria-label={`Remove measurement ${index + 1}`} onClick={() => update({ measurements: input.measurements.filter((_, position) => position !== index) })}><Trash2 size={18} /></button></div>)}</div><button type="button" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-orange-700 disabled:opacity-50" disabled={input.measurements.length >= 30} onClick={() => update({ measurements: [...input.measurements, { description: '', quantity: 1, unit: 'each' }] })}><Plus size={16} />Add measurement</button></fieldset>
        <div className="border-t border-slate-100 pt-5">{record ? <><RequestPhotos request={record} disabled={busy} onRemove={attachmentId => void photo(undefined, attachmentId)} /><label className="mt-4 block text-sm font-semibold text-slate-700">Add a private job photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={record.attachments.length >= 6 || busy || dirty} className="mt-2 block w-full text-sm font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-4 file:py-2 file:font-semibold file:text-orange-800" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void photo(file); }} /></label></> : <p className="text-sm text-slate-500">Save a draft to add private photos. Up to six JPEG, PNG, or WebP images, 5 MB each.</p>}</div>
        <div className="flex flex-wrap gap-3"><button type="button" onClick={() => void save()} className={secondaryClass}>{busy ? 'Saving…' : 'Save private draft'}</button><button type="submit" disabled={unavailable} className={primaryClass}>Review request</button>{record && <button type="button" className="px-3 py-2 text-sm font-semibold text-red-700" onClick={() => void mutate('delete')}>Delete draft</button>}</div>
        <p className="text-xs leading-5 text-slate-500">{dirty ? 'You have unsaved changes. ' : ''}Drafts are private and expire after 30 days without changes. The company receives your job details, contact information, and photos only when you submit.</p>
      </fieldset>
    </form> : review && record ? <section className={`${panelClass} space-y-6`}>
      <RequestSummary request={{ ...input, contactEmail: identity.email }} /><RequestPhotos request={record} disabled={busy} />
      <label className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6 text-orange-900"><input type="checkbox" checked={sharing} disabled={busy} onChange={event => setSharing(event.target.checked)} className="mt-1 accent-orange-600" /><span>I want to share these job details, contact information, location, and photos with {companyName} for contractor review. Pricing will be provided by the company.</span></label>
      <div className="flex flex-wrap gap-3"><button type="button" className={secondaryClass} disabled={busy} onClick={() => { setReview(false); setSharing(false); }}>Edit details</button><button type="button" className={primaryClass} disabled={busy || !sharing || unavailable} onClick={() => void submit()}>{busy ? 'Submitting…' : 'Submit job request'}</button></div>
    </section> : record ? <section className={`${panelClass} space-y-6`}><RequestSummary request={record} /><RequestPhotos request={record} />{record.declineReason && <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-900"><strong>Company response</strong><p className="mt-1 whitespace-pre-wrap">{record.declineReason}</p></div>}{record.state === 'converted' && <p className="rounded-xl bg-green-50 p-4 text-sm leading-6 text-green-900">The contractor created an estimate from your request. They will share it through the normal EzBoss estimate delivery process when it is ready.</p>}{['submitted', 'under_review'].includes(record.state) && <button type="button" disabled={busy} onClick={() => void mutate('withdraw')} className={secondaryClass}>Withdraw request</button>}</section> : null}
  </div>;
}
