// src/hooks/useAutoSave.ts
import { useState, useEffect, useRef, useCallback } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  localStorageKey?: string;
  enabled?: boolean;
  onSaveStart?: () => void;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  saveError: string | null;
  forceSave: () => Promise<void>;
  clearError: () => void;
  cancelPendingSave: () => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  hasPendingChanges: boolean; // ✅ NEW: Tracks unsaved changes OR active debounce timer
}

/**
 * Enhanced hook for auto-saving data with debouncing and localStorage backup
 * 
 * NEW FEATURES:
 * - Blur/Enter trigger support
 * - Manual save cancellation
 * - Unsaved changes tracking
 * - Better error handling
 * - Optimistic updates support
 * - Mutex lock support (isSaving flag)
 * - Pending changes detection (hasPendingChanges flag)
 * 
 * @param data - The data to save
 * @param onSave - Async function that saves the data
 * @param debounceMs - Milliseconds to wait before saving (default: 300)
 * @param localStorageKey - Key for localStorage backup (optional)
 * @param enabled - Whether auto-save is enabled (default: true)
 * @param onSaveStart - Callback when save starts
 * @param onSaveSuccess - Callback when save succeeds
 * @param onSaveError - Callback when save fails
 */
export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 300,
  localStorageKey,
  enabled = true,
  onSaveStart,
  onSaveSuccess,
  onSaveError,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const lastSavedDataRef = useRef<string>(JSON.stringify(data));
  const mountedRef = useRef(true);

  // Save to localStorage as backup
  const saveToLocalStorage = useCallback(() => {
    if (localStorageKey && typeof window !== 'undefined') {
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
    }
  }, [data, localStorageKey]);

  // Actual save function
  const performSave = useCallback(async () => {
    if (isSavingRef.current || !mountedRef.current) return;
    
    const currentDataString = JSON.stringify(data);
    
    // Don't save if data hasn't changed
    if (currentDataString === lastSavedDataRef.current) {
      if (mountedRef.current) {
        setSaveStatus('saved');
        setHasUnsavedChanges(false);
        setIsSaving(false);
      }
      return;
    }

    isSavingRef.current = true;
    if (mountedRef.current) {
      setSaveStatus('saving');
      setSaveError(null);
      setIsSaving(true);
    }

    // Call optional callback
    onSaveStart?.();

    try {
      await onSave(data);
      
      if (mountedRef.current) {
        lastSavedDataRef.current = currentDataString;
        setHasUnsavedChanges(false);
        setSaveStatus('saved');
        setIsSaving(false);
        
        // Call success callback
        onSaveSuccess?.();
        
        // Clear saved status after 2 seconds
        setTimeout(() => {
          if (mountedRef.current) {
            setSaveStatus('idle');
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to save';
      
      if (mountedRef.current) {
        setSaveStatus('error');
        setSaveError(errorMessage);
        setIsSaving(false);
      }
      
      // Call error callback
      onSaveError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      isSavingRef.current = false;
    }
  }, [data, onSave, onSaveStart, onSaveSuccess, onSaveError]);

  // Force save (for manual save buttons or blur events)
  const forceSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    await performSave();
  }, [performSave]);

  // Cancel pending save
  const cancelPendingSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setSaveError(null);
    if (saveStatus === 'error') {
      setSaveStatus('idle');
    }
  }, [saveStatus]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!enabled) return;

    const currentDataString = JSON.stringify(data);
    
    // Check if data has changed
    if (currentDataString !== lastSavedDataRef.current) {
      setHasUnsavedChanges(true);
      
      // Save to localStorage immediately for backup
      saveToLocalStorage();
      
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set new timeout for Firebase save
      saveTimeoutRef.current = setTimeout(() => {
        performSave();
      }, debounceMs);
    }

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, enabled, debounceMs, performSave, saveToLocalStorage]);

  // Save before unload if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && enabled) {
        // Try to save to localStorage one last time
        saveToLocalStorage();
        
        // Show browser warning
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, enabled, saveToLocalStorage]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Load from localStorage on mount (if needed)
  useEffect(() => {
    if (localStorageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(localStorageKey);
      if (saved) {
        console.log('Found saved data in localStorage for key:', localStorageKey);
      }
    }
  }, [localStorageKey]);

  // ✅ NEW: Calculate hasPendingChanges - true if unsaved changes OR debounce timer active
  const hasPendingChanges = hasUnsavedChanges || saveTimeoutRef.current !== null;

  return {
    saveStatus,
    saveError,
    forceSave,
    clearError,
    cancelPendingSave,
    hasUnsavedChanges,
    isSaving,
    hasPendingChanges, // ✅ NEW: Exposes pending state
  };
}