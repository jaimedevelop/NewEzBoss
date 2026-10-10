import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import ModalPortal from '../../../../mainComponents/ui/ModalPortal';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { getProductTrades, getProductSections, getProductCategories, getProductSubcategories, getProductTypes } from '../../../../services/categories';
import { purchasingRequest, retryKey, changed, fromApi } from '../../../../services/purchasing/purchasing.api';

import type { PurchaseOrderItem } from '../../../../services/purchasing/purchasing.types';

const levels = ['trade', 'section', 'category', 'subcategory', 'type'] as const;
type Scope = Record<typeof levels[number], string>;
type Destination = { id: string; poNumber: string; vendor: string | null; estimateId: number | null; workOrderId: string | null };
type Preview = { itemCount: number; totalQuantity: number };
const emptyScope: Scope = { trade: '', section: '', category: '', subcategory: '', type: '' };

export default function GeneratePurchaseOrderModal({ onClose, initialScope = emptyScope, onAddItems, onSaved }: {
  onClose: () => void;
  initialScope?: Scope;
  onAddItems?: (items: PurchaseOrderItem[]) => void;
  onSaved?: () => void;
}) {
  const { currentUser } = useAuthContext();
  const navigate = useNavigate();
  const [scope, setScope] = useState<Scope>(initialScope);
  const [options, setOptions] = useState<Record<string, { id: string; name: string }[]>>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState('');
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [destination, setDestination] = useState(onAddItems ? 'current' : 'append');
  const [targetId, setTargetId] = useState('');
  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [destinationError, setDestinationError] = useState('');

  useEffect(() => {
    let active = true;
    purchasingRequest<{ purchaseOrders: Destination[] }>('/purchase-orders/inventory-replenishment/destinations').then(result => {
      if (!active) return;
      setDestinations(result.purchaseOrders);
      setTargetId(result.purchaseOrders[0]?.id ?? '');
      if (!result.purchaseOrders.length && !onAddItems) setDestination('new');
    }).catch(e => { if (active) setDestinationError(e instanceof Error ? e.message : 'Unable to load purchase orders'); })
      .finally(() => { if (active) setLoadingDestinations(false); });
    return () => { active = false; };
  }, [onAddItems]);
  const payload = { scope: Object.fromEntries(levels.filter(level => scope[level]).map(level => [`${level}Id`, Number(scope[level])])) };

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!currentUser?.uid) return;
      setLoadingOptions(true);
      try {
        const uid = currentUser.uid;
        const results = await Promise.all([
          getProductTrades(uid),
          scope.trade ? getProductSections(scope.trade, uid) : Promise.resolve({ success: true, data: [] }),
          scope.section ? getProductCategories(scope.section, uid) : Promise.resolve({ success: true, data: [] }),
          scope.category ? getProductSubcategories(scope.category, uid) : Promise.resolve({ success: true, data: [] }),
          scope.subcategory ? getProductTypes(scope.subcategory, uid) : Promise.resolve({ success: true, data: [] }),
        ]);
        if (!active) return;
        if (results.some(result => !result.success)) throw new Error('Unable to load inventory scope options. Reopen to retry.');
        setOptions(Object.fromEntries(results.map((result, index) => [levels[index], (result.data ?? []).map(row => ({ id: String(row.id), name: row.name }))])));
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Unable to load scope options'); }
      finally { if (active) setLoadingOptions(false); }
    };
    void load();
    return () => { active = false; };
  }, [currentUser?.uid, scope]);

  const analyze = async () => {
    setBusy(true); setError(''); setPreview(null);
    try { setPreview(await purchasingRequest<Preview>('/purchase-orders/inventory-replenishment/preview', { method: 'POST', body: JSON.stringify(payload) })); }
    catch (e) { setError(e instanceof Error ? e.message : 'Inventory analysis failed'); }
    finally { setBusy(false); }
  };
  const generate = async () => {
    setBusy(true); setError('');
    try {
      if (destination === 'current' && onAddItems) {
        const result = await purchasingRequest<{ lineItems: unknown[] }>('/purchase-orders/inventory-replenishment/items', { method: 'POST', body: JSON.stringify(payload) });
        if (!result.lineItems.length) { setPreview({ itemCount: 0, totalQuantity: 0 }); return; }
        onAddItems(fromApi(result).items);
        onClose();
        return;
      }
      if (destination === 'append') {
        const result = await purchasingRequest<{ id: string }> (`/purchase-orders/inventory-replenishment/append/${encodeURIComponent(targetId)}`, { method: 'POST', body: JSON.stringify(payload) });
        changed();
        onSaved?.();
        navigate(`/purchasing?poId=${encodeURIComponent(result.id)}`);
        onClose();
        return;
      }
      const key = retryKey('inventory-replenishment', payload);
      const result = await purchasingRequest<{ id?: string; noShortage?: boolean }>('/purchase-orders/inventory-replenishment', { method: 'POST', body: JSON.stringify({ ...payload, idempotencyKey: key.value }) });
      key.clear();
      if (result.noShortage) { setPreview({ itemCount: 0, totalQuantity: 0 }); return; }
      if (!result.id) throw new Error('Purchase order response is missing an ID');
      changed();
      onSaved?.();
      navigate(`/purchasing?poId=${encodeURIComponent(result.id)}`);
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : onAddItems ? 'Unable to add inventory items' : 'Purchase order generation failed'); }
    finally { setBusy(false); }
  };

  return <ModalPortal><div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div role="dialog" aria-modal="true" aria-labelledby="generate-po-title" className="w-full max-w-xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
      <div className="flex justify-between items-center"><h2 id="generate-po-title" className="text-xl font-bold">{onAddItems ? 'Inventory Check' : 'Generate Purchase Order'}</h2><button aria-label="Close" disabled={busy} onClick={onClose}><X /></button></div>
      <p className="text-sm text-gray-600">Find products below minimum stock and replenish them to their minimum. Select a scope or leave all levels open to analyze all products. Larger scopes may take longer.</p>
      <p className="text-sm text-gray-600">Existing purchase orders are not deducted. Review quantities, prices, and suppliers on Purchasing before ordering.</p>
      <p className="text-sm text-gray-600">Appending fills only the shortage not already covered by the chosen order. Repeating a check will not add duplicate quantities.</p>
      <div className="space-y-3 border rounded-lg p-3">
        <label className="block text-sm font-medium">Destination
          <select className="block w-full mt-1 border rounded-lg p-2" value={destination} disabled={busy || loadingDestinations} onChange={e => { setDestination(e.target.value); setError(''); }}>
            {onAddItems && <option value="current">Add to this purchase order</option>}
            <option value="append">Append to existing purchase order</option>
            <option value="new">Create new purchase order</option>
          </select>
        </label>
        {destination === 'append' && <label className="block text-sm font-medium">Purchase order
          <select className="block w-full mt-1 border rounded-lg p-2" value={targetId} disabled={busy || loadingDestinations} onChange={e => setTargetId(e.target.value)}>
            {!destinations.length && <option value="">No draft purchase orders available</option>}
            {destinations.map(po => <option key={po.id} value={po.id}>{po.poNumber}{po.vendor ? ` — ${po.vendor}` : ''}{!po.estimateId && !po.workOrderId ? ' — General shopping list' : ''}</option>)}
          </select>
          <span className="block mt-1 text-gray-500 font-normal">Only draft orders can receive additional items.</span>
        </label>}
        {destinationError && <p role="alert" className="text-red-600">{destinationError}</p>}
      </div>
      <div className="grid sm:grid-cols-2 gap-3">{levels.map((level, index) => <label key={level} className="text-sm capitalize">{level}
        <select className="block w-full mt-1 border rounded-lg p-2" value={scope[level]} disabled={busy || loadingOptions || (index > 0 && !scope[levels[index - 1]])} onChange={e => {
          const next = { ...scope, [level]: e.target.value };
          levels.slice(index + 1).forEach(child => { next[child] = ''; });
          setScope(next); setPreview(null); setError('');
        }}><option value="">All {level === 'category' ? 'categories' : level === 'subcategory' ? 'subcategories' : `${level}s`}</option>{(options[level] ?? []).map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
      </label>)}</div>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {preview && <p role="status">{preview.itemCount ? `${preview.itemCount} products below minimum stock; ${preview.totalQuantity} total units to replenish. Stock will be checked again before adding items.` : 'No products below minimum stock in this scope.'}</p>}
      <div className="flex flex-wrap justify-end gap-3"><button disabled={busy || loadingOptions} onClick={() => { setScope(emptyScope); setPreview(null); setError(''); }} className="px-3 py-2 border rounded-lg">All Products</button><button disabled={busy || loadingOptions} onClick={analyze} className="px-3 py-2 border rounded-lg">{busy ? 'Working…' : 'Analyze Inventory'}</button><button disabled={busy || loadingOptions || loadingDestinations || !preview?.itemCount || (destination === 'append' && !targetId)} onClick={generate} className="px-3 py-2 bg-orange-600 text-white rounded-lg disabled:opacity-50">{destination === 'current' ? 'Add to This Order' : destination === 'append' ? `Append to ${destinations.find(po => po.id === targetId)?.poNumber ?? 'Purchase Order'}` : 'Create New Purchase Order'}</button></div>
    </div>
  </div></ModalPortal>;
}
