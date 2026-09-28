// src/mainComponents/forms/useAutosaveField.ts
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/** Outcome of a save. `revert` means the server rejected the change for good (e.g. a lock). */
export interface SaveResult {
  ok: boolean;
  message?: string;
  revert?: boolean;
  /** Set on a failure that retrying cannot fix (the change was reverted). */
  retryable?: boolean;
  /** Nothing was sent, so no refetch or "Saved" flash is needed. */
  skipped?: boolean;
}

/** Lets fields hand the page a "commit if dirty" callback for beforeunload / unmount. */
export const AutosaveRegistryContext = createContext<((flush: () => void) => () => void) | null>(null);

interface UseAutosaveFieldOptions {
  /** The server's current value, as a string. */
  value: string;
  onCommit: (next: string) => Promise<SaveResult | void> | SaveResult | void;
  disabled?: boolean;
  /** Runs on commit; the returned string is what gets saved and shown. */
  normalize?: (draft: string) => string;
  /** Return a message to reject the draft; the field reverts to its last saved value. */
  validate?: (next: string) => string | null;
  /** Textareas keep Enter for new lines. */
  multiline?: boolean;
  /** Commit this long after the last keystroke, in addition to blur (date inputs). */
  debounceMs?: number;
}

export interface AutosaveField {
  draft: string;
  error: string | null;
  /** True when the message came from a failed save, so Retry makes sense. */
  canRetry: boolean;
  setDraft: (next: string) => void;
  commit: () => void;
  /** Set the draft and commit immediately (selects, buttons, pickers). */
  commitValue: (next: string) => void;
  retry: () => void;
  inputProps: {
    value: string;
    onChange: (e: { target: { value: string } }) => void;
    onFocus: () => void;
    onBlur: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
  };
}

/**
 * Local draft + commit-on-blur for one field.
 *
 * - Skips the save when the draft equals the last saved value.
 * - Adopts a new server `value` only when the field is neither focused nor dirty,
 *   so a background refetch can't overwrite what someone is typing.
 * - An edit made while a save is in flight is saved afterwards, and a response
 *   never overwrites a newer draft.
 */
export function useAutosaveField({
  value,
  onCommit,
  disabled = false,
  normalize,
  validate,
  multiline = false,
  debounceMs,
}: UseAutosaveFieldOptions): AutosaveField {
  const [draft, setDraftState] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);

  const draftRef = useRef(value);
  const savedRef = useRef(value);
  const valueRef = useRef(value);
  const focusedRef = useRef(false);
  const inflightRef = useRef(false);
  const queuedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest options, read from async callbacks.
  const optsRef = useRef({ onCommit, disabled, normalize, validate });
  optsRef.current = { onCommit, disabled, normalize, validate };
  valueRef.current = value;

  const setDraft = useCallback((next: string) => {
    draftRef.current = next;
    setDraftState(next);
  }, []);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Adopt the server value when nothing local is at stake.
  const syncFromServer = useCallback(() => {
    if (focusedRef.current || inflightRef.current) return;
    // The server already has this draft (e.g. the page-level Retry succeeded).
    if (valueRef.current === draftRef.current && savedRef.current !== draftRef.current) {
      savedRef.current = valueRef.current;
      setError(null);
      setCanRetry(false);
      return;
    }
    if (draftRef.current !== savedRef.current) return;
    savedRef.current = valueRef.current;
    setDraft(valueRef.current);
  }, [setDraft]);

  useEffect(() => {
    syncFromServer();
  }, [value, syncFromServer]);

  const commit = useCallback(async (override?: string) => {
    const { onCommit: save, disabled: off, normalize: norm, validate: check } = optsRef.current;
    clearTimer();
    if (off) return;

    let next = override ?? draftRef.current;
    if (norm) next = norm(next);
    if (next !== draftRef.current) setDraft(next);

    if (next === savedRef.current) {
      setError(null);
      return;
    }
    const invalid = check?.(next);
    if (invalid) {
      setError(invalid);
      setCanRetry(false);
      setDraft(savedRef.current);
      return;
    }
    if (inflightRef.current) {
      queuedRef.current = true;
      return;
    }

    inflightRef.current = true;
    setError(null);
    let result: SaveResult | void;
    try {
      result = await save(next);
    } catch (err) {
      result = { ok: false, message: err instanceof Error ? err.message : "Couldn't save" };
    }
    inflightRef.current = false;

    if (!result || result.ok !== false) {
      savedRef.current = next;
      setError(null);
      if (queuedRef.current) {
        queuedRef.current = false;
        void commit();
      } else {
        syncFromServer();
      }
    } else {
      queuedRef.current = false;
      setError(result.message || "Couldn't save");
      if (result.revert) {
        setCanRetry(false);
        setDraft(savedRef.current);
      } else {
        // Keep the draft on screen, marked unsaved, until it is retried or edited.
        setCanRetry(true);
      }
    }
  }, [setDraft, syncFromServer]);

  const onChange = useCallback((e: { target: { value: string } }) => {
    setDraft(e.target.value);
    setError(null);
    if (debounceMs) {
      clearTimer();
      timerRef.current = setTimeout(() => void commit(), debounceMs);
    }
  }, [commit, debounceMs, setDraft]);

  const onBlur = useCallback(() => {
    focusedRef.current = false;
    void commit().then(syncFromServer);
  }, [commit, syncFromServer]);

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline && !e.nativeEvent.isComposing) {
      void commit();
    } else if (e.key === 'Escape') {
      clearTimer();
      setDraft(savedRef.current);
      setError(null);
    }
  }, [commit, multiline, setDraft]);

  // Save whatever is still dirty when the page goes away.
  const registry = useContext(AutosaveRegistryContext);
  useEffect(() => {
    const flush = () => {
      if (!optsRef.current.disabled && draftRef.current !== savedRef.current) void commit();
    };
    const unregister = registry?.(flush);
    return () => {
      unregister?.();
      clearTimer();
      flush();
    };
  }, [registry, commit]);

  return {
    draft,
    error,
    canRetry,
    setDraft,
    commit: () => void commit(),
    commitValue: (next: string) => {
      setDraft(next);
      void commit(next);
    },
    retry: () => void commit(),
    inputProps: {
      value: draft,
      onChange,
      onFocus: () => { focusedRef.current = true; },
      onBlur,
      onKeyDown,
    },
  };
}
