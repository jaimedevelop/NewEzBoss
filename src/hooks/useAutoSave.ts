import { useCallback, useRef, useState } from 'react';

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<{ success: boolean } | void>;
  enabled?: boolean;
}

export function useAutoSave<T>({ data, onSave, enabled = true }: UseAutoSaveOptions<T>) {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const dataRef = useRef(data);
  const onSaveRef = useRef(onSave);
  const enabledRef = useRef(enabled);
  const lastSavedRef = useRef(data);
  dataRef.current = data;
  onSaveRef.current = onSave;
  enabledRef.current = enabled;

  // Values loaded from the server are already saved, not user edits.
  const resetBaseline = useCallback((loadedData: T) => {
    lastSavedRef.current = loadedData;
    setStatus('idle');
  }, []);

  const save = async (savingData: T) => {
    if (!enabledRef.current) return;
    if (JSON.stringify(savingData) === JSON.stringify(lastSavedRef.current)) return;

    setStatus('saving');
    try {
      const result = await onSaveRef.current(savingData);
      if (result && 'success' in result && !result.success) {
        setStatus('error');
        return;
      }
      lastSavedRef.current = savingData;
      setStatus('saved');
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
    } catch {
      setStatus('error');
    }
  };

  // Saving is explicit: fields flush on blur, never on a typing timer.
  return { status, flush: () => save(dataRef.current), saveData: save, resetBaseline };
}
