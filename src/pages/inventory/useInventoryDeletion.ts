import { useSyncExternalStore } from 'react';
import { companyCacheScope } from '../../services/companySession';

type InventoryKind = 'products' | 'labor' | 'equipment' | 'tools';
const listeners = new Set<() => void>();
const empty = new Set<string>();
let scope = '';
const hiddenByKind = new Map<InventoryKind, Set<string>>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function publish(kind: InventoryKind, hidden: Set<string>) {
  hiddenByKind.set(kind, hidden);
  listeners.forEach(listener => listener());
}

export function useInventoryDeletion(kind: InventoryKind, remove: (id: string) => Promise<{ success: boolean; error?: unknown }>) {
  const company = companyCacheScope();
  const hidden = useSyncExternalStore(subscribe, () => scope === company ? hiddenByKind.get(kind) ?? empty : empty);

  function deleteItem(id: string, label: string) {
    if (company !== companyCacheScope()) return;
    if (scope !== company) {
      hiddenByKind.clear();
      scope = company;
    }
    const current = hiddenByKind.get(kind) ?? empty;
    if (current.has(id) || !window.confirm(`Delete this ${label}? This action cannot be undone.`)) return;
    publish(kind, new Set([...current, id]));

    // Keep confirmed IDs hidden too: a list request issued before DELETE can
    // still return the old row, even after the server has confirmed deletion.
    void (async () => {
      let message = '';
      try {
        const result = await remove(id);
        if (result.success) return;
        if (typeof result.error === 'string') message = result.error;
      } catch (error) {
        if (error instanceof Error) message = error.message;
      }
      if (company !== companyCacheScope()) return;
      const remaining = new Set(hiddenByKind.get(kind));
      remaining.delete(id);
      publish(kind, remaining);
      window.alert(`Could not delete this ${label}. ${message || 'Please try again.'}`);
    })();
  }

  return { hidden, deleteItem };
}
