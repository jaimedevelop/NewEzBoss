// src/pages/workOrders/components/MaterialReadinessTab.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { Package, Hammer, HardHat, CheckCircle2, XCircle, ImageOff, ShoppingCart, X } from 'lucide-react';
import { createPurchaseOrder, updatePurchaseOrder } from '../../../services/purchasing/purchasing.mutations';
import type { PurchaseOrderItem, PurchaseOrderWithId } from '../../../services/purchasing';
import { loadMaterialReadinessData, type MaterialInventorySnapshot } from '../../../services/workOrders/materialReadiness';
import { WorkOrderChecklistItem } from '../../../services/workOrders/workOrders.types';

interface MaterialReadinessTabProps {
    checklist: WorkOrderChecklistItem[];
    onToggleReady: (itemId: string, currentStatus: boolean) => void;
    onMarkAllReady: () => void;
    /** Parent integration: enables persisted purchase-order actions. */
    workOrderId?: string;
    estimateId?: string;
    onPurchaseOrderSaved?: (purchaseOrderId: string) => void;
}

const inventoryKey = (item: WorkOrderChecklistItem) => `${item.type}:${item.inventoryItemId ?? ''}`;
const typeLabel = (type: WorkOrderChecklistItem['type']) => type[0].toUpperCase() + type.slice(1);
const IconFor = ({ type, className = 'w-4 h-4' }: { type: WorkOrderChecklistItem['type']; className?: string }) => type === 'tool' ? <Hammer className={className} /> : type === 'equipment' ? <HardHat className={className} /> : <Package className={className} />;

