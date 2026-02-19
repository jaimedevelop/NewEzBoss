// src/hooks/collections/collectionView/useUnsavedChangesWarning.ts
import { useState, useEffect, useCallback } from 'react';
import { CollectionContentType } from '../../../services/collections';

interface UnsavedChangesState {
  products: boolean;
  labor: boolean;
  tools: boolean;
  equipment: boolean;
}

type PendingDeletionsState = Record<CollectionContentType, Set<string>>;

export interface UseUnsavedChangesWarningResult {
  unsavedChanges: UnsavedChangesState;
  hasAnyUnsavedChanges: boolean;
  handleUnsavedChanges: (hasChanges: boolean, contentType: CollectionContentType) => void;
  checkBeforeLeaving: () => boolean;
  // Pending deletions
  pendingDeletions: PendingDeletionsState;
  togglePendingDeletion: (contentType: CollectionContentType, tabId: string) => void;
  clearPendingDeletions: (contentType: CollectionContentType) => void;
  hasPendingDeletions: (contentType: CollectionContentType) => boolean;
}

export const useUnsavedChangesWarning = (): UseUnsavedChangesWarningResult => {
  const [unsavedChanges, setUnsavedChanges] = useState<UnsavedChangesState>({
    products: false,
    labor: false,
    tools: false,
    equipment: false,
  });

  const [pendingDeletions, setPendingDeletions] = useState<PendingDeletionsState>({
    products: new Set(),
    labor: new Set(),
    tools: new Set(),
    equipment: new Set(),
  });

  const hasPendingDeletions = useCallback((contentType: CollectionContentType): boolean => {
    return pendingDeletions[contentType].size > 0;
  }, [pendingDeletions]);

  const hasAnyUnsavedChanges =
    Object.values(unsavedChanges).some(v => v) ||
    Object.values(pendingDeletions).some(s => s.size > 0);

  const handleUnsavedChanges = useCallback((hasChanges: boolean, contentType: CollectionContentType) => {
    setUnsavedChanges(prev => ({
      ...prev,
      [contentType]: hasChanges,
    }));
  }, []);

  const togglePendingDeletion = useCallback((contentType: CollectionContentType, tabId: string) => {
    setPendingDeletions(prev => {
      const current = new Set(prev[contentType]);
      if (current.has(tabId)) {
        current.delete(tabId);
      } else {
        current.add(tabId);
      }
      return { ...prev, [contentType]: current };
    });
  }, []);

  const clearPendingDeletions = useCallback((contentType: CollectionContentType) => {
    setPendingDeletions(prev => ({ ...prev, [contentType]: new Set() }));
  }, []);

  const checkBeforeLeaving = useCallback((): boolean => {
    if (hasAnyUnsavedChanges) {
      return window.confirm('You have unsaved changes. Are you sure you want to leave?');
    }
    return true;
  }, [hasAnyUnsavedChanges]);

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
    pendingDeletions,
    togglePendingDeletion,
    clearPendingDeletions,
    hasPendingDeletions,
  };
};