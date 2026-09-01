import { useEffect, useRef, useState } from 'react';

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<{ success: boolean } | void>;
  delay?: number;
  enabled?: boolean;
}

export function useAutoSave<T>({ data, onSave, delay = 1000, enabled = true }: UseAutoSaveOptions<T>) {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRun = useRef(true);
  const dataRef = useRef(data);
  const onSaveRef = useRef(onSave);
  const enabledRef = useRef(enabled);
  const lastSavedRef = useRef(data);
  dataRef.current = data;
  onSaveRef.current = onSave;
  enabledRef.current = enabled;

  const save = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (!enabledRef.current) return;
    if (JSON.stringify(dataRef.current) === JSON.stringify(lastSavedRef.current)) return;

    setStatus('saving');
    try {
      const result = await onSaveRef.current(dataRef.current);
      if (result && 'success' in result && !result.success) {
        setStatus('error');
        return;
      }
      lastSavedRef.current = dataRef.current;
      setStatus('saved');
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      lastSavedRef.current = data;
      return;
    }

    if (!enabled) return;
    if (JSON.stringify(data) === JSON.stringify(lastSavedRef.current)) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      save();
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, delay, enabled]);

  return { status, flush: save };
}