const MaterialReadinessTab: React.FC<MaterialReadinessTabProps> = ({ checklist, onToggleReady, onMarkAllReady, workOrderId, estimateId, onPurchaseOrderSaved }) => {
    const [inventory, setInventory] = useState<Record<string, MaterialInventorySnapshot>>({});
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderWithId[]>([]);
    const [loadError, setLoadError] = useState('');
    const [selected, setSelected] = useState<string[]>([]);
    const [showPurchase, setShowPurchase] = useState(false);
    const [targetPO, setTargetPO] = useState<'new' | string>('new');
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [savingPO, setSavingPO] = useState(false);
    const [purchaseError, setPurchaseError] = useState('');

    useEffect(() => {
        let active = true;
        void loadMaterialReadinessData(checklist, workOrderId, estimateId).then(data => {
            if (!active) return;
            setInventory(data.inventory); setPurchaseOrders(data.purchaseOrders); setLoadError(data.error ?? '');
        });
        return () => { active = false; };
    }, [checklist, workOrderId, estimateId]);

    const hasPendingItems = checklist.some(item => !item.isReady);
    const selectedItems = useMemo(() => checklist.filter(item => selected.includes(item.id)), [checklist, selected]);
    const eligibleItems = selectedItems.filter(item => item.type === 'product' && item.inventoryItemId);
    const pendingPOs = purchaseOrders.filter(po => po.status === 'pending');
    const toggleSelection = (id: string) => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
    const associatedPOs = (item: WorkOrderChecklistItem) => purchaseOrders.filter(po => item.poId ? po.id === item.poId : Boolean(item.inventoryItemId && po.items.some(line => line.type === item.type && line.productId === item.inventoryItemId)));
    const suggestedQuantities = useMemo(() => {
        const available = new Map<string, number>();
        for (const item of checklist) if (item.type === 'product' && item.inventoryItemId) {
            available.set(item.inventoryItemId, Math.max(inventory[`product:${item.inventoryItemId}`]?.available ?? 0, 0));
        }
        for (const po of purchaseOrders) if (['pending', 'ordered', 'partially-received'].includes(po.status)) {
            for (const line of po.items) available.set(line.productId, (available.get(line.productId) ?? 0) + Math.max(line.quantityOrdered - line.quantityReceived, 0));
        }
        const suggested: Record<string, number> = {};
        for (const item of checklist) {
            const stock = available.get(item.inventoryItemId ?? '') ?? 0;
            const demand = item.isReady ? 0 : item.quantity;
            suggested[item.id] = Math.max(demand - stock, 0);
            if (item.inventoryItemId) available.set(item.inventoryItemId, Math.max(stock - demand, 0));
        }
        return suggested;
    }, [checklist, inventory, purchaseOrders]);
    const savePurchaseOrder = async () => {
        if (!workOrderId) { setPurchaseError('Purchase-order persistence requires the work order ID from the parent dashboard.'); return; }
        const items = eligibleItems.filter(item => (quantities[item.id] ?? suggestedQuantities[item.id] ?? 0) > 0);
        if (!items.length) { setPurchaseError('Select products with inventory references and a quantity greater than zero.'); return; }
        const lines: PurchaseOrderItem[] = items.map(item => { const quantity = quantities[item.id] ?? suggestedQuantities[item.id] ?? 0; return { id: `material-${item.id}`, productId: item.inventoryItemId!, type: 'product', productName: item.name, quantityNeeded: quantity, quantityOrdered: quantity, quantityReceived: 0, isReceived: false, unitPrice: 0, totalCost: 0 }; });
        setSavingPO(true); setPurchaseError('');
        try {
            if (targetPO === 'new') {
                const result = await createPurchaseOrder({ workOrderId, estimateId: '', estimateNumber: 'Work order', customerName: '', status: 'pending', items: lines, subtotal: 0, tax: 0, taxRate: 0, total: 0 });
                if (!result.success || !result.data) throw new Error(String(result.error ?? 'Unable to create the purchase order.'));
                onPurchaseOrderSaved?.(result.data);
            } else {
                const po = pendingPOs.find(order => order.id === targetPO);
                if (!po?.id) throw new Error('Choose an eligible pending purchase order.');
                const merged = [...po.items];
                lines.forEach(line => { const existing = merged.find(item => item.type === 'product' && item.productId === line.productId); if (existing) { existing.quantityNeeded += line.quantityNeeded; existing.quantityOrdered += line.quantityOrdered; existing.totalCost = existing.quantityOrdered * existing.unitPrice; } else merged.push(line); });
                const result = await updatePurchaseOrder(po.id, { version: po.version, items: merged });
                if (!result.success) throw new Error(String(result.error ?? 'Unable to update the purchase order.'));
                onPurchaseOrderSaved?.(po.id);
            }
            // Refresh associations after a persisted create/update; readiness remains untouched.
            const refreshed = await loadMaterialReadinessData(checklist, workOrderId, estimateId);
            setPurchaseOrders(refreshed.purchaseOrders);
            setShowPurchase(false);
        } catch (error) { setPurchaseError(error instanceof Error ? error.message : 'Unable to save the purchase order.'); }
        finally { setSavingPO(false); }
    };

    return (
        <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center lg:justify-between">
                <div><h3 className="text-lg font-bold text-gray-900">Material readiness</h3><p className="text-sm text-gray-500">Verify inventory separately from readiness.</p></div>
                <div className="flex flex-wrap items-center justify-end gap-3 text-sm">
                    <div className="flex items-center gap-1.5 text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Ready ({checklist.filter(i => i.isReady).length})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-red-700">
                        <XCircle className="w-4 h-4" />
                        <span>Pending ({checklist.filter(i => !i.isReady).length})</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => { setPurchaseError(''); setShowPurchase(true); }}
                        disabled={!selectedItems.length}
                        className="inline-flex items-center gap-1 rounded-lg border border-orange-200 px-3 py-1.5 font-medium text-orange-700 hover:bg-orange-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                    ><ShoppingCart className="w-4 h-4" />Purchase ({selectedItems.length})</button>
                    <button
                        type="button"
                        onClick={onMarkAllReady}
                        disabled={!hasPendingItems}
                        className="rounded-lg bg-green-600 px-3 py-1.5 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
                    >
                        Mark all items as Ready
                    </button>
                </div>
            </div>
            {loadError && <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{loadError}</p>}
            {showPurchase && <div className="mb-3 rounded-lg border border-orange-200 bg-orange-50 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-gray-900">Purchase order preparation</p><p className="text-xs text-gray-600">Only products with verified inventory IDs can be added. Quantities account for stock and existing orders. Receive purchases, then confirm materials are ready. Stock stays assigned to this job until completion, when consumed quantities are deducted; extra units stay in stock.</p></div><button onClick={() => setShowPurchase(false)} className="p-1 text-gray-500"><X className="w-4 h-4" /></button></div>{eligibleItems.length ? <><div className="mt-2 max-h-40 overflow-auto rounded border border-orange-100 bg-white">{eligibleItems.map(item => <label key={item.id} className="flex items-center gap-2 border-b border-gray-100 px-2 py-1.5 last:border-0"><span className="min-w-0 flex-1 truncate text-sm">{item.name}<span className="block text-xs text-gray-500">Job needs {item.isReady ? 0 : item.quantity} · In stock {inventory[`product:${item.inventoryItemId}`]?.available ?? 'Unknown'}</span></span><input aria-label={`Quantity for ${item.name}`} type="number" min="0" step="any" value={quantities[item.id] ?? suggestedQuantities[item.id] ?? 0} onChange={event => setQuantities(current => ({ ...current, [item.id]: Number(event.target.value) }))} className="w-20 rounded border border-gray-300 px-1 py-0.5 text-sm" /></label>)}</div><div className="mt-2 flex flex-wrap gap-2"><select value={targetPO} onChange={event => setTargetPO(event.target.value)} className="rounded border border-gray-300 bg-white px-2 py-1 text-sm"><option value="new">Create new PO</option>{pendingPOs.map(po => <option key={po.id} value={po.id}>Add to {po.poNumber}</option>)}</select><button disabled={savingPO} onClick={savePurchaseOrder} className="rounded bg-orange-600 px-3 py-1 text-sm font-medium text-white hover:bg-orange-700 disabled:bg-orange-300">{savingPO ? 'Saving…' : targetPO === 'new' ? 'Create purchase order' : 'Add to purchase order'}</button></div></> : <p className="mt-2 text-sm text-gray-600">Selected tools, equipment, or legacy rows cannot be purchased here; choose products with stable inventory references.</p>}{purchaseError && <p className="mt-2 text-sm text-red-700">{purchaseError}</p>}</div>}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-[860px] w-full text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="w-10 px-3 py-2" /><th className="px-2 py-2">Item</th><th className="px-2 py-2">Required</th><th className="px-2 py-2">Location</th><th className="px-2 py-2">Inventory</th><th className="px-2 py-2">Status</th><th className="px-3 py-2 text-right">Action</th></tr></thead><tbody className="divide-y divide-gray-100">
                {checklist.map((item) => (
                    <MaterialRow
                        key={item.id}
                        item={item} snapshot={item.inventoryItemId ? inventory[inventoryKey(item)] : undefined} selected={selected.includes(item.id)} onSelect={() => toggleSelection(item.id)} purchaseOrders={associatedPOs(item)} onToggleReady={onToggleReady}
                    />
                ))}
                </tbody></table></div>
                {checklist.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No materials or tools added to this work order.</p>
                    </div>
                )}
        </div>
    );
};

