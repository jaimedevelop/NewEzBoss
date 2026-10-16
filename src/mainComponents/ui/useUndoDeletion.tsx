import { useCallback, useEffect, useRef, useState } from 'react';
import ModalPortal from './ModalPortal';

/** Match the five-second undo window used by estimate line items. */
export function useUndoDeletion() {
  const pending = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; undo: () => void; commit: () => void }>());
  const [toasts, setToasts] = useState<{ id: string; label: string }[]>([]);
  const flush = useCallback(() => {
    const deletions = [...pending.current.values()];
    pending.current.clear();
    setToasts([]);
    deletions.forEach(({ timer, commit }) => { clearTimeout(timer); commit(); });
  }, []);
  useEffect(() => flush, [flush]);

  const enqueue = (id: string, label: string, undo: () => void, commit: () => void = () => {}) => {
    if (pending.current.has(id)) return;
    const timer = setTimeout(() => {
      pending.current.delete(id);
      setToasts(current => current.filter(toast => toast.id !== id));
      commit();
    }, 5000);
    pending.current.set(id, { timer, undo, commit });
    setToasts(current => [...current, { id, label }]);
  };
  const notification = toasts.length > 0 ? (
    <ModalPortal>
      <div className="fixed bottom-6 left-6 z-[100] space-y-2" role="status" aria-live="polite">
        {toasts.map(toast => (
          <div key={toast.id} className="flex items-center gap-3 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
            <span className="max-w-[16rem] truncate">Deleted “{toast.label || 'item'}”</span>
            <button type="button" className="font-medium text-orange-300 underline hover:text-orange-200" onClick={() => {
              const deletion = pending.current.get(toast.id);
              if (!deletion) return;
              clearTimeout(deletion.timer);
              pending.current.delete(toast.id);
              setToasts(current => current.filter(item => item.id !== toast.id));
              deletion.undo();
            }}>Undo</button>
          </div>
        ))}
      </div>
    </ModalPortal>
  ) : null;
  return { enqueue, flush, notification };
}
