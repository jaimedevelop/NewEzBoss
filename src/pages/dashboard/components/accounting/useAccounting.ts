import { useEffect, useState } from 'react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { AccountingData, getAccounting, Period } from '../../../../services/dashboardAccounting';
export function useAccounting(kind: 'pending' | 'accumulated') {
  const { currentUser } = useAuthContext();
  const identity = currentUser?.uid;
  const [period, setPeriod] = useState<Period>('Daily');
  const [data, setData] = useState<AccountingData>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setData(undefined); setError('');
    getAccounting(kind, period, controller.signal).then(value => { if (!controller.signal.aborted) setData(value); })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Accounting unavailable'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [kind, period, retry, identity]);
  return { period, setPeriod, data, error, loading, retry: () => setRetry(value => value + 1) };
}