const MaterialRow = ({ item, snapshot, selected, onSelect, purchaseOrders, onToggleReady }: { item: WorkOrderChecklistItem; snapshot?: MaterialInventorySnapshot; selected: boolean; onSelect: () => void; purchaseOrders: PurchaseOrderWithId[]; onToggleReady: MaterialReadinessTabProps['onToggleReady'] }) => {
    const [imageFailed, setImageFailed] = useState(false);
    const shortage = snapshot?.available === undefined ? undefined : Math.max((item.isReady ? 0 : item.quantity) - snapshot.available, 0);
    return <tr className={item.isReady ? 'bg-green-50/40' : 'bg-white'}><td className="px-3 py-2"><input type="checkbox" checked={selected} onChange={onSelect} aria-label={`Select ${item.name}`} /></td><td className="px-2 py-2"><div className="flex items-center gap-2"><div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded border border-gray-200 bg-gray-50 text-gray-400">{(snapshot?.imageUrl ?? item.imageUrl) && !imageFailed ? <img src={snapshot?.imageUrl ?? item.imageUrl} alt="" className="h-full w-full object-cover" onError={() => setImageFailed(true)} /> : imageFailed ? <ImageOff className="w-4 h-4" /> : <IconFor type={item.type} />}</div><div><p className="max-w-[220px] truncate font-medium text-gray-900">{snapshot?.name ?? item.name}</p><p className="text-xs text-gray-500">{typeLabel(item.type)}{!item.inventoryItemId ? ' · inventory reference missing' : !snapshot ? ' · inventory item unavailable' : ''}</p></div></div></td><td className="px-2 py-2 text-gray-700">{item.quantity} {snapshot?.unit ?? item.unit ?? 'unit'}</td><td className="max-w-[180px] px-2 py-2 text-gray-600">{snapshot ? (snapshot.locations.length ? snapshot.locations.join(', ') : 'Location not recorded') : '—'}</td><td className="px-2 py-2">{snapshot?.available !== undefined ? <><span className="font-medium">{snapshot.available} available</span><p className={`text-xs ${shortage ? 'text-red-700' : 'text-green-700'}`}>{shortage ? `Short ${shortage}` : 'No verified shortage'}</p></> : snapshot?.inventoryStatus ? <span className="capitalize text-gray-700">{snapshot.inventoryStatus}</span> : <span className="text-gray-400">Not verified</span>}</td><td className="px-2 py-2"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${item.isReady ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>{item.isReady ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}{item.isReady ? 'Ready' : 'Pending'}</span>{purchaseOrders.map(po => <p key={po.id} className="mt-1 text-xs text-blue-700">{po.poNumber}</p>)}</td><td className="px-3 py-2 text-right"><button onClick={() => onToggleReady(item.id, item.isReady)} className={`rounded px-2 py-1 text-xs font-medium ${item.isReady ? 'bg-green-600 text-white hover:bg-green-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{item.isReady ? 'Ready' : 'Mark ready'}</button></td></tr>;
};

export default MaterialReadinessTab;
