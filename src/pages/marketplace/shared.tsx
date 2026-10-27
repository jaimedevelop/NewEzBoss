import { useEffect, useState } from 'react';
import { Download, Loader2, Trash2 } from 'lucide-react';
import { downloadRequestPhoto, MarketplaceApiError, type EstimateRequest, type RequestInput, type RequestState } from '../../services/marketplace';

export const fieldClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500';
export const primaryClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 px-5 py-2.5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-50';
export const secondaryClass = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600 disabled:opacity-50';
export const panelClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7';
export const stateLabels: Record<RequestState, string> = { draft: 'Draft', submitted: 'Submitted', under_review: 'Under review', withdrawn: 'Withdrawn', declined: 'Declined', converted: 'Contractor estimate created' };
export function StateBadge({ state }: { state: RequestState }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${state === 'draft' ? 'bg-slate-100 text-slate-700' : state === 'declined' || state === 'withdrawn' ? 'bg-rose-50 text-rose-800' : 'bg-orange-50 text-orange-800'}`}>{stateLabels[state]}</span>;
}
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
export function isConflict(error: unknown) { return error instanceof MarketplaceApiError && error.status === 409; }
export function Loading({ children = 'Loading…' }: { children?: string }) { return <div className={`${panelClass} flex items-center gap-2 text-sm text-slate-600`} role="status"><Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />{children}</div>; }
export function RequestSummary({ request }: { request: EstimateRequest | (RequestInput & { contactEmail: string }) }) {
  return <div className="space-y-5">
    <div><h2 className="text-xl font-bold text-slate-900">{request.title || 'Untitled job'}</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{request.scope || 'No description added.'}</p></div>
    <div className="grid gap-5 sm:grid-cols-2">
      <div><h3 className="text-sm font-semibold text-slate-900">Contact details shared with the company</h3><p className="mt-2 break-words text-sm leading-6 text-slate-600">{request.contactName}<br />{request.contactEmail}{request.contactPhone && <><br />{request.contactPhone}</>}</p></div>
      <div><h3 className="text-sm font-semibold text-slate-900">Job location</h3><p className="mt-2 break-words text-sm leading-6 text-slate-600">{[request.serviceAddress.address, request.serviceAddress.address2, request.serviceAddress.city, request.serviceAddress.state, request.serviceAddress.zipCode].filter(Boolean).join(', ') || 'No location added.'}</p></div>
    </div>
    <div><h3 className="text-sm font-semibold text-slate-900">Requested services</h3><p className="mt-2 break-words text-sm text-slate-600">{request.selectedServiceNames.join(' · ') || 'Other construction work'}</p></div>
    {request.measurements.length > 0 && <div><h3 className="text-sm font-semibold text-slate-900">Measurements</h3><ul className="mt-2 space-y-2 text-sm text-slate-600">{request.measurements.map((measurement, index) => <li key={index} className="break-words">{measurement.description || 'Measurement'}: {measurement.quantity} {measurement.unit}</li>)}</ul></div>}
  </div>;
}
export function RequestPhotos({ request, company = false, onRemove, disabled = false }: { request: EstimateRequest; company?: boolean; onRemove?: (attachmentId: string) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const download = async (id: string, fileName: string) => {
    setBusy(id); setError('');
    try {
      const blob = await downloadRequestPhoto(request.id, id, company);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = fileName; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { setError(errorMessage(reason)); } finally { setBusy(''); }
  };
  return <section className="space-y-3" aria-label="Private job photos">
    <h3 className="text-sm font-semibold text-slate-900">Job photos <span className="font-normal text-slate-500">({request.attachments.length}/6)</span></h3>
    {request.attachments.length === 0 ? <p className="text-sm text-slate-500">No photos attached.</p> : <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">{request.attachments.map(photo => <li key={photo.id} className="flex flex-wrap items-center justify-between gap-3 p-3"><span className="min-w-0 break-all text-sm text-slate-700">{photo.fileName} <span className="text-xs text-slate-500">({(photo.size / 1024).toFixed(0)} KB)</span></span><div className="flex gap-2"><button type="button" disabled={disabled || !!busy} onClick={() => void download(photo.id, photo.fileName)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-orange-700 disabled:opacity-50"><Download size={16} aria-hidden="true" />{busy === photo.id ? 'Downloading…' : 'Download'}</button>{onRemove && <button type="button" disabled={disabled || !!busy} onClick={() => onRemove(photo.id)} className="rounded-lg p-1 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50" aria-label={`Remove ${photo.fileName}`}><Trash2 size={17} /></button>}</div></li>)}</ul>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const link = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (element && !window.confirm('You have unsaved changes. Leave this page?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', unload); document.addEventListener('click', link, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', link, true); };
  }, [dirty]);
}
