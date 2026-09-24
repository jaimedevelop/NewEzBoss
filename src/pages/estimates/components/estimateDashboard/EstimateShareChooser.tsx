import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Copy, Mail, MessageSquareText, X } from 'lucide-react';
import type { Estimate } from '../../../../services/estimates/estimates.types';
import { issueEstimateShareLink, updateEstimate } from '../../../../services/estimates';
import SendEstimateModal from './estimateTab/SendEstimateModal';

interface Props { estimate: Estimate; onSend: (data: { emailTitle: string; ccEmails: string; message: string }) => Promise<void>; onUpdate?: () => void; className?: string; }

export default function EstimateShareChooser({ estimate, onSend, onUpdate, className = '' }: Props) {
  const [mode, setMode] = useState<'closed' | 'choose' | 'email' | 'link'>('closed');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [url, setUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const opener = useRef<HTMLButtonElement | null>(null);
  const dialog = useRef<HTMLDivElement | null>(null);
  const linkField = useRef<HTMLInputElement | null>(null);
  const title = estimate.estimateState === 'change-order' ? 'Change Order' : 'Estimate';

  const close = () => { if (busy) return; setMode('closed'); setError(''); setNotice(''); requestAnimationFrame(() => opener.current?.focus()); };
  useEffect(() => {
    if (mode === 'closed' || mode === 'email') return;
    const timer = window.setTimeout(() => dialog.current?.focus(), 0);
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab' || !dialog.current) return;
      const items = Array.from(dialog.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]'));
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { window.clearTimeout(timer); document.removeEventListener('keydown', key); };
  }, [mode, busy]);

  const copy = async (value: string) => {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable. Select the link below and copy it manually.');
    await navigator.clipboard.writeText(value);
  };
  const makeLink = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const issued = await issueEstimateShareLink(estimate.id);
      setUrl(issued.url); setExpiresAt(issued.expiresAt);
      try { await copy(issued.url); setNotice('Link created and copied.'); }
      catch { setNotice('Link created, but it could not be copied. Select the URL below to copy it manually.'); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create the link. Please retry.'); }
    finally { setBusy(false); }
  };
  const retryCopy = async () => {
    if (!url) return;
    setBusy(true); setError('');
    try { await copy(url); setNotice('Link copied.'); }
    catch { setError('Clipboard access failed. Select the URL below and copy it manually.'); linkField.current?.focus(); linkField.current?.select(); }
    finally { setBusy(false); }
  };

  const markAsSent = async () => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await updateEstimate(estimate.id, { clientState: 'sent', sentDate: new Date().toISOString() });
      if (!result.success) throw new Error(result.error?.message || 'Could not mark this estimate as sent.');
      setNotice('Marked as sent.');
      try { onUpdate?.(); } catch (refreshError) { console.error('Could not refresh estimate after marking it sent:', refreshError); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark this estimate as sent.');
    } finally { setBusy(false); }
  };

  const backToChooser = () => { if (busy) return; setMode('choose'); setError(''); setNotice(''); };
  return <>
    <button ref={opener} onClick={() => { setMode('choose'); setError(''); setNotice(''); }} className={`inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors ${className}`}>
      <span className="inline-flex items-center gap-1.5" aria-hidden="true"><Mail className="w-4 h-4 text-orange-200"/><MessageSquareText className="w-4 h-4 text-gray-300"/><Copy className="w-4 h-4 text-orange-200"/></span> Send {title}
    </button>
    {mode === 'choose' && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget) close(); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="share-title" tabIndex={-1} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl outline-none">
        <div className="mb-5 flex items-start justify-between"><div><h2 id="share-title" className="text-lg font-semibold">Share {title}</h2><p className="mt-1 text-sm text-gray-600">Choose how to share {estimate.estimateNumber}.</p></div><button onClick={close} aria-label="Close" className="rounded p-1 text-gray-500 hover:bg-gray-100"><X size={20}/></button></div>
        <div className="space-y-3">
          <button onClick={() => setMode('email')} className="flex w-full items-center gap-3 rounded-lg border p-4 text-left hover:bg-orange-50"><Mail className="text-orange-600"/><span><strong className="block">Send via email</strong><span className="text-sm text-gray-600">Send this {title.toLowerCase()} to your customer.</span></span></button>
          <button disabled className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg border p-4 text-left opacity-60"><MessageSquareText className="text-gray-500"/><span><strong className="block">Send via text</strong><span className="text-sm text-gray-600">Coming soon</span></span></button>
          <button onClick={() => { setMode('link'); if (!url) void makeLink(); }} className="flex w-full items-center gap-3 rounded-lg border p-4 text-left hover:bg-orange-50"><Copy className="text-orange-600"/><span><strong className="block">Copy link</strong><span className="text-sm text-gray-600">Create a customer link you can share anywhere.</span></span></button>
        </div>
      </div>
    </div>}
    {mode === 'link' && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"><div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="link-title" tabIndex={-1} className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl outline-none">
      <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><button onClick={backToChooser} aria-label="Back to sharing options" className="rounded p-1 text-gray-500 hover:bg-gray-100"><ArrowLeft size={18}/></button><h2 id="link-title" className="text-lg font-semibold">Copy {title} Link</h2></div><button onClick={close} aria-label="Close" className="rounded p-1 text-gray-500"><X size={20}/></button></div>
      {busy && <p role="status">Creating and copying link…</p>}
      {notice && <p role="status" className="mb-3 text-sm text-green-700">{notice}</p>}
      {error && <p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}
      {url && <><label htmlFor="estimate-share-url" className="mb-1 block text-sm font-medium">Customer link</label><input ref={linkField} id="estimate-share-url" readOnly value={url} onFocus={e => e.currentTarget.select()} className="w-full rounded-lg border p-3 text-sm"/><p className="mt-2 text-sm text-gray-600">Expires {new Date(expiresAt).toLocaleString()}.</p><div className="mt-4 flex flex-wrap gap-2"><button disabled={busy} onClick={() => void retryCopy()} className="rounded-lg bg-orange-600 px-4 py-2 text-white disabled:opacity-50">Copy Link Again</button><button disabled={busy} onClick={() => void markAsSent()} className="rounded-lg border border-orange-300 px-4 py-2 text-orange-700 hover:bg-orange-50 disabled:opacity-50">Mark as Sent</button><button disabled={busy} onClick={close} className="rounded-lg px-4 py-2 text-gray-700">Close</button></div></>}
      {!url && error && <button disabled={busy} onClick={() => void makeLink()} className="mt-2 rounded-lg bg-orange-600 px-4 py-2 text-white disabled:opacity-50">Retry</button>}
      {!url && <button disabled={busy} onClick={close} className="ml-2 rounded-lg px-4 py-2 text-gray-700">Close</button>}
    </div></div>}
    <SendEstimateModal isOpen={mode === 'email'} onClose={close} estimate={estimate} onSend={onSend} onBack={backToChooser}/>
  </>;
}
