import React, { useEffect, useId, useRef, useState } from 'react';
import { Bug, X, CheckCircle } from 'lucide-react';
import { Combobox } from '../../mainComponents/forms/Combobox';
import { bugLocations, detectBugLocation } from '../../services/reports/locations';
import { APP_VERSION, recentErrors } from '../../services/reports/diagnostics';
import { notifyReportsChanged, reportsRequest } from '../../services/reports/api';
export function BugReportButton({ floating = false }: {
    floating?: boolean;
}) {
    const formId = useId();
    const titleId = `${formId}-title`;
    const locationId = `${formId}-location`;
    const descriptionId = `${formId}-description`;
    const dialog = useRef<HTMLDialogElement>(null);
    const [context, setContext] = useState<ReturnType<typeof detectBugLocation> | null>(null);
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [id, setId] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);
    const open = () => { const current = detectBugLocation(); setContext(current); setLocation(current.label); setId(crypto.randomUUID()); setSent(false); setError(''); dialog.current?.showModal(); };
    const close = () => { if (!busy)
        dialog.current?.close(); };
    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy || !context)
            return;
        setBusy(true);
        setError('');
        try {
            await reportsRequest('', { method: 'POST', body: JSON.stringify({ id, location, description, context: { ...context, label: undefined, appVersion: APP_VERSION, buildId: import.meta.env.VITE_BUILD_ID || 'development', timestamp: new Date().toISOString(), viewport: { width: innerWidth, height: innerHeight }, recentErrors: recentErrors() } }) });
            setSent(true);
            setDescription('');
            notifyReportsChanged();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to submit report. Your description is still here.');
        }
        finally {
            setBusy(false);
        }
    };
    return <>
  <button type="button" onClick={open} aria-label="Report a bug" title="Report a bug" className={floating ? 'fixed bottom-5 right-5 z-[80] flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white shadow-lg hover:bg-orange-600' : 'absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-md border border-slate-600 bg-slate-700 text-gray-200 hover:bg-slate-600 focus-visible:ring-2 focus-visible:ring-orange-400'}><Bug size={17}/></button>
  <dialog ref={dialog} data-bug-report aria-labelledby={titleId} onCancel={e => { if (busy)
        e.preventDefault(); }} className="w-[calc(100%_-_2rem)] max-w-lg rounded-2xl p-0 shadow-2xl backdrop:bg-slate-950/60">
   <div className="flex items-center justify-between border-b p-5"><h2 id={titleId} className="flex items-center gap-2 text-xl font-semibold"><Bug className="text-orange-600" size={22}/>Bug Report</h2><button type="button" onClick={close} disabled={busy} aria-label="Close bug report" className="rounded p-2 hover:bg-gray-100"><X size={20}/></button></div>
   {sent ? <div className="space-y-4 p-6"><CheckCircle className="text-green-600"/><p role="status">Your bug report has been submitted. Thank you!</p><p className="text-xs text-gray-500">Reference: {id}</p><button type="button" onClick={close} className="rounded-lg bg-orange-600 px-4 py-2 text-sm text-white">Done</button></div> : <form onSubmit={submit} className="space-y-5 p-6">
    <div><label className="mb-2 block text-sm font-medium" htmlFor={locationId}>Bug Location</label><Combobox inputId={locationId} value={location} onChange={setLocation} disabled={busy} options={Array.from(new Set([context?.label || '', ...bugLocations, 'Other'])).filter(Boolean).map(label => ({ value: label, label }))} placeholder="Search pages, modals, and tabs…" appearance="outlined"/></div>
    <div><label htmlFor={descriptionId} className="mb-2 block text-sm font-medium">Describe the bug</label><textarea id={descriptionId} required maxLength={10000} value={description} onChange={e => setDescription(e.target.value)} disabled={busy} rows={5} placeholder="What happened, and what did you expect? Include the steps that led to the problem." className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-orange-500"/></div>
    <p className="text-xs leading-5 text-gray-500">The current screen, app version, timestamp, and recent error references are included automatically.</p>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex justify-end gap-3"><button type="button" onClick={close} disabled={busy} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button type="submit" disabled={busy || !location || !description.trim()} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50">{busy ? 'Submitting…' : 'Submit Report'}</button></div>
   </form>}
  </dialog>
 </>;
}
// Keep reporting available while a portal modal covers the sidebar button.
export function ModalBugReportButton() {
    const [visible, setVisible] = useState(false);
    useEffect(() => { const update = () => setVisible(Array.from(document.querySelectorAll<HTMLElement>('[data-bug-modal]')).some(e => e.getClientRects().length > 0 || Array.from(e.children).some(child => child.getClientRects().length > 0))); const observer = new MutationObserver(update); observer.observe(document.body, { childList: true, subtree: true }); update(); return () => observer.disconnect(); }, []);
    return visible ? <BugReportButton floating/> : null;
}
