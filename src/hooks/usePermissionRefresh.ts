import { useEffect, useRef } from 'react';

/** Keep navigation and action permissions current in an open company session. */
export function usePermissionRefresh(refreshPermissions: () => Promise<void>, sessionKey: string) {
  const refreshRef = useRef(refreshPermissions);
  refreshRef.current = refreshPermissions;

  useEffect(() => {
    let refreshing = false;
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || refreshing) return;
      refreshing = true;
      try {
        await refreshRef.current();
      } finally {
        refreshing = false;
      }
    };

    void refresh();
    const interval = window.setInterval(refresh, 5_000);
    window.addEventListener('focus', refresh);
    window.addEventListener('ezboss:permission-denied', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('ezboss:permission-denied', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [sessionKey]);
}
