import React from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export function orderedIds(ids: string[], saved: string[] = []): string[] {
    const existing = new Set(ids);
    return [...new Set([...saved.filter(id => existing.has(id)), ...ids])];
}

export function PreviewSort({ ids, onChange, children }: { ids: string[]; onChange?: (ids: string[]) => void; children: React.ReactNode }) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    if (!onChange) return <>{children}</>;
    return <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return;
        const from = ids.indexOf(String(active.id));
        const to = ids.indexOf(String(over.id));
        if (from >= 0 && to >= 0) onChange(arrayMove(ids, from, to));
    }}><SortableContext items={ids} strategy={verticalListSortingStrategy}>{children}</SortableContext></DndContext>;
}

const InlineDragContext = React.createContext<string | null>(null);

export function PreviewDragHandle() {
    const label = React.useContext(InlineDragContext);
    return label === null ? null : <DragHandle label={label} inline />;
}

function DragHandle({ label, inline = false }: { label: string; inline?: boolean }) {
    return <button type="button" tabIndex={-1} data-preview-drag-handle data-html2canvas-ignore="true" aria-label={`Drag ${label}`} title="Drag the row to reorder, or focus it and press Space and use arrow keys" className={`absolute -left-8 ${inline ? 'top-1/2 -translate-y-1/2' : 'top-1'} flex h-8 w-8 touch-none select-none items-center justify-center cursor-grab text-gray-400 hover:text-orange-600 active:cursor-grabbing`}><GripVertical className="pointer-events-none h-4 w-4" /></button>;
}

export function PreviewSortRow({ id, label, enabled, inlineHandle = false, children }: { id: string; label: string; enabled: boolean; inlineHandle?: boolean; children: React.ReactNode }) {
    return enabled ? <DraggablePreviewRow id={id} label={label} inlineHandle={inlineHandle}>{children}</DraggablePreviewRow> : <div className="relative">{children}</div>;
}

function DraggablePreviewRow({ id, label, inlineHandle, children }: { id: string; label: string; inlineHandle: boolean; children: React.ReactNode }) {
    const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id });
    const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0 || !event.isPrimary) return;
        const target = event.target as HTMLElement;
        if (target.closest('a, input, textarea, select, [contenteditable="true"]') || target.closest('button:not([data-preview-drag-handle])')) return;
        // dnd-kit ignores already-cancelled events. Activate it before
        // suppressing native selection, and isolate nested item drags.
        event.stopPropagation();
        listeners?.onPointerDown?.(event);
        event.preventDefault();
    };
    return <div ref={setNodeRef} {...attributes} {...listeners} onPointerDown={startDrag} aria-label={`Reorder ${label}`} className="relative touch-none select-none cursor-grab active:cursor-grabbing" style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 20 : undefined, background: isDragging ? '#fff7ed' : undefined }}>
        {!inlineHandle && <DragHandle label={label} />}
        <InlineDragContext.Provider value={inlineHandle ? label : null}>{children}</InlineDragContext.Provider>
    </div>;
}
