import { useEffect, useRef } from 'react';

type Visit = { version: string; visitId: string };

export function useCustomerEstimateVisit(
  key: string | undefined,
  version: string | undefined,
  record: (key: string, visit: Visit) => Promise<void>,
) {
  const current = useRef<{ key: string; visit: Visit; sent: boolean }>();
  useEffect(() => {
    if (current.current?.key !== key) current.current = undefined;
    if (!key || !version) return;
    const report = () => {
      if (document.visibilityState !== 'visible') return;
      if (current.current?.visit.version !== version) {
        current.current = { key, visit: { version, visitId: crypto.randomUUID() }, sent: false };
      }
      const entry = current.current;
      if (entry.sent) return;
      entry.sent = true;
      void record(key, entry.visit).catch(error => {
        entry.sent = false;
        console.error('Error tracking estimate view:', error);
      });
    };
    report();
    const interval = window.setInterval(report, 10_000);
    document.addEventListener('visibilitychange', report);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', report);
    };
  }, [key, version, record]);
}
