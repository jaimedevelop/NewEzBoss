import React from 'react';
import { createPortal } from 'react-dom';
import { CurrencyInput, formatDollarAmount } from '../../../../../../mainComponents/forms/CurrencyInput';
import type { LineItem } from '../../../../../../services/estimates/estimates.types';

export function priceFromTotal(total: number, quantity: number) {
    return quantity > 0 ? Math.round((total / quantity + Number.EPSILON) * 100) / 100 : 0;
}

/** Single items edit inline; quantity pricing opens a calculator without blocking saves. */
export function PriceEditor({ item, onSave, label = 'Unit price' }: {
    item: LineItem; label?: string; onSave: (id: string, price: number) => Promise<void>;
}) {
    const [open, setOpen] = React.useState(false);
    const [price, setPrice] = React.useState(item.unitPrice);
    const [error, setError] = React.useState(false);
    const sequence = React.useRef(0);
    React.useEffect(() => setPrice(item.unitPrice), [item.unitPrice]);
    const group = label === 'Group total';
    const quantity = group ? 1 : item.quantity;
    const total = Math.round(quantity * price * 100) / 100;
    const commit = (value: number) => {
        const request = ++sequence.current;
        setPrice(value);
        setError(false);
        // Optimistic feedback is immediate; the shared save queue handles persistence.
        void onSave(item.id, value).catch(() => {
            if (request === sequence.current) setError(true);
        });
    };
    const name = `Edit ${group ? 'group total' : 'price'} for ${item.name || item.description}`;
    return <>
        {quantity > 1 ? <button type="button" aria-label={name}
            aria-haspopup="dialog" onClick={() => setOpen(true)}
            className="rounded px-1 -mr-1 text-right hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500">
            <span className="block text-sm font-semibold text-gray-900">${formatDollarAmount(total)}</span>
            <span className="block text-[10px] text-gray-400">{quantity} @ ${formatDollarAmount(price)}</span>
        </button> : <InlinePrice price={price} name={name} onSave={commit} />}
        {open && createPortal(<PriceDialog item={item} group={group} price={price} onSave={async (_, value) => commit(value)}
            onClose={() => setOpen(false)} onSaved={() => setOpen(false)} />, document.body)}
        {error && <button type="button" data-html2canvas-ignore="true" onClick={() => commit(price)} className="block ml-auto text-xs text-red-600" role="status">Save failed · Retry</button>}
    </>;
}

function InlinePrice({ price, name, onSave }: { price: number; name: string; onSave: (value: number) => void }) {
    const [editing, setEditing] = React.useState(false);
    const [draft, setDraft] = React.useState(price.toFixed(2));
    const active = React.useRef(false);
    const finish = () => {
        if (!active.current) return;
        active.current = false;
        setEditing(false);
        const value = Number(draft);
        if (draft.trim() !== '' && Number.isFinite(value) && value >= 0 && value !== price) onSave(value);
    };
    return editing ? <CurrencyInput autoFocus aria-label={name} value={draft}
        onFocus={event => event.currentTarget.select()}
        className="w-full rounded border border-orange-300 bg-white px-1 text-right text-sm font-semibold text-gray-900 focus:outline-orange-500"
        onChange={event => setDraft(event.target.value)} onBlur={finish}
        onKeyDown={event => {
            if (event.key === 'Enter') { event.preventDefault(); finish(); }
            if (event.key === 'Escape') { active.current = false; setEditing(false); }
        }} /> : <button type="button" aria-label={name}
        onClick={() => { setDraft(price.toFixed(2)); active.current = true; setEditing(true); }}
        className="rounded px-1 -mr-1 text-right text-sm font-semibold text-gray-900 hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500">
        ${formatDollarAmount(price)}
    </button>;
}

function PriceDialog({ item, group, price, onSave, onClose, onSaved }: {
    item: LineItem; group: boolean; price: number;
    onSave: (id: string, price: number) => Promise<void>; onClose: () => void; onSaved: (price: number) => void;
}) {
    const dialog = React.useRef<HTMLDialogElement>(null);
    const titleId = React.useId();
    const quantity = group ? 1 : item.quantity;
    const [unit, setUnit] = React.useState(price.toFixed(2));
    const [target, setTarget] = React.useState((Math.round(quantity * price * 100) / 100).toFixed(2));
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState('');
    const busy = React.useRef(false);
    React.useEffect(() => {
        const element = dialog.current!;
        element.showModal();
        return () => element.close();
    }, []);
    const actual = Math.round(quantity * Number(unit) * 100) / 100;
    const valid = unit.trim() !== '' && Number.isFinite(Number(unit)) && Number(unit) >= 0 && quantity > 0;
    return <dialog ref={dialog} aria-labelledby={titleId} onCancel={onClose} data-html2canvas-ignore="true"
        className="w-[min(360px,calc(100vw-32px))] rounded-2xl border border-gray-200 p-6 shadow-2xl backdrop:bg-black/25"
        onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}
        onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }}>
        <form onSubmit={async event => {
            event.preventDefault();
            if (busy.current || !valid) return;
            busy.current = true;
            setSaving(true);
            setError('');
            try { await onSave(item.id, Number(unit)); onSaved(Number(unit)); }
            catch { setError('Could not save this price. Please try again.'); }
            finally { busy.current = false; setSaving(false); }
        }}>
            <h3 id={titleId} className="text-base font-semibold text-gray-900">{group ? 'Edit group total' : 'Edit price'}</h3>
            <p className="mt-1 text-sm text-gray-500 break-words">{item.name || item.description}</p>
            {group && <p className="mt-2 text-xs text-gray-500">Adds or updates a discount or surcharge adjustment.</p>}
            {!group && quantity !== 1 && <p className="mt-3 text-sm text-gray-600">Quantity: {quantity}</p>}
            <label className="mt-4 block text-xs font-medium text-gray-600">{group ? 'Group total' : 'Unit price'}
                <CurrencyInput autoFocus value={unit} onFocus={event => event.currentTarget.select()}
                    className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
                    onChange={event => { const value = event.target.value; setUnit(value); setTarget(value === '' ? '' : (Math.round(quantity * Number(value) * 100) / 100).toFixed(2)); }} />
            </label>
            {!group && quantity !== 1 && <label className="mt-4 block text-xs font-medium text-gray-600">Desired item total
                <CurrencyInput value={target} className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
                    onChange={event => { const value = event.target.value; setTarget(value); setUnit(value === '' ? '' : priceFromTotal(Number(value), quantity).toFixed(2)); }} />
            </label>}
            {!group && quantity !== 1 && valid && <p className="mt-3 text-xs text-gray-500" aria-live="polite">
                {quantity} @ ${formatDollarAmount(Number(unit))} = ${formatDollarAmount(actual)}
                {target !== '' && Math.round(Number(target) * 100) !== Math.round(actual * 100) && <span className="mt-1 block">Closest total with a unit price rounded to cents.</span>}
            </p>}
            {error && <p role="alert" className="mt-3 text-xs text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
                <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-gray-600">Cancel</button>
                <button type="submit" disabled={saving || !valid} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
            </div>
        </form>
    </dialog>;
}
