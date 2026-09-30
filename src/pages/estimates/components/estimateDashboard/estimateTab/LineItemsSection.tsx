import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Package, Trash2, Loader2, Flag, FolderOpen, Lock, Briefcase, Wrench, Truck, HelpCircle, GripVertical, PencilRuler, PenTool, ChevronsDown, ChevronsUp, Plus } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

import { useAuthContext } from '../../../../../contexts/AuthContext';
import {
  addLineItem,
  bulkAppendLineItems,
  updateLineItem,
  deleteLineItem,
  reorderLineItems,
  formatCurrency,
  calculateEstimateTotals,
  findDuplicateLineItems,
  type LineItem,
  type LineItemUpdate,
  type Estimate
} from '../../../../../services/estimates';
import type { SaveResult } from '../../../../../mainComponents/forms/useAutosaveField';
import { InventoryPickerModal } from './InventoryPickerModal';
import { CollectionImportModal } from './CollectionImportModal';
import { useEstimateAutosave, type EstimateAutosave } from './useEstimateAutosave';

interface LineItemsToBottomButtonProps {
  sectionRef: React.RefObject<HTMLElement>;
}

/**
 * Displays only while the user is moving through a line-items section that is
 * taller than half the viewport. Keeping this shared lets the create and edit
 * experiences use the same threshold and scroll destination.
 */
export const LineItemsToBottomButton: React.FC<LineItemsToBottomButtonProps> = ({ sectionRef }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'top' | 'bottom'>('bottom');

  React.useEffect(() => {
    let animationFrame: number | null = null;

    const updateVisibility = () => {
      animationFrame = null;
      const section = sectionRef.current;
      if (!section) return;

      const bounds = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const hasLongList = bounds.height > viewportHeight / 2;
      const isScrollingThroughList = bounds.top < 0 && bounds.bottom > 0;
      const isAtBottom = bounds.bottom <= viewportHeight + 8;

      setIsVisible(hasLongList && isScrollingThroughList);
      setScrollDirection(isAtBottom ? 'top' : 'bottom');
    };

    const requestUpdate = () => {
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(updateVisibility);
      }
    };

    requestUpdate();
    window.addEventListener('scroll', requestUpdate, true);
    window.addEventListener('resize', requestUpdate);
    const observer = new ResizeObserver(requestUpdate);
    if (sectionRef.current) observer.observe(sectionRef.current);

    return () => {
      window.removeEventListener('scroll', requestUpdate, true);
      window.removeEventListener('resize', requestUpdate);
      observer.disconnect();
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, [sectionRef]);

  if (!isVisible) return null;

  const isScrollingToTop = scrollDirection === 'top';
  const label = isScrollingToTop ? 'To Top' : 'To Bottom';
  const Icon = isScrollingToTop ? ChevronsUp : ChevronsDown;

  return (
    <button
      type="button"
      onClick={() => sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: isScrollingToTop ? 'start' : 'end' })}
      className="fixed bottom-6 left-1/2 z-40 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-gray-900/75 px-4 py-3 text-sm font-medium text-white shadow-lg backdrop-blur-sm transition hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 lg:left-[calc(50%+8rem)]"
      aria-label={`Scroll ${isScrollingToTop ? 'to top' : 'to bottom'} of line items`}
      title={label}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
};

// ============================================================================
// HELPER COMPONENTS (Defined outside to prevent focus reset on re-render)
// ============================================================================

const LineItemTypeBadge = ({ type }: { type?: string }) => {
  switch (type) {
    case 'product':
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded bg-orange-50 text-orange-600" title="Product">
          <Package className="w-4 h-4" />
        </div>
      );
    case 'labor':
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded bg-purple-50 text-purple-600" title="Labor">
          <Briefcase className="w-4 h-4" />
        </div>
      );
    case 'tool':
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded bg-blue-50 text-blue-600" title="Tool">
          <Wrench className="w-4 h-4" />
        </div>
      );
    case 'equipment':
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded bg-green-50 text-green-600" title="Equipment">
          <Truck className="w-4 h-4" />
        </div>
      );
    case 'manual':
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded bg-yellow-50 text-yellow-600" title="Manual Entry">
          <PencilRuler className="w-4 h-4" />
        </div>
      );
    default:
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded bg-gray-50 text-gray-600" title="Custom / Other">
          <HelpCircle className="w-4 h-4" />
        </div>
      );
  }
};

