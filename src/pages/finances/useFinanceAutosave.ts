import { useCallback, useEffect, useRef, useState } from 'react';
import { clientsApiRequest as request } from '../../services/clients/clientsApi';
import { columns, type LedgerRow, type RowData } from './ledger';

type Drafts = Record<string, LedgerRow>;
export function useFinanceAutosave(scope: string, enabled: boolean) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [storageFailed, setStorageFailed] = useState(false);
  const [savedRows, setSavedRows] = useState<LedgerRow[]>([]);
  const [revision, setRevision] = useState(0);
  const drafts = useRef<Drafts>({});
  const generation = useRef(0);
  const inFlight = useRef(false);
  const key = `ezboss:finance-drafts:${scope}`;
  const persist = useCallback(() => {
    try { localStorage.setItem(key, JSON.stringify(drafts.current)); setStorageFailed(false); }
    catch { setStorageFailed(true); }
  }, [key]);
  useEffect(() => {
    const token = ++generation.current;
    setSavedRows([]);
    inFlight.current = false;
    try {
      const stored = JSON.parse(localStorage.getItem(key) || '{}');
      if (!stored || typeof stored !== 'object' || Array.isArray(stored) || Object.entries(stored).some(([id, row]) => {
        const draft = row as LedgerRow;
        return !draft || draft.id !== id || !Number.isInteger(draft.version) || draft.version < 0 || !draft.data || columns.some(([field]) => typeof draft.data[field] !== 'string');
      })) throw new Error('Invalid local drafts');
      drafts.current = stored;
    }
    catch { drafts.current = {}; setStorageFailed(true); }
    setStatus(Object.keys(drafts.current).length ? 'saving' : 'idle');
    setRevision(value => value + 1);
    return () => { generation.current = token + 1; };
  }, [key]);
  useEffect(() => {
    if (!enabled || status === 'failed' || inFlight.current || !Object.keys(drafts.current).length) return;
    const token = generation.current;
    const timer = window.setTimeout(async () => {
      inFlight.current = true; setStatus('saving');
      try {
        for (const snapshot of Object.values(drafts.current)) {
          if (token !== generation.current) return;
          let saved: LedgerRow;
          if (snapshot.version === 0) {
            const created = await request<LedgerRow[]>('/finance-records', { method: 'POST', body: JSON.stringify({ records: [{ id: snapshot.id, data: snapshot.data }] }) });
            // A previous POST may have succeeded even if its response was lost.
            const existing = created[0] ?? (await request<LedgerRow[]>('/finance-records')).find(row => row.id === snapshot.id);
            if (!existing) throw new Error('Created row unavailable');
            saved = JSON.stringify(existing.data) === JSON.stringify(snapshot.data) ? existing : await request<LedgerRow>(`/finance-records/${snapshot.id}`, { method: 'PUT', body: JSON.stringify({ data: snapshot.data, version: existing.version }) });
          } else {
            saved = await request<LedgerRow>(`/finance-records/${snapshot.id}`, { method: 'PUT', body: JSON.stringify({ data: snapshot.data, version: snapshot.version }) });
          }
          if (token !== generation.current) return;
          const latest = drafts.current[snapshot.id];
          if (latest && JSON.stringify(latest.data) === JSON.stringify(snapshot.data)) delete drafts.current[snapshot.id];
          else if (latest) drafts.current[snapshot.id] = { ...latest, version: saved.version };
          persist();
          setSavedRows(previous => [...previous.filter(row => row.id !== saved.id), saved]);
        }
        setStatus(Object.keys(drafts.current).length ? 'saving' : 'saved');
      } catch { if (token === generation.current) setStatus('failed'); }
      finally {
        if (token === generation.current) { inFlight.current = false; setRevision(value => value + 1); }
      }
    }, 650);
    return () => window.clearTimeout(timer);
  // A failed batch waits for an edit, explicit retry, or connectivity restoration.
  }, [revision, enabled, persist, status]);
  const retry = useCallback(() => { setStatus('saving'); setRevision(value => value + 1); }, []);
  useEffect(() => { window.addEventListener('online', retry); return () => window.removeEventListener('online', retry); }, [retry]);
  function change(row: LedgerRow, data: RowData) {
    drafts.current[row.id] = { ...row, version: drafts.current[row.id]?.version ?? row.version, data };
    persist(); setStatus('saving'); setRevision(value => value + 1);
  }
  return { status, storageFailed, drafts: drafts.current, savedRows, change, retry, forget: (id: string) => setSavedRows(previous => previous.filter(row => row.id !== id)) };
}
