import { useCallback, useEffect, useState } from 'react';
import { clearEmployeeSession, getEmployeeMe } from '../../../services/employee/employeeApi';
import type { EmployeePortal } from '../../../services/employee/employee.types';
export function useEmployeeSession() {
  const [portal, setPortal] = useState<EmployeePortal | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const refresh = useCallback(async () => { setLoading(true); setError(''); try { setPortal(await getEmployeeMe()); } catch (e) { if ((e as { status?: number }).status === 401) clearEmployeeSession(); setPortal(null); setError(e instanceof Error ? e.message : 'Unable to load your job.'); } finally { setLoading(false); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { const recover = () => void refresh(); window.addEventListener('focus', recover); window.addEventListener('online', recover); return () => { window.removeEventListener('focus', recover); window.removeEventListener('online', recover); }; }, [refresh]);
  return { portal, setPortal, loading, error, refresh };
}
