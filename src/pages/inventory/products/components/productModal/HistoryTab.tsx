import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProductCreation } from '../../../../../contexts/ProductCreationContext';
import { inventoryApiRequest } from '../../../../../services/inventory/inventoryApi';

interface PurchaseEvent {
  id: string;
  purchaseOrderId: string;
  poNumber: string;
  receivedAt: string;
  quantityReceived: string | number;
  unitPrice: string | number | null;
  supplier: string | null;
  previousUnitPrice: string | number | null;
  priceRecorded: boolean;
}
const money = (value: string | number) => `$${Number(value).toFixed(2)}`;

const HistoryTab: React.FC<{ disabled?: boolean }> = () => {
  const { state } = useProductCreation();
  const productId = state.formData.id;
  const [events, setEvents] = useState<PurchaseEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    window.addEventListener('purchasing-changed', refresh);
    return () => window.removeEventListener('purchasing-changed', refresh);
  }, []);
  useEffect(() => {
    let active = true;
    setEvents([]);
    setError('');
    if (!productId) return;
    setLoading(true);
    inventoryApiRequest<PurchaseEvent[]>(`/inventory/products/${encodeURIComponent(productId)}/history`)
      .then(rows => { if (active) setEvents(rows); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load history'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [productId, revision]);

  if (!productId) return <p className="p-6 text-gray-500">Save this product to start tracking purchases.</p>;
  if (loading) return <p className="p-6 text-gray-500" role="status">Loading purchase history…</p>;
  if (error) return <div className="p-6" role="alert"><p className="text-red-600">{error}</p><button type="button" onClick={() => setRevision(v => v + 1)} className="mt-2 text-blue-600">Retry</button></div>;
  if (!events.length) return <p className="p-6 text-gray-500">No purchases yet. Confirm a purchase order receipt to record the actual store, quantity, and price paid.</p>;
  return <div className="space-y-3 p-4">
    <h3 className="font-semibold text-gray-900">Purchase History</h3>
    {events.map(event => <article key={event.id} className="rounded-lg border border-gray-200 p-4 space-y-2">
      <div className="flex flex-wrap justify-between gap-2">
        <Link className="text-blue-600 hover:underline font-medium" to={`/purchasing?poId=${encodeURIComponent(event.purchaseOrderId)}`}>{event.poNumber}</Link>
        <time className="text-sm text-gray-500" dateTime={event.receivedAt}>{new Date(event.receivedAt).toLocaleString()}</time>
      </div>
      <p className="text-sm text-gray-700">{event.supplier || 'Store not recorded'} · {Number(event.quantityReceived)} units</p>
      <p className="text-sm font-medium text-gray-900">
        {!event.priceRecorded ? (event.unitPrice == null ? 'Price not recorded' : `${money(event.unitPrice)}/unit · Previous price unavailable`)
          : event.previousUnitPrice == null ? `First recorded price: ${money(event.unitPrice!)}/unit`
          : Number(event.previousUnitPrice) === Number(event.unitPrice) ? `${money(event.unitPrice!)}/unit · Price unchanged`
          : `${money(event.previousUnitPrice)} → ${money(event.unitPrice!)}/unit`}
      </p>
      <p className="text-sm text-gray-600">Total paid: {event.unitPrice == null ? 'Unknown' : money(Number(event.quantityReceived) * Number(event.unitPrice))}</p>
    </article>)}
  </div>;
};
export default HistoryTab;
