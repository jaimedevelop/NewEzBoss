import React, { useCallback, useEffect, useState } from 'react';
import { estimatesApiRequest, estimatesPublicApiRequest } from '../../../../../services/estimates/estimatesApi';

type Payment = { id: number; method: string; status: string; grossCents: number; refundedCents: number; pendingRefundCents: number; disputedCents: number; lostDisputeCents: number; netReceivedCents: number };
type Request = { id: string; kind: 'payment'|'refund'; paymentId: number | null; amountCents: string; reason: string; status: string; reviewReason?: string };
type Recovery = { policy: string; payments: Payment[]; requests: Request[] };
const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

export default function PaymentRecoveryPanel({ estimateId, publicToken, customer, onUpdate }: {
  estimateId: string; publicToken?: string; customer: boolean; onUpdate: () => void;
}) {
  const [data, setData] = useState<Recovery | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ paymentId?: number; amount: string; reason: string } | null>(null);
  const [review, setReview] = useState<{ id: string; action: string; reason: string } | null>(null);
  const base = publicToken ? `/estimates/public/by-token/${encodeURIComponent(publicToken)}` : `/estimates/${estimateId}`;
  const api = publicToken ? estimatesPublicApiRequest : estimatesApiRequest;
  const load = useCallback(async () => {
    if (customer && !publicToken) return;
    try { setData(await api<Recovery>(`${base}/payment-recovery`)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load payment requests'); }
  }, [api, base, customer, publicToken]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!data?.requests.some(r => r.status === 'processing')) return;
    const timer = window.setInterval(() => { void load(); }, 10000);
    return () => window.clearInterval(timer);
  }, [data, load]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if (review) await api(`${base}/payment-requests/${review.id}/review`, { method: 'POST', body: JSON.stringify(review) });
      else if (form) await api(`${base}/${customer ? 'refund-requests' : 'payment-requests'}`, { method: 'POST', body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
      setForm(null); setReview(null); await load(); onUpdate();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save request'); }
    finally { setBusy(false); }
  };
  if (customer && !publicToken) return null;
  const field = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
  return <section className="m-4 rounded-xl border border-gray-200 bg-white p-4 space-y-4" aria-label="Payment requests and refunds">
    <div className="flex items-center justify-between gap-3">
      <h3 className="font-semibold text-gray-900">Payment requests & refunds</h3>
      {!customer && <button disabled={busy || !!form || !!review} onClick={() => setForm({ amount: '', reason: '' })} className="text-sm font-semibold text-orange-700 disabled:opacity-50">Request payment</button>}
    </div>
    <p className="text-xs text-gray-600">Refunds require contractor approval and do not automatically reopen your invoice balance. Net received reflects refunds and disputed funds.</p>
    {error && <p role="alert" className="text-sm text-red-700">{error} <button type="button" onClick={() => void load()} className="underline">Refresh status</button></p>}
    {!data && !error && <p className="text-sm text-gray-500">Loading requests…</p>}
    {data?.payments.filter(p => p.status === 'approved').map(p => {
      const available = Math.max(0, p.grossCents - p.refundedCents - p.pendingRefundCents - p.disputedCents - p.lostDisputeCents);
      const open = data.requests.some(r => r.paymentId === p.id && ['requested','processing'].includes(r.status));
      return <div key={p.id} className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{p.method} payment · {money(p.grossCents)}</span><span>Net received: {money(p.netReceivedCents)}</span></div>
        {p.refundedCents > 0 && <p>Refunded: {money(p.refundedCents)}</p>}
        {p.pendingRefundCents > 0 && <p className="text-amber-700">Refund pending: {money(p.pendingRefundCents)}</p>}
        {p.disputedCents + p.lostDisputeCents > 0 && <p className="text-red-700">Disputed: {money(p.disputedCents)} · Dispute losses: {money(p.lostDisputeCents)}</p>}
        {customer && p.method === 'Stripe' && available > 0 && <button disabled={busy || open || !!form || !!review} onClick={() => setForm({ paymentId: p.id, amount: (available / 100).toFixed(2), reason: '' })} className="text-orange-700 font-semibold disabled:opacity-50">{open ? 'Refund request open' : 'Request refund'}</button>}
      </div>;
    })}
    {data?.requests.length === 0 && <p className="text-sm text-gray-500">No payment or refund requests yet.</p>}
    {data?.requests.map(r => <div key={r.id} className="rounded-lg border p-3 text-sm space-y-2">
      <div className="flex flex-wrap justify-between gap-2"><strong>{r.kind === 'refund' ? 'Refund request' : 'Payment request'} · {money(Number(r.amountCents))}</strong><span className="capitalize">{r.status}</span></div>
      <p className="whitespace-pre-wrap">{r.reason}</p>
      {r.reviewReason && <p className="text-gray-600">Contractor response: {r.reviewReason}</p>}
      {customer && r.kind === 'payment' && r.status === 'requested' && <p className="text-gray-600">Use the payment options below to pay an available milestone or the invoice balance. This request does not add a new charge.</p>}
      {!customer && r.status === 'requested' && <div className="flex gap-4">
        {(r.kind === 'refund' ? ['approve','reject'] : ['close']).map(action => <button key={action} disabled={busy || !!form || !!review} onClick={() => setReview({ id: r.id, action, reason: '' })} className="font-semibold text-orange-700 capitalize disabled:opacity-50">{action === 'approve' ? 'Approve refund' : action}</button>)}
      </div>}
    </div>)}
    {(form || review) && <form onSubmit={submit} className="border-t pt-4 space-y-3">
      <h4 className="font-semibold">{review ? `${review.action === 'approve' ? 'Approve refund' : review.action === 'reject' ? 'Reject refund' : 'Close payment request'}` : customer ? 'Request a refund' : 'Request a payment'}</h4>
      {review?.action === 'approve' && <p className="text-sm text-gray-600">Submitting sends the refund to Stripe, reverses the destination transfer, and refunds the proportional application fee. The invoice balance stays unchanged.</p>}
      {form && <label className="block text-sm">Amount ($)<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={field} /></label>}
      <label className="block text-sm">{review ? 'Response / reason' : 'Reason'}<textarea required maxLength={1000} rows={3} value={form?.reason ?? review?.reason ?? ''} onChange={e => form ? setForm({ ...form, reason: e.target.value }) : review && setReview({ ...review, reason: e.target.value })} className={field} /></label>
      <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => { setForm(null); setReview(null); }} className="text-sm">Cancel</button><button disabled={busy} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Submitting…' : review?.action === 'approve' ? 'Issue refund' : 'Submit request'}</button></div>
    </form>}
  </section>;
}
