import { useEffect, useMemo, useState } from 'react';
import type { EmployeeWorkday } from '../../../services/employee/employee.types';
// Display time is derived from the server snapshot; it never submits local elapsed time.
export function useWorkdayTimer(workday: EmployeeWorkday | null, serverNow: string | undefined, onExpiry: () => void) {
  const [now, setNow] = useState(Date.now());
  const offset = useMemo(() => serverNow ? new Date(serverNow).getTime() - Date.now() : 0, [serverNow]);
  const end = workday?.breakStartedAt && !workday.breakEndedAt ? workday.breakScheduledEndAt : workday?.lunchStartedAt && !workday.lunchEndedAt ? workday.lunchScheduledEndAt : undefined;
  useEffect(() => { const tick = () => setNow(Date.now()); tick(); const id = window.setInterval(tick, 1000); return () => clearInterval(id); }, []);
  useEffect(() => { if (!end) return; const delay = Math.max(0, new Date(end).getTime() - (Date.now() + offset)) + 100; const id = window.setTimeout(onExpiry, delay); return () => clearTimeout(id); }, [end, offset, onExpiry]);
  const remainingSeconds = end ? Math.max(0, Math.ceil((new Date(end).getTime() - (now + offset)) / 1000)) : null;
  return { remainingSeconds };
}
