import { materialsStatus } from '../../../../services/purchasing/materialsStatus';
import { useEffect, useRef, useState } from 'react';
import { ClipboardList, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Estimate } from '../../../../services/estimates/estimates.types';
import { getProcurementPreview, type ProcurementPreview } from '../../../../services/purchasing/purchasing.inventory';


export default function EstimateMaterials({ estimate, creating, onCreate }: {
  estimate: Estimate; creating: boolean; onCreate: () => void;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  const [preview, setPreview] = useState<ProcurementPreview | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setPreview(null); setError(false);
    if (estimate.id) getProcurementPreview(estimate.id).then(value => {
      if (active) setPreview(value);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [estimate.id, estimate.updatedAt, open, revision]);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener('focus', refresh);
    window.addEventListener('purchasing-changed', refresh);
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('purchasing-changed', refresh); };
  }, []);
  const lines = preview ? [...preview.stockedRequirements, ...preview.orderRequirements] : [];
  const status = preview ? materialsStatus(preview) : error ? 'Unable to check materials' : 'Checking materials…';
  const closed = ['completed', 'cancelled'].includes(preview?.workOrderStatus ?? '');
  const blocked = !preview || closed || Boolean(preview.unresolved.length || preview.unsupportedProcurement.length);
  const orders = preview?.purchaseOrders ?? [];
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
      className="inline-flex items-center gap-2 whitespace-nowrap px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors">
      <ClipboardList className="w-4 h-4" />Purchase Order
    </button>
    <dialog ref={dialog} onCancel={() => setOpen(false)} onClose={() => setOpen(false)}
      aria-labelledby="estimate-material-status-title"
      onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setOpen(false); } }}
      className="w-[calc(100%_-_2rem)] max-w-3xl max-h-[85vh] overflow-y-auto rounded-xl p-0 shadow-xl backdrop:bg-black/50">
    <div className="p-6 text-sm">
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 id="estimate-material-status-title" className="text-lg font-semibold text-gray-900">Material status</h2>
      <button type="button" onClick={() => setOpen(false)} aria-label="Close material status" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X className="w-5 h-5" /></button>
    </div>
    <div role="status" className="font-semibold text-gray-900">{status}</div>
    {preview && !closed && !blocked && <p className="mt-1 text-xs text-gray-600">{preview.poNeeded
      ? `${preview.orderRequirements.length} material${preview.orderRequirements.length === 1 ? '' : 's'} still need purchasing.`
      : lines.some(line => line.ownOutstandingOrder > 0) ? 'Purchases cover the shortage; materials are still outstanding.'
      : 'Inventory covers the material requirements.'}</p>}
    {preview && Boolean(preview.unresolved.length || preview.unsupportedProcurement.length) && <p className="mt-1 text-xs text-amber-700">Review missing inventory references and tool/equipment requirements.</p>}
    <div className="mt-2 flex flex-wrap gap-2">
      {preview?.poNeeded && !closed && <button type="button" disabled={creating || blocked || estimate.clientState !== 'accepted'} onClick={onCreate}
        className="rounded-lg bg-orange-600 px-3 py-2 text-white disabled:opacity-50">{creating ? 'Creating…' : orders.some(po => po.status !== 'cancelled') ? 'Purchase additional materials' : 'Create Purchase Order'}</button>}
      {orders.map(po => <button key={po.id} type="button" onClick={() => navigate(`/purchasing?poId=${encodeURIComponent(po.id)}`)}
        className="rounded-lg border border-orange-200 px-3 py-2 text-orange-700">View Purchase Order{po.status === 'cancelled' ? ' (cancelled)' : orders.length > 1 ? ` (${po.status.replace('_', ' ')})` : ''}</button>)}
      {error && <button type="button" onClick={() => setRevision(value => value + 1)} className="underline">Retry</button>}
    </div>
    {preview?.poNeeded && estimate.clientState !== 'accepted' && !closed && <p className="mt-1 text-xs text-gray-500">Client acceptance is required to create a purchase order.</p>}
    {lines.length > 0 && <details open className="mt-4"><summary className="cursor-pointer text-gray-700">Material breakdown</summary>
      <div className="overflow-x-auto"><table className="mt-2 w-full text-xs text-left"><thead><tr>{['Material', 'Required', 'Assigned', 'Issued', 'Available', 'On order / Draft', 'Still needed'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead>
        <tbody>{lines.map(line => <tr key={line.productId}><td className="p-2">{line.name} {line.unit && `(${line.unit})`}</td>{[line.required, line.reservedQuantity, line.issuedQuantity, line.available, line.ownOutstandingOrder, line.shortage].map((value, index) => <td key={index} className="p-2">{value}</td>)}</tr>)}</tbody></table></div>
    </details>}
  </div>
  </dialog>
  </>;
}
