import { useEffect } from 'react';
import { getPublicEstimate } from '../services/clients/publicEstimate';
import type { EstimateWithId } from '../services/estimates/estimates.types';

/** Keep an open client document current without recording another visit. */
export function usePublicEstimateRefresh(
  token: string | undefined,
  enabled: boolean,
  onRefresh: (estimate: EstimateWithId) => void,
) {
  useEffect(() => {
    if (!token || !enabled) return;
    let active = true;
    let refreshing = false;
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || refreshing) return;
      refreshing = true;
      try {
        const estimate = await getPublicEstimate(token, { recordView: false });
        if (active && estimate) onRefresh(estimate);
      } catch (error) {
        console.error('Error refreshing client estimate:', error);
      } finally {
        refreshing = false;
      }
    };
    const interval = window.setInterval(refresh, 5_000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [token, enabled, onRefresh]);
}
