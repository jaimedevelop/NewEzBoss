import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { updateEstimate } from '../../../../../services/estimates';
import type { SaveResult } from '../../../../../mainComponents/forms/useAutosaveField';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type Refetch = (options: { showSuccess: false }) => void | Promise<void>;

export interface EstimateAutosave {
  status: SaveStatus;
  errorMessage: string | null;
  /** Coalesces same-tick field changes into one PATCH /estimates/:id. */
  save: (patch: Record<string, unknown>) => Promise<SaveResult>;
  /** Queue any other write (line items, uploads, reorder) behind the ones already running. */
  run: (key: string, task: () => Promise<SaveResult>) => Promise<SaveResult>;
  retry: () => void;
  /** Sends everything that is still dirty right now. */
  flush: () => Promise<void>;
  isBusy: () => boolean;
  registerFlusher: (flush: () => void) => () => void;
}

/**
 * Serializes every write for one estimate so two requests can never race on the
 * server's row lock and finish out of order, then refetches once the queue drains.
 */
export function useEstimateAutosave(estimateId: string | undefined, onUpdate: Refetch): EstimateAutosave {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const idRef = useRef(estimateId);
  idRef.current = estimateId;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);
  const refetching = useRef(false);
  const needsRefetch = useRef(false);
  const savedSomething = useRef(false);
  const mounted = useRef(true);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patchBuffer = useRef<Record<string, unknown>>({});
  const patchWaiters = useRef<Array<(result: SaveResult) => void>>([]);
  const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Failures wait here for Retry. Estimate PATCHes merge into one entry.
  const failedTasks = useRef(new Map<string, () => Promise<SaveResult>>());
  const failedPatch = useRef<Record<string, unknown>>({});
  const lastError = useRef<string | null>(null);
  const flushers = useRef(new Set<() => void>());

  const hasFailures = () => failedTasks.current.size > 0 || Object.keys(failedPatch.current).length > 0;

  const finish = useCallback(async () => {
    if (needsRefetch.current) {
      needsRefetch.current = false;
      refetching.current = true;
      try {
        await onUpdateRef.current({ showSuccess: false });
      } catch (err) {
        console.error('Error refreshing estimate after save:', err);
      }
      refetching.current = false;
    }
    if (pending.current > 0 || !mounted.current) return;
    if (hasFailures()) {
      setStatus('error');
      setErrorMessage(lastError.current);
    } else if (savedSomething.current) {
      savedSomething.current = false;
      setStatus('saved');
      setErrorMessage(null);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setStatus(s => (s === 'saved' ? 'idle' : s)), 2500);
    } else {
      // Only rejected (reverted) or no-op work: nothing to announce.
      setStatus('idle');
      setErrorMessage(null);
    }
  }, []);

  const run = useCallback((key: string, task: () => Promise<SaveResult>): Promise<SaveResult> => {
    pending.current += 1;
    if (mounted.current) {
      if (savedTimer.current) clearTimeout(savedTimer.current);
      setStatus('saving');
    }
    const result = chain.current.then(async (): Promise<SaveResult> => {
      let outcome: SaveResult;
      try {
        outcome = await task();
      } catch (err) {
        outcome = { ok: false, message: err instanceof Error ? err.message : "Couldn't save" };
      }
      if (outcome.ok) {
        failedTasks.current.delete(key);
        if (!outcome.skipped) {
          needsRefetch.current = true;
          savedSomething.current = true;
        }
      } else {
        // A rejected-for-good change (lock/conflict) is reverted, not retried, but the
        // page still refetches so locked fields show their real state.
        if (outcome.retryable !== false && !outcome.revert) {
          failedTasks.current.set(key, task);
          lastError.current = outcome.message ?? "Couldn't save";
        } else {
          needsRefetch.current = true;
        }
      }
      pending.current -= 1;
      if (pending.current === 0) void finish();
      return outcome;
    });
    chain.current = result;
    return result;
  }, [finish]);

  const flushPatch = useCallback(() => {
    if (patchTimer.current) {
      clearTimeout(patchTimer.current);
      patchTimer.current = null;
    }
    const patch = patchBuffer.current;
    const waiters = patchWaiters.current;
    patchBuffer.current = {};
    patchWaiters.current = [];
    if (Object.keys(patch).length === 0) {
      waiters.forEach(resolve => resolve({ ok: true, skipped: true }));
      return;
    }

    void run('patch', async () => {
      const id = idRef.current;
      let outcome: SaveResult;
      if (!id) {
        outcome = { ok: false, message: 'Estimate not loaded' };
      } else {
        const response = await updateEstimate(id, patch);
        if (response.success) {
          Object.keys(patch).forEach(field => delete failedPatch.current[field]);
          outcome = { ok: true };
        } else {
          const message = response.error?.message || "Couldn't save";
          // 409 = locked/accepted (or archived): the field reverts. A duplicate
          // estimate number is also 409 but stays editable so it can be fixed.
          const revert = response.error?.status === 409 && !/already in use/i.test(message);
          if (revert) {
            Object.keys(patch).forEach(field => delete failedPatch.current[field]);
          } else {
            failedPatch.current = { ...failedPatch.current, ...patch };
          }
          outcome = { ok: false, message, revert, retryable: !revert };
        }
      }
      waiters.forEach(resolve => resolve(outcome));
      // The merged failedPatch (not this closure) is what Retry sends.
      if (!outcome.ok && !outcome.revert) lastError.current = outcome.message ?? null;
      return outcome.ok || outcome.revert ? outcome : { ...outcome, retryable: false };
    });
  }, [run]);

  const save = useCallback((patch: Record<string, unknown>) => new Promise<SaveResult>((resolve) => {
    patchBuffer.current = { ...patchBuffer.current, ...patch };
    patchWaiters.current.push(resolve);
    if (!patchTimer.current) patchTimer.current = setTimeout(flushPatch, 0);
  }), [flushPatch]);

  const retry = useCallback(() => {
    const merged = failedPatch.current;
    failedPatch.current = {};
    const tasks = Array.from(failedTasks.current.entries());
    failedTasks.current.clear();
    tasks.forEach(([key, task]) => void run(key, task));
    if (Object.keys(merged).length > 0) void save(merged);
  }, [run, save]);

  const registerFlusher = useCallback((flush: () => void) => {
    flushers.current.add(flush);
    return () => { flushers.current.delete(flush); };
  }, []);

  const flush = useCallback(async () => {
    flushers.current.forEach(fn => fn());
    flushPatch();
    await chain.current;
  }, [flushPatch]);

  useEffect(() => {
    mounted.current = true;
    // beforeunload can't wait on the network, so send what's dirty and ask the
    // browser to hold the page if anything is still unsaved.
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      flushers.current.forEach(fn => fn());
      flushPatch();
      if (pending.current > 0 || hasFailures()) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      // Switching dashboard tabs unmounts us: send anything still dirty. The
      // requests keep running and the dashboard refetches when they finish.
      flushers.current.forEach(fn => fn());
      setTimeout(flushPatch, 0);
      mounted.current = false;
    };
  }, [flushPatch]);

  return useMemo(() => ({
    status,
    errorMessage,
    save,
    run,
    retry,
    flush,
    isBusy: () => pending.current > 0 || refetching.current,
    registerFlusher,
  }), [status, errorMessage, save, run, retry, flush, registerFlusher]);
}