const ItemTypeSelector = ({ value, onChange }: { value?: string; onChange: (type: any) => void }) => {
  const types = [
    { id: 'product', icon: Package, color: 'text-orange-600', bg: 'bg-orange-50', title: 'Product' },
    { id: 'labor', icon: Briefcase, color: 'text-purple-600', bg: 'bg-purple-50', title: 'Labor' },
    { id: 'tool', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50', title: 'Tool' },
    { id: 'equipment', icon: Truck, color: 'text-green-600', bg: 'bg-green-50', title: 'Equipment' },
    { id: 'manual', icon: PenTool, color: 'text-indigo-600', bg: 'bg-indigo-50', title: 'Manual Entry' },
    { id: 'custom', icon: HelpCircle, color: 'text-gray-600', bg: 'bg-gray-50', title: 'Custom' },
  ];

  return (
    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-100 shadow-sm w-fit shrink-0">
      {types.map((t) => {
        const Icon = t.icon;
        const isActive = (value || 'custom') === t.id;
        return (
          <button
            key={t.id}
            type="button"
            // Keep focus in the cell being edited, so picking a type isn't a blur.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange(t.id)}
            tabIndex={-1}
            aria-pressed={isActive}
            className={`flex items-center justify-center w-7 h-7 rounded transition-all ${isActive
              ? `${t.bg} ${t.color} ring-1 ring-inset ring-gray-200 shadow-sm`
              : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`}
            title={t.title}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
};

const SortableRow = ({
  sortId,
  label,
  collectionId,
  collectionName,
  children,
  disabled,
  trRef,
  highlight,
  onFocus,
  onBlur
}: {
  sortId: string;
  label: string;
  collectionId?: string;
  collectionName?: string;
  children: React.ReactNode;
  disabled: boolean;
  trRef?: React.MutableRefObject<HTMLTableRowElement | null>;
  highlight?: boolean;
  onFocus?: () => void;
  onBlur?: (e: React.FocusEvent<HTMLTableRowElement>) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: sortId,
    disabled: disabled
  });

  const style = {
    // Translate only so crossing rows with different heights never stretches the item.
    transform: CSS.Translate.toString(transform),
    // An undefined dnd-kit transition must not fall back to a CSS transform animation.
    transition: transition ?? 'none',
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
    backgroundColor: isDragging ? '#fff7ed' : undefined,
    boxShadow: isDragging ? '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' : undefined,
  };

  return (
    <tr
      ref={(node) => {
        setNodeRef(node);
        if (trRef) trRef.current = node;
      }}
      style={style}
      onFocus={onFocus}
      onBlur={onBlur}
      className={`${isDragging ? 'shadow-lg ring-1 ring-orange-200 rounded' : ''} ${highlight ? 'bg-orange-50/60' : ''} text-sm group/row relative ${collectionId ? 'hover:bg-gray-50' : ''}`}
    >
      <td className="py-2 px-2 w-8 relative">
        {collectionId && (
          <>
            <div 
              className={`absolute left-0 top-0 bottom-0 w-1.5 z-10 ${
                ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-teal-500', 'bg-orange-500', 'bg-emerald-500'][
                  Math.abs(collectionId.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0)) % 8
                ]
              }`}
              title={`Imported from: ${collectionName || 'Collection'}`}
            />
            {/* Collection Tooltip - shown on row hover */}
            <div className="opacity-0 group-hover/row:opacity-100 absolute left-8 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap bg-gray-900 border border-white/10 text-white text-[10px] px-2 py-1 rounded shadow-xl pointer-events-none transition-all duration-200 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-orange-400" />
              <span className="font-medium">{collectionName || 'From Collection'}</span>
            </div>
          </>
        )}
        {!disabled && (
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            className="touch-none select-none cursor-grab active:cursor-grabbing text-gray-400 hover:text-orange-600 transition-colors"
            aria-label={`Reorder ${label}`}
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
      </td>
      {children}
    </tr>
  );
};

// ============================================================================
// ROW DRAFTS
// ============================================================================

// Cells are edited as strings so partial input like "1." isn't rewritten.
interface RowDraft {
  description: string;
  quantity: string;
  unitPrice: string;
  type: string;
}

type NewItemValues = { description: string; quantity: number; unitPrice: number; type: string };

const blankDraft = (): RowDraft => ({ description: '', quantity: '1', unitPrice: '', type: 'manual' });

const toDraft = (item: LineItem): RowDraft => ({
  description: item.description ?? '',
  quantity: String(item.quantity),
  unitPrice: String(item.unitPrice),
  type: item.type ?? 'custom'
});

const fieldEquals = (key: keyof RowDraft, a: string, b: string) => {
  if (key === 'quantity' || key === 'unitPrice') return (parseFloat(a) || 0) === (parseFloat(b) || 0);
  if (key === 'description') return a.trim() === b.trim();
  return a === b;
};

// Only the fields that changed, so no-op edits never reach the API (it writes
// a revision row for every line-item PATCH).
const diffDraft = (draft: RowDraft, saved: RowDraft): LineItemUpdate | null => {
  const patch: LineItemUpdate = {};
  if (draft.description.trim() && !fieldEquals('description', draft.description, saved.description)) patch.description = draft.description.trim();
  if (draft.quantity.trim() !== '' && !fieldEquals('quantity', draft.quantity, saved.quantity)) patch.quantity = parseFloat(draft.quantity) || 0;
  if (!fieldEquals('unitPrice', draft.unitPrice, saved.unitPrice)) patch.unitPrice = parseFloat(draft.unitPrice) || 0;
  if (draft.type !== saved.type) patch.type = draft.type as LineItemUpdate['type'];
  return Object.keys(patch).length ? patch : null;
};

const CELL_INPUT =
  'w-full px-2 py-1 text-sm bg-transparent border border-transparent rounded hover:border-gray-300 focus:bg-white focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400';

interface LineItemRowProps {
  rowKey: string;
  /** null for the trailing blank row and for rows whose POST is still in flight. */
  item: LineItem | null;
  creating: boolean;
  createError?: string;
  locked: boolean;
  duplicate: boolean;
  autoFocus: boolean;
  registerFlusher: (flush: () => void) => () => void;
  onFocused: () => void;
  onLive: (itemId: string, live: { quantity: number; unitPrice: number } | null) => void;
  onSaveRow: (
    itemId: string,
    getChange: () => { patch: LineItemUpdate; snapshot: RowDraft } | null,
    onSaved: (snapshot: RowDraft) => void
  ) => Promise<SaveResult>;
  onCreateRow: (rowKey: string, values: NewItemValues) => Promise<LineItem | null>;
  onDelete: (item: LineItem) => void;
  onDiscardDraft: (rowKey: string) => void;
  onRetry: () => void;
}

// Defined outside LineItemsSection so typing never remounts the inputs.
const LineItemRow = React.memo(function LineItemRow(props: LineItemRowProps) {
  const { rowKey, item, creating, createError, locked, duplicate } = props;
  const [draft, setDraftState] = useState<RowDraft>(() => (item ? toDraft(item) : blankDraft()));
  const [rowError, setRowError] = useState<string | null>(null);

  const draftRef = useRef(draft);
  const savedRef = useRef<RowDraft | null>(item ? toDraft(item) : null);
  const idRef = useRef<string | null>(item?.id ?? null);
  const createRef = useRef<Promise<LineItem | null> | null>(null);
  const focusedRef = useRef(false);
  const trRef = useRef<HTMLTableRowElement | null>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const setDraft = (next: RowDraft) => {
    draftRef.current = next;
    setDraftState(next);
  };

  // Take server values for cells the user hasn't touched; never while the row has focus.
  const syncFromItem = useCallback(() => {
    const current = propsRef.current.item;
    if (!current) return;
    idRef.current = current.id;
    const incoming = toDraft(current);
    const saved = savedRef.current;
    if (!saved) {
      savedRef.current = incoming;
      return;
    }
    if (focusedRef.current) return;
    const local = draftRef.current;
    const next = { ...local };
    (Object.keys(incoming) as (keyof RowDraft)[]).forEach((key) => {
      if (fieldEquals(key, local[key], saved[key]) && !fieldEquals(key, local[key], incoming[key])) next[key] = incoming[key];
    });
    savedRef.current = incoming;
    if ((Object.keys(next) as (keyof RowDraft)[]).some((key) => next[key] !== local[key])) setDraft(next);
    // The server already has what this row shows (e.g. the page-level Retry succeeded).
    if (!diffDraft(next, incoming)) setRowError(null);
  }, []);

  useEffect(() => {
    syncFromItem();
  }, [item?.id, item?.description, item?.quantity, item?.unitPrice, item?.type, syncFromItem]);

  // A row whose POST succeeded (or was retried elsewhere) keeps its own draft.
  const commit = useCallback((): boolean => {
    const { locked: isLocked, rowKey: key } = propsRef.current;
    if (isLocked) return false;
    const values = draftRef.current;

    if (!idRef.current) {
      // Nothing is created until there's a description and a positive quantity.
      const quantity = parseFloat(values.quantity) || 0;
      if (!values.description.trim() || quantity <= 0) return false;
      // Already mid-POST: run this edit after it has an id instead of POSTing twice.
      if (createRef.current) {
        void createRef.current.then((created) => { if (created) commit(); });
        return false;
      }
      const sent = { ...values };
      const promise = propsRef.current.onCreateRow(key, {
        description: values.description.trim(),
        quantity,
        unitPrice: parseFloat(values.unitPrice) || 0,
        type: values.type
      }).then((created) => {
        createRef.current = null;
        if (created) {
          idRef.current = created.id;
          savedRef.current = sent;
          setRowError(null);
        }
        return created;
      });
      createRef.current = promise;
      void promise.then((created) => { if (created) commit(); });
      return true;
    }

    // A cleared description or quantity reverts instead of saving nothing-values.
    const saved = savedRef.current;
    if (!saved) return false;
    let next = values;
    if (!values.description.trim()) next = { ...next, description: saved.description };
    if (values.quantity.trim() === '') next = { ...next, quantity: saved.quantity };
    if (next !== values) setDraft(next);

    if (!diffDraft(next, saved)) return false;
    void propsRef.current.onSaveRow(
      idRef.current,
      () => {
        const snapshot = { ...draftRef.current };
        const baseline = savedRef.current;
        const patch = baseline && diffDraft(snapshot, baseline);
        return patch ? { patch, snapshot } : null;
      },
      (snapshot) => { savedRef.current = snapshot; }
    ).then((result) => setRowError(result.ok ? null : result.message ?? "Couldn't save"));
    return false;
  }, []);

  useEffect(() => {
    const flush = () => {
      const saved = savedRef.current;
      if (saved ? diffDraft(draftRef.current, saved) : draftRef.current.description.trim()) commit();
    };
    const unregister = props.registerFlusher(flush);
    return () => {
      unregister();
      flush();
      if (idRef.current) propsRef.current.onLive(idRef.current, null);
    };
  }, [commit, props.registerFlusher]);

  useEffect(() => {
    if (!idRef.current) return;
    props.onLive(idRef.current, {
      quantity: parseFloat(draft.quantity) || 0,
      unitPrice: parseFloat(draft.unitPrice) || 0
    });
  }, [draft.quantity, draft.unitPrice, item?.id]);

  useEffect(() => {
    if (props.autoFocus) {
      descRef.current?.focus();
      props.onFocused();
    }
  }, [props.autoFocus, props.onFocused]);

  const edit = (patch: Partial<RowDraft>) => {
    setDraft({ ...draftRef.current, ...patch });
    setRowError(null);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTableRowElement>) => {
    // Moving between cells of the same row is not leaving the row.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    focusedRef.current = false;
    commit();
    queueMicrotask(syncFromItem);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, field: 'description' | 'quantity' | 'unitPrice') => {
    if (e.key === 'Escape' && savedRef.current) {
      setDraft(savedRef.current);
      setRowError(null);
    } else if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (field === 'description') qtyRef.current?.focus();
      else if (field === 'quantity') priceRef.current?.focus();
      else commit();
    }
  };

  const quantity = parseFloat(draft.quantity) || 0;
  const unitPrice = parseFloat(draft.unitPrice) || 0;
  const isBlankRow = !item && !creating;
  const label = draft.description || 'new item';

  if (locked && item) {
    return (
      <SortableRow sortId={rowKey} label={item.description} collectionId={item.collectionId} collectionName={item.collectionName} disabled>
      <td className="py-3 text-center"><LineItemTypeBadge type={item.type} /></td>
      <td className="py-3">
        <div className="flex items-center gap-3">
            {duplicate && (
              <div title="Duplicate item detected">
                <Flag className="w-4 h-4 text-red-500 flex-shrink-0" />
              </div>
            )}
            <span className="text-gray-900">{item.description}</span>
          </div>
        </td>
        <td className="py-3 text-right text-gray-700">{item.quantity}</td>
        <td className="py-3 text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
        <td className="py-3 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
      </SortableRow>
    );
  }

  const priceWithoutDescription = isBlankRow && !draft.description.trim() && draft.unitPrice !== '';
  const needsQuantity = isBlankRow && draft.description.trim() && quantity <= 0;
  const errorText = rowError ?? createError ?? null;

  return (
    <SortableRow
      sortId={rowKey}
      label={label}
      collectionId={item?.collectionId}
      collectionName={item?.collectionName}
      disabled={!item}
      trRef={trRef}
      highlight={priceWithoutDescription}
      onFocus={() => { focusedRef.current = true; }}
      onBlur={handleBlur}
    >
      <td className="py-3 text-center align-top"><LineItemTypeBadge type={draft.type} /></td>
      <td className="py-2 pr-2 align-top">
        <div className="flex items-center gap-2">
          {duplicate && (
            <div title="Duplicate item detected">
              <Flag className="w-4 h-4 text-red-500 flex-shrink-0" />
            </div>
          )}
          <textarea
            ref={descRef}
            value={draft.description}
            onChange={(e) => {
              edit({ description: e.target.value });
              e.currentTarget.style.height = 'auto';
              e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
            }}
            onFocus={(e) => {
              e.currentTarget.style.height = 'auto';
              e.currentTarget.style.height = `${Math.max(e.currentTarget.scrollHeight, 96)}px`;
            }}
            onBlur={(e) => { e.currentTarget.style.height = ''; }}
            onKeyDown={(e) => handleKeyDown(e, 'description')}
            placeholder={priceWithoutDescription ? 'Add a description to save this item' : isBlankRow ? 'Add a line item…' : 'Description'}
            aria-label="Description"
            rows={1}
            className={`${CELL_INPUT} min-w-[10rem] flex-1 resize-y overflow-hidden leading-5 focus:min-h-24 ${errorText ? 'border-red-300' : ''}`}
          />
          <ItemTypeSelector
            value={draft.type}
            onChange={(type) => {
              edit({ type });
              // New rows save when focus leaves; existing rows save right away.
              if (idRef.current) commit();
            }}
          />
        </div>
        {errorText && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {errorText}
            <button type="button" onClick={() => { if (creating) props.onRetry(); commit(); }} className="ml-2 font-medium underline hover:text-red-800">
              Retry
            </button>
          </p>
        )}
      </td>
      <td className="py-2 align-top">
        <input
          ref={qtyRef}
          type="text"
          inputMode="numeric"
          value={draft.quantity}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '' || /^\d+$/.test(val)) edit({ quantity: val });
          }}
          onKeyDown={(e) => handleKeyDown(e, 'quantity')}
          aria-label="Quantity"
          placeholder="0"
          className={`${CELL_INPUT} text-right ${needsQuantity ? 'border-amber-400' : ''}`}
        />
      </td>
      <td className="py-2 align-top">
        <input
          ref={priceRef}
          type="text"
          inputMode="decimal"
          value={draft.unitPrice}
          onChange={(e) => {
            const val = e.target.value;
            if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) edit({ unitPrice: val });
          }}
          onKeyDown={(e) => handleKeyDown(e, 'unitPrice')}
          aria-label="Unit price"
          placeholder="0.00"
          className={`${CELL_INPUT} text-right`}
        />
      </td>
      <td className="py-3 text-right font-medium text-gray-900 align-top">
        {formatCurrency(quantity * unitPrice)}
      </td>
      <td className="py-2 align-top">
        <div className="flex items-center justify-end">
          {creating ? (
            <Loader2 className="w-4 h-4 text-gray-300 animate-spin" aria-label="Saving" />
          ) : item ? (
            <button
              type="button"
              onClick={() => propsRef.current.onDelete(item)}
              className="p-1 text-gray-300 group-hover/row:text-gray-500 focus:text-gray-500 hover:!text-red-600 transition-colors"
              title="Delete item"
              aria-label={`Delete ${item.description}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : isBlankRow ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => propsRef.current.onDiscardDraft(rowKey)}
              className="p-1 text-gray-300 group-hover/row:text-gray-500 focus:text-gray-500 hover:!text-red-600 transition-colors"
              title="Discard line item"
              aria-label="Discard line item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : null}
        </div>
      </td>
    </SortableRow>
  );
});

// ============================================================================
// SECTION
// ============================================================================

interface LineItemsSectionProps {
  estimate: Estimate;
  onUpdate: (options?: { showSuccess?: boolean }) => void | Promise<void>;
  /** Shared save queue from the page. Standalone callers get their own. */
  autosave?: EstimateAutosave;
  showTotals?: boolean;
}

const UNDO_WINDOW_MS = 5000;

const LineItemsSection: React.FC<LineItemsSectionProps> = ({
  estimate,
  onUpdate,
  showTotals = true,
  autosave: sharedAutosave
}) => {
  const { currentUser, canAccessFeature } = useAuthContext();
  const lineItemsSectionRef = useRef<HTMLDivElement>(null);
  const canUseInventoryPicker = canAccessFeature('estimates.inventoryPicker');
  const canUseCollectionPicker = canAccessFeature('estimates.collectionPicker');

  const ownAutosave = useEstimateAutosave(estimate.id, onUpdate);
  const autosave = sharedAutosave ?? ownAutosave;

  const isLineItemsLocked = Boolean(estimate.archivedAt);

  // Optimistic UI state for reordering and freshly created rows
  const [localLineItems, setLocalLineItems] = useState<LineItem[] | null>(null);

  // Drop optimistic rows once a refetch has landed, but never mid-save: a
  // background refetch must not undo a reorder that is still being written.
  React.useEffect(() => {
    if (autosave.status !== 'saving') setLocalLineItems(null);
  }, [estimate.id, estimate.lineItems, autosave.status]);

  // Inventory picker modal state
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);
  const [showCollectionImport, setShowCollectionImport] = useState(false);
  const [isImportingCollection, setIsImportingCollection] = useState(false);
  // Keep a key for a failed/lost-response retry of the exact same selection.
  // The server returns the prior committed operation instead of appending it.
  const bulkAppendOperationKeys = useRef(new Map<string, string>());

  // Loading states
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Error state (inventory / collection adds)
  const [error, setError] = useState<string | null>(null);

  // Rows are added only when requested. A draft keeps its React key when it
  // becomes a real item, so the input being typed never unmounts mid-edit.
  const [draftGeneration, setDraftGeneration] = useState(0);
  const [creating, setCreating] = useState<{ key: string; creating?: boolean; error?: string }[]>([]);
  const creatingRef = useRef(creating);
  const keyByItemId = useRef(new Map<string, string>());
  const [focusDraftKey, setFocusDraftKey] = useState<string | null>(null);
  const [liveByItemId, setLiveByItemId] = useState<Record<string, { quantity: number; unitPrice: number }>>({});

  // Deletes are held back briefly so Undo can cancel them without a server round trip.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<{ id: string; label: string }[]>([]);
  const pendingDeletes = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; item: LineItem }>());

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Determine items to display (prefer optimistic local state)
  const displayItems = localLineItems || estimate.lineItems || [];
  const visibleItems = useMemo(() => displayItems.filter(item => !hiddenIds.has(item.id)), [displayItems, hiddenIds]);

  // Totals follow what's typed in the rows, then reconcile with the server after each save.
  const calculations = useMemo(
    () => calculateEstimateTotals(
      visibleItems.map((item) => {
        const live = liveByItemId[item.id];
        return live ? { ...item, quantity: live.quantity, unitPrice: live.unitPrice, total: live.quantity * live.unitPrice } : item;
      }),
      estimate.discount || 0,
      estimate.discountType === 'percentage' ? 'percentage' : 'fixed',
      estimate.taxRate || 0
    ),
    [visibleItems, liveByItemId, estimate.discount, estimate.discountType, estimate.taxRate]
  );

  // Find duplicate line items
  const duplicateLineItemIds = useMemo(() => {
    return findDuplicateLineItems(visibleItems);
  }, [visibleItems]);

  // Latest values for the stable callbacks handed to rows.
  const latest = useRef({ estimateId: estimate.id, items: displayItems, currentUser, autosave });
  latest.current = { estimateId: estimate.id, items: displayItems, currentUser, autosave };

  const updateCreating = useCallback((update: (rows: { key: string; creating?: boolean; error?: string }[]) => { key: string; creating?: boolean; error?: string }[]) => {
    creatingRef.current = update(creatingRef.current);
    setCreating(creatingRef.current);
  }, []);

  // ============================================================================
  // HANDLERS - Add Items From Inventory
  // ============================================================================

  const handleAddItemsFromInventory = async (newItems: LineItem[]) => {
    if (!currentUser || !estimate.id || newItems.length === 0) return;

    setIsAddingItem(true);
    setError(null);

    try {
      const items = newItems.map(item => ({
        description: item.description, quantity: item.quantity, unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice, type: item.type, itemId: item.itemId,
        productId: item.productId, laborId: item.laborId, notes: item.notes,
        groupId: item.groupId, collectionId: item.collectionId, collectionName: item.collectionName,
      }));
      const operation = `inventory:${JSON.stringify(items)}`;
      const idempotencyKey = bulkAppendOperationKeys.current.get(operation) ?? crypto.randomUUID();
      bulkAppendOperationKeys.current.set(operation, idempotencyKey);
      const result = await bulkAppendLineItems(estimate.id, items, idempotencyKey);
      if (!result.success) throw new Error(result.error || 'Failed to add inventory items');
      onUpdate();
    } catch (err) {
      console.error('Error adding items from inventory:', err);
      const message = err instanceof Error ? err.message : 'Failed to add inventory items. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleImportSelectedCollection = async (newItems: LineItem[]) => {
    if (!currentUser || !estimate.id || newItems.length === 0) return;

    setIsImportingCollection(true);
    setError(null);

    try {
      const items = newItems.map(item => ({
        description: item.description, quantity: item.quantity, unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice, type: item.type, itemId: item.itemId,
        productId: item.productId, laborId: item.laborId, notes: item.notes,
        groupId: item.groupId, collectionId: item.collectionId, collectionName: item.collectionName,
      }));
      const operation = `collection:${JSON.stringify(items)}`;
      const idempotencyKey = bulkAppendOperationKeys.current.get(operation) ?? crypto.randomUUID();
      bulkAppendOperationKeys.current.set(operation, idempotencyKey);
      const result = await bulkAppendLineItems(estimate.id, items, idempotencyKey);
      if (!result.success) throw new Error(result.error || 'Failed to import collection items');
      onUpdate();
    } catch (err) {
      console.error('Error importing collection:', err);
      const message = err instanceof Error ? err.message : 'Failed to import collection items. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsImportingCollection(false);
    }
  };

  // ============================================================================
  // HANDLERS - Row saves (all writes go through the shared queue)
  // ============================================================================

  const saveRow = useCallback<LineItemRowProps['onSaveRow']>((itemId, getChange, onSaved) => {
    return latest.current.autosave.run(`li:${itemId}`, async () => {
      const { estimateId, currentUser: user } = latest.current;
      const change = getChange();
      if (!change || !estimateId) return { ok: true, skipped: true };
      const result = await updateLineItem(estimateId, itemId, change.patch, user?.uid ?? '', user?.displayName || 'Unknown User');
      if (!result.success) return { ok: false, message: result.error || 'Failed to update line item' };
      onSaved(change.snapshot);
      return { ok: true };
    });
  }, []);

  const createRow = useCallback<LineItemRowProps['onCreateRow']>(async (rowKey, values) => {
    const known = creatingRef.current.some(row => row.key === rowKey);
    if (!known) {
      updateCreating(rows => [...rows, { key: rowKey, creating: true }]);
    } else {
      updateCreating(rows => rows.map(row => (row.key === rowKey ? { ...row, creating: true, error: undefined } : row)));
    }

    const holder: { created: LineItem | null } = { created: null };
    await latest.current.autosave.run(`create:${rowKey}`, async () => {
      const { estimateId, currentUser: user } = latest.current;
      if (!estimateId) return { ok: false, message: 'Estimate not loaded' };
      const result = await addLineItem(
        estimateId,
        { ...values, total: values.quantity * values.unitPrice, type: values.type as LineItem['type'] },
        user?.uid ?? '',
        user?.displayName || 'Unknown User'
      );
      if (!result.success || !result.data) {
        const message = result.error || 'Failed to add line item';
        updateCreating(rows => rows.map(row => (row.key === rowKey ? { ...row, error: message } : row)));
        return { ok: false, message };
      }
      const created = result.data;
      holder.created = created;
      keyByItemId.current.set(created.id, rowKey);
      // Swap the in-flight row for the real item in one render.
      setLocalLineItems([...latest.current.items, created]);
      updateCreating(rows => rows.filter(row => row.key !== rowKey));
      return { ok: true };
    });
    return holder.created;
  }, [updateCreating]);

  const handleAddLineItem = () => {
    const rowKey = `new-${draftGeneration}`;
    setError(null);
    // Drafts are local until they have a description and a positive quantity.
    updateCreating(rows => [...rows, { key: rowKey }]);
    setDraftGeneration(generation => generation + 1);
    setFocusDraftKey(rowKey);
  };

  const handleDiscardDraft = useCallback((rowKey: string) => {
    updateCreating(rows => rows.filter(row => row.key !== rowKey));
  }, [updateCreating]);

  const handleLive = useCallback((itemId: string, live: { quantity: number; unitPrice: number } | null) => {
    setLiveByItemId((prev) => {
      if (!live) {
        if (!(itemId in prev)) return prev;
        const { [itemId]: _removed, ...rest } = prev;
        return rest;
      }
      const existing = prev[itemId];
      if (existing && existing.quantity === live.quantity && existing.unitPrice === live.unitPrice) return prev;
      return { ...prev, [itemId]: live };
    });
  }, []);

  // ============================================================================
  // HANDLERS - Delete with Undo
  // ============================================================================

  const commitDelete = useCallback((item: LineItem) => {
    pendingDeletes.current.delete(item.id);
    setToasts(prev => prev.filter(toast => toast.id !== item.id));
    void latest.current.autosave.run(`del:${item.id}`, async () => {
      const { estimateId, currentUser: user } = latest.current;
      if (!estimateId) return { ok: false, message: 'Estimate not loaded' };
      const result = await deleteLineItem(estimateId, item.id, user?.uid ?? '', user?.displayName || 'Unknown User');
      if (!result.success) {
        setHiddenIds(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
        return { ok: false, message: result.error || 'Failed to delete line item' };
      }
      return { ok: true };
    });
  }, []);

  const handleDelete = useCallback((item: LineItem) => {
    setHiddenIds(prev => new Set(prev).add(item.id));
    setToasts(prev => [...prev, { id: item.id, label: item.description }]);
    const timer = setTimeout(() => commitDelete(item), UNDO_WINDOW_MS);
    pendingDeletes.current.set(item.id, { timer, item });
  }, [commitDelete]);

  const handleUndoDelete = (itemId: string) => {
    const pendingDelete = pendingDeletes.current.get(itemId);
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timer);
    pendingDeletes.current.delete(itemId);
    setHiddenIds(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
    setToasts(prev => prev.filter(toast => toast.id !== itemId));
  };

  // Deletes still waiting out their Undo window are sent when the page goes away.
  const flushDeletes = useCallback(() => {
    Array.from(pendingDeletes.current.values()).forEach(({ timer, item }) => {
      clearTimeout(timer);
      commitDelete(item);
    });
  }, [commitDelete]);

  useEffect(() => {
    const unregister = latest.current.autosave.registerFlusher(flushDeletes);
    return () => {
      unregister();
      flushDeletes();
    };
  }, [flushDeletes]);

  // ============================================================================
  // HANDLERS - Reorder
  // ============================================================================

  const rows = useMemo(() => [
    ...visibleItems.map((item) => ({
      key: keyByItemId.current.get(item.id) ?? item.id,
      item,
      creating: false as const,
      error: undefined as string | undefined
    })),
    ...creating.map((row) => ({ key: row.key, item: null, creating: Boolean(row.creating), error: row.error }))
  ], [visibleItems, creating]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !estimate.id) return;

    const currentItems = [...visibleItems];
    const oldIndex = currentItems.findIndex(item => (keyByItemId.current.get(item.id) ?? item.id) === active.id);
    const newIndex = currentItems.findIndex(item => (keyByItemId.current.get(item.id) ?? item.id) === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedItems = arrayMove(currentItems, oldIndex, newIndex);

    // Optimistic update
    setLocalLineItems(reorderedItems);

    void autosave.run('reorder', async () => {
      const { estimateId, currentUser: user, items } = latest.current;
      if (!estimateId) return { ok: false, message: 'Estimate not loaded' };
      // Rows created while this waited in the queue keep their place at the end.
      const known = new Set(reorderedItems.map(item => item.id));
      const ordered = [...reorderedItems, ...items.filter(item => !known.has(item.id) && !hiddenIds.has(item.id))];
      const result = await reorderLineItems(estimateId, ordered, user?.uid ?? '', user?.displayName || 'Unknown User');
      if (!result.success) {
        setLocalLineItems(null); // Rollback
        return { ok: false, message: result.error || 'Failed to reorder items' };
      }
      return { ok: true };
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const actionColumns = 1 + (canUseInventoryPicker ? 1 : 0) + (canUseCollectionPicker ? 1 : 0);

  return (
    <div ref={lineItemsSectionRef} className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex min-h-8 items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
            <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {visibleItems.length} items
            </span>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Lock Warning */}
        {isLineItemsLocked && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-lg">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900 mb-1">Line Items Locked</h4>
                <p className="text-sm text-amber-800">
                  This document is archived, so it can no longer be edited.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Standalone use (no page-level indicator) still needs to surface failed saves. */}
        {!sharedAutosave && autosave.status === 'error' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {autosave.errorMessage || "Couldn't save your changes."}
            <button type="button" onClick={autosave.retry} className="ml-2 font-medium underline">Retry</button>
          </div>
        )}

        {/* Line Items Table */}
        <div className="overflow-x-auto mb-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="pb-3 w-8"></th>
                  <th className="pb-3 w-12 text-center">Type</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3 text-right w-20">Qty</th>
                  <th className="pb-3 text-right w-28">Unit Price</th>
                  <th className="pb-3 text-right w-28">Total</th>
                  {!isLineItemsLocked && <th className="pb-3 w-10"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <SortableContext
                  items={rows.map(row => row.key)}
                  strategy={verticalListSortingStrategy}
                >
                  {rows.map((row) => (
                    <LineItemRow
                      key={row.key}
                      rowKey={row.key}
                      item={row.item}
                      creating={row.creating}
                      createError={row.error}
                      locked={isLineItemsLocked}
                      duplicate={row.item ? duplicateLineItemIds.has(row.item.id) : false}
                      autoFocus={focusDraftKey === row.key}
                      registerFlusher={autosave.registerFlusher}
                      onFocused={() => setFocusDraftKey(null)}
                      onLive={handleLive}
                      onSaveRow={saveRow}
                      onCreateRow={createRow}
                      onDelete={handleDelete}
                      onDiscardDraft={handleDiscardDraft}
                      onRetry={autosave.retry}
                    />
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
        </div>

        {!isLineItemsLocked && (
          <div className={`grid gap-3 ${actionColumns === 3 ? 'grid-cols-1 sm:grid-cols-3' : actionColumns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            <button
              type="button"
              onClick={handleAddLineItem}
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-2 text-sm text-gray-600 transition-colors hover:border-orange-500 hover:text-orange-600"
            >
              <Plus className="w-4 h-4" />
              Add Line Item
            </button>

            {canUseInventoryPicker && (
              <button
                type="button"
                onClick={() => setShowInventoryPicker(true)}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-green-300 py-2 text-sm text-green-700 transition-colors hover:border-green-500 hover:bg-green-50 hover:text-green-800"
              >
                <Plus className="w-4 h-4" />
                Add From Inventory
              </button>
            )}

            {canUseCollectionPicker && (
              <button
                type="button"
                onClick={() => setShowCollectionImport(true)}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-indigo-300 py-2 text-sm text-indigo-700 transition-colors hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-800"
              >
                <Plus className="w-4 h-4" />
                Import Collection
              </button>
            )}
          </div>
        )}

        {/* Calculations */}
        {showTotals && <div className="mt-6 pt-6 border-t border-gray-200 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-900">
              {formatCurrency(calculations.subtotal)}
            </span>
          </div>

          {estimate.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Discount {estimate.discountType === 'percentage' ? `(${estimate.discount}%)` : ''}
              </span>
              <span className="font-medium text-red-600">
                -{formatCurrency(
                  estimate.discountType === 'percentage'
                    ? calculations.discountAmount
                    : estimate.discount
                )}
              </span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              Tax ({estimate.taxRate}%)
            </span>
            <span className="font-medium text-gray-900">
              {formatCurrency(calculations.tax)}
            </span>
          </div>

          <div className="pt-2 border-t border-gray-200">
            <div className="flex justify-between">
              <span className="text-base font-semibold text-gray-900">Total</span>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(calculations.total)}
              </span>
            </div>
          </div>
        </div>}
      </div>

      {canUseInventoryPicker && (
        <InventoryPickerModal
          isOpen={showInventoryPicker}
          onClose={() => setShowInventoryPicker(false)}
          onAddItems={handleAddItemsFromInventory}
        />
      )}

      {canUseCollectionPicker && (
        <CollectionImportModal
          isOpen={showCollectionImport}
          onClose={() => setShowCollectionImport(false)}
          onImport={handleImportSelectedCollection}
        />
      )}

      {isImportingCollection && (
        <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-[60] rounded-lg">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-2" />
            <p className="text-gray-600">Importing collection...</p>
          </div>
        </div>
      )}

      {isAddingItem && (
        <div className="sr-only" role="status">Adding items…</div>
      )}

      {/* Undo toasts for deleted rows */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 left-6 z-50 space-y-2" role="status" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className="flex items-center gap-3 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
              <span className="max-w-[16rem] truncate">Deleted “{toast.label || 'item'}”</span>
              <button
                type="button"
                onClick={() => handleUndoDelete(toast.id)}
                className="font-medium text-orange-300 underline hover:text-orange-200"
              >
                Undo
              </button>
            </div>
          ))}
        </div>
      )}
      <LineItemsToBottomButton sectionRef={lineItemsSectionRef} />
    </div>
  );
};

export default LineItemsSection;
