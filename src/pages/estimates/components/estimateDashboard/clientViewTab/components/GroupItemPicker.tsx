import React, { useMemo, useRef, useState } from 'react';
import type { LineItem } from '../../../../../../services/estimates/estimates.types';

export function GroupItemPicker({ items, groupId, onAssign }: {
    items: LineItem[];
    groupId: string;
    onAssign: (ids: string[], groupId: string, remove?: boolean) => void;
}) {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const anchor = useRef(0);
    const suppressClick = useRef(false);
    const drag = useRef<{ start: number; base: Set<string>; adding: boolean } | null>(null);
    const eligible = useMemo(() => items.filter(item => !item.adjustmentKind), [items]);
    const visible = eligible.filter(item => `${item.name || ''} ${item.description} ${item.collectionName || ''}`.toLowerCase().includes(query.toLowerCase()));
    const collections = useMemo(() => {
        const result = new Map<string, { name: string; ids: string[] }>();
        eligible.forEach(item => {
            const key = item.collectionId || item.collectionName;
            if (!key) return;
            if (!result.has(key)) result.set(key, { name: item.collectionName || 'Collection', ids: [] });
            result.get(key)!.ids.push(item.id);
        });
        return [...result.entries()];
    }, [eligible]);
    const range = (start: number, end: number, base: Set<string>, adding: boolean) => {
        const next = new Set(base);
        visible.slice(Math.min(start, end), Math.max(start, end) + 1).forEach(item => {
            if (adding) next.add(item.id); else next.delete(item.id);
        });
        setSelected(next);
    };
    const apply = (remove = false) => {
        onAssign([...selected], groupId, remove);
        setSelected(new Set());
    };
    return <div className="space-y-3 border border-orange-200 rounded-xl p-3 bg-white">
        <p className="text-xs text-gray-600">Select a whole collection, drag across rows, or Shift-click a range. Items already in another group will move here.</p>
        {collections.length > 0 && <div className="space-y-1">
            <p className="text-xs font-semibold">Select whole collections</p>
            {collections.map(([key, collection]) => <button type="button" key={key}
                className="w-full text-left text-xs px-2 py-2 rounded-lg border border-gray-200 hover:bg-orange-50"
                onClick={() => setSelected(previous => new Set([...previous, ...collection.ids]))}>
                {collection.name} · {collection.ids.length} items
            </button>)}
        </div>}
        <input aria-label="Search group items" placeholder="Search items or collections…" value={query}
            onChange={event => { setQuery(event.target.value); anchor.current = 0; }}
            className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs" />
        <div className="flex justify-between text-xs">
            <button type="button" onClick={() => setSelected(previous => new Set([...previous, ...visible.map(item => item.id)]))} className="text-orange-700">Select all {visible.length} shown</button>
            <button type="button" onClick={() => setSelected(new Set())} className="text-gray-600">Clear selection</button>
        </div>
        <div className="max-h-72 overflow-y-auto select-none border rounded-lg"
            onPointerMove={event => {
                if (!drag.current) return;
                const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-group-item-index]');
                if (element && event.currentTarget.contains(element)) range(drag.current.start, Number(element.dataset.groupItemIndex), drag.current.base, drag.current.adding);
                const bounds = event.currentTarget.getBoundingClientRect();
                if (event.clientY > bounds.bottom - 28) event.currentTarget.scrollTop += 16;
                if (event.clientY < bounds.top + 28) event.currentTarget.scrollTop -= 16;
            }}
            onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
            {visible.map((item, index) => <label key={item.id} data-group-item-index={index}
                className={`flex gap-2 items-start p-2 border-b last:border-0 text-xs cursor-pointer ${selected.has(item.id) ? 'bg-orange-100' : 'hover:bg-gray-50'}`}
                onClick={event => { if (suppressClick.current && event.detail > 0) event.preventDefault(); }}
                onPointerDown={event => {
                    suppressClick.current = event.pointerType !== 'touch';
                    if (event.button !== 0 || event.pointerType === 'touch') return;
                    event.preventDefault();
                    event.currentTarget.parentElement!.setPointerCapture(event.pointerId);
                    const start = event.shiftKey ? anchor.current : index;
                    const adding = event.shiftKey || !selected.has(item.id);
                    drag.current = { start, base: new Set(selected), adding };
                    range(start, index, selected, adding);
                    if (!event.shiftKey) anchor.current = index;
                }}>
                <input type="checkbox" aria-label={`Select ${item.name || item.description}`} checked={selected.has(item.id)}
                    onChange={() => { const next = new Set(selected); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); setSelected(next); anchor.current = index; }} />
                <span className="min-w-0"><span className="block">{item.name || item.description}</span>
                    <span className="text-gray-500">{item.collectionName}{item.groupId === groupId ? ' · In this group' : item.groupId ? ' · In another group' : ''}</span>
                </span>
            </label>)}
            {!visible.length && <p className="p-3 text-xs text-gray-500">No matching items.</p>}
        </div>
        <p className="text-xs font-semibold" role="status">{selected.size} selected · {eligible.filter(item => item.groupId === groupId).length} in group</p>
        <div className="flex gap-2">
            <button type="button" disabled={!selected.size} onClick={() => apply()} className="flex-1 rounded-lg px-2 py-2 bg-orange-600 text-white text-xs disabled:opacity-40">Add selected</button>
            <button type="button" disabled={!selected.size} onClick={() => apply(true)} className="flex-1 rounded-lg border px-2 py-2 text-xs disabled:opacity-40">Remove selected</button>
        </div>
    </div>;
}
