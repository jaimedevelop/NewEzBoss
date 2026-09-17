import React, { useCallback, useState } from 'react';
import { employeeAttendance } from '../../../services/employee/employeeApi';
import type { EmployeePortal } from '../../../services/employee/employee.types';
import { useWorkdayTimer } from '../logic/useWorkdayTimer';
import { Alert } from './EmployeeInviteView';
const time = (value?: string) => value ? new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';
const duration = (minutes?: number) => minutes === undefined ? '—' : `${minutes} min`;
const EmployeeTimeCard: React.FC<{ portal: EmployeePortal; onChanged: (value: EmployeePortal) => void; refresh: () => Promise<void> }> = ({ portal, onChanged, refresh }) => {
  // TODO: Add contractor-configurable durations and native alarms/notifications in a later app release.
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const day = portal.workday;
  const reconcile = useCallback(() => { void refresh(); }, [refresh]); const { remainingSeconds } = useWorkdayTimer(day, portal.serverNow, reconcile);
  const action = async (name: Parameters<typeof employeeAttendance>[0]) => { setBusy(true); setError(''); try { const result = await employeeAttendance(name); onChanged({ ...portal, workday: result.workday, serverNow: result.serverNow }); } catch (e) { setError(e instanceof Error ? e.message : 'Could not record that action. We refreshed your job status.'); await refresh(); } finally { setBusy(false); } };
  const activeBreak = !!day?.breakStartedAt && !day.breakEndedAt; const activeLunch = !!day?.lunchStartedAt && !day.lunchEndedAt; const clockedOut = !!day?.clockOutAt; const clockedIn = !!day?.clockInAt;
  const clock = remainingSeconds === null ? '' : `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')} remaining`;
  let main: React.ReactNode;
  if (!clockedIn) main = <button disabled={busy} onClick={() => void action('clock-in')} className="primary w-full">{busy ? 'Saving…' : 'Clock In'}</button>;
  else if (clockedOut) main = <p className="rounded-lg bg-slate-100 p-3 text-center font-semibold text-slate-700">Workday complete</p>;
  else if (activeBreak) main = <><p className="text-center font-semibold text-orange-700">Break · {clock}</p><button disabled={busy} onClick={() => void action('end-break')} className="primary w-full">End Break Early</button></>;
  else if (!day?.breakStartedAt) main = <button disabled={busy} onClick={() => void action('start-break')} className="primary w-full">Break</button>;
  else if (activeLunch) main = <><p className="text-center font-semibold text-orange-700">Lunch · {clock}</p><button disabled={busy} onClick={() => void action('end-lunch')} className="primary w-full">End Lunch Early</button></>;
  else if (!day?.lunchStartedAt) main = <button disabled={busy} onClick={() => void action('start-lunch')} className="primary w-full">Lunch</button>;
  else main = <p className="rounded-lg bg-green-50 p-3 text-center font-semibold text-green-800">Break and Lunch Complete</p>;
  return <section className="card space-y-4"><div><h2 className="font-bold">Today’s time</h2><p className="text-sm text-gray-600">Server time records your workday.</p></div>{error && <Alert>{error}</Alert>}{main}{clockedIn && !clockedOut && <button disabled={busy} onClick={() => void action('clock-out')} className="w-full rounded-lg border border-slate-400 px-4 py-3 font-semibold text-slate-800 disabled:opacity-50">Clock Out</button>}<dl className="grid grid-cols-2 gap-3 text-sm"><Metric label="Clock in" value={time(day?.clockInAt)} /><Metric label="Clock out" value={time(day?.clockOutAt)} /><Metric label="Break taken" value={duration(day?.actualBreakMinutes)} /><Metric label="Lunch taken" value={duration(day?.actualLunchMinutes)} /><Metric label="Gross" value={duration(day?.grossElapsedMinutes)} /><Metric label="Worked" value={duration(day?.netWorkedMinutes)} /></dl></section>;
};
const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded-lg bg-slate-50 p-3"><dt className="text-xs text-gray-500">{label}</dt><dd className="font-medium text-slate-800">{value}</dd></div>;
export default EmployeeTimeCard;
