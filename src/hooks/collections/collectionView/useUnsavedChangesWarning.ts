// src/hooks/collections/collectionView/useUnsavedChangesWarning.ts
import { useState, useEffect, useCallback } from 'react';
import { CollectionContentType } from '../../../services/collections';

interface UnsavedChangesState {
  products: boolean;
  labor: boolean;
  tools: boolean;
  equipment: boolean;
}

export interface UseUnsavedChangesWarningResult {
  unsavedChanges: UnsavedChangesState;
  hasAnyUnsavedChanges: boolean;
  handleUnsavedChanges: (hasChanges: boolean, contentType: CollectionContentType) => void;
  checkBeforeLeaving: () => boolean;
}

/**
 * Manages unsaved changes tracking and browser warning.
 * Prevents accidental navigation away with unsaved changes.
 */
export const useUnsavedChangesWarning = (): UseUnsavedChangesWarningResult => {
  const [unsavedChanges, setUnsavedChanges] = useState<UnsavedChangesState>({
    products: false,
    labor: false,
    tools: false,
    equipment: false,
  });

  const hasAnyUnsavedChanges = Object.values(unsavedChanges).some(v => v);

  const handleUnsavedChanges = useCallback((hasChanges: boolean, contentType: CollectionContentType) => {
    setUnsavedChanges(prev => ({
      ...prev,
      [contentType]: hasChanges,
    }));
  }, []);

  const checkBeforeLeaving = useCallback((): boolean => {
    if (hasAnyUnsavedChanges) {
      return window.confirm('You have unsaved changes. Are you sure you want to leave?');
    }
    return true;
  }, [hasAnyUnsavedChanges]);

  // Browser beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasAnyUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasAnyUnsavedChanges]);

  return {
    unsavedChanges,
    hasAnyUnsavedChanges,
    handleUnsavedChanges,
    checkBeforeLeaving,
  };
};