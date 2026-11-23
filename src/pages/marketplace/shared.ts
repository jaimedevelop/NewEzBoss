import { useEffect } from 'react';
import { MarketplaceApiError, type RequestState } from '../../services/marketplace';

export const fieldClass = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500';
export const primaryClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 px-5 py-2.5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-50';
export const secondaryClass = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600 disabled:opacity-50';
export const panelClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7';
export const stateLabels: Record<RequestState, string> = { draft: 'Draft', submitted: 'Submitted', under_review: 'Under review', withdrawn: 'Withdrawn', declined: 'Declined', converted: 'Contractor estimate created' };
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
export function isConflict(error: unknown) { return error instanceof MarketplaceApiError && error.status === 409; }

export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const link = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (element && !window.confirm('You have unsaved changes. Leave this page?')) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener('beforeunload', unload); document.addEventListener('click', link, true);
    return () => { window.removeEventListener('beforeunload', unload); document.removeEventListener('click', link, true); };
  }, [dirty]);
}
