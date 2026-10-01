import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { employeeAttendance } from '../../../services/employee/employeeApi';
import type { EmployeePortal } from '../../../services/employee/employee.types';
import { useWorkdayTimer } from '../logic/useWorkdayTimer';
import { Alert } from './EmployeeInviteView';
const time = (value?: string) => value ? new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—';
const duration = (minutes?: number) => minutes === undefined ? '—' : `${minutes} min`;
const hms = (totalSeconds: number) => { const h = Math.floor(totalSeconds / 3600); const m = Math.floor((totalSeconds % 3600) / 60); const s = totalSeconds % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; };
const EmployeeTimeCard: React.FC<{ portal: EmployeePortal; onChanged: (value: EmployeePortal) => void; refresh: (opts?: { background?: boolean }) => Promise<void> }> = ({ portal, onChanged, refresh }) => {
  // TODO: Add contractor-configurable durations and native alarms/notifications in a later app release.
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const day = portal.workday;
  const reconcile = useCallback(() => { void refresh({ background: true }); }, [refresh]); const { remainingSeconds } = useWorkdayTimer(day, portal.serverNow, reconcile);
  const action = async (name: Parameters<typeof employeeAttendance>[0]) => { setBusy(true); setError(''); try { const result = await employeeAttendance(name); onChanged({ ...portal, workday: result.workday, serverNow: result.serverNow }); } catch (e) { setError(e instanceof Error ? e.message : 'Could not record that action. We refreshed your job status.'); await refresh({ background: true }); } finally { setBusy(false); } };
  const activeBreak = !!day?.breakStartedAt && !day.breakEndedAt; const activeLunch = !!day?.lunchStartedAt && !day.lunchEndedAt; const clockedOut = !!day?.clockOutAt; const clockedIn = !!day?.clockInAt;
  const clock = remainingSeconds === null ? '' : `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')} remaining`;
  const offset = useMemo(() => portal.serverNow ? new Date(portal.serverNow).getTime() - Date.now() : 0, [portal.serverNow]);
  const [now, setNow] = useState(Date.now());
  const isWorking = clockedIn && !clockedOut && !activeBreak && !activeLunch;
  useEffect(() => { if (!isWorking) return; const tick = () => setNow(Date.now()); tick(); const id = window.setInterval(tick, 1000); return () => clearInterval(id); }, [isWorking]);
  const workedLabel = useMemo(() => {
    if (!day?.clockInAt) return '—';
    const workedBeforeMs = day.workedBeforeCurrentIntervalMs ?? Math.max(0, (day.netWorkedMinutes ?? 0) * 60_000 - Math.max(0, (now + offset) - new Date(day.activeWorkStartedAt ?? day.clockInAt).getTime()));
    const lastResumeAt = day.activeWorkStartedAt ?? day.clockInAt;
    const elapsedMs = Math.max(0, (now + offset) - new Date(lastResumeAt).getTime());
    const totalSeconds = Math.floor((workedBeforeMs + elapsedMs) / 1000);
    return hms(totalSeconds);
  }, [isWorking, day, now, offset]);
  let main: React.ReactNode;
  if (!clockedIn) main = <button type="button" disabled={busy} onClick={() => void action('clock-in')} className="primary w-full">{busy ? 'Saving…' : 'Clock In'}</button>;
  else if (clockedOut) main = <p className="rounded-xl bg-emerald-50 p-4 text-center font-semibold text-emerald-800">Workday complete</p>;
  else if (activeBreak) main = <div className="flex items-center justify-between gap-4 rounded-xl border border-orange-200 bg-orange-50 p-4"><div><p className="text-sm font-semibold text-orange-800">Break in progress</p><p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{clock}</p></div><button type="button" disabled={busy} onClick={() => void action('end-break')} className="secondary">End early</button></div>;
  else if (activeLunch) main = <div className="flex items-center justify-between gap-4 rounded-xl border border-orange-200 bg-orange-50 p-4"><div><p className="text-sm font-semibold text-orange-800">Lunch in progress</p><p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{clock}</p></div><button type="button" disabled={busy} onClick={() => void action('end-lunch')} className="secondary">End early</button></div>;
  else main = <div className="grid grid-cols-2 gap-3"><button type="button" disabled={busy || !!day?.breakStartedAt} onClick={() => void action('start-break')} className="secondary py-3">{day?.breakStartedAt ? 'Break complete' : 'Start 15 min break'}</button><button type="button" disabled={busy || !!day?.lunchStartedAt || !day?.breakEndedAt} onClick={() => void action('start-lunch')} className="secondary py-3">{day?.lunchStartedAt ? 'Lunch complete' : 'Start 30 min lunch'}</button></div>;
  return <section className="card space-y-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-900">Today’s time</h2><p className="mt-1 text-sm text-slate-500">Your work time updates automatically.</p></div>{clockedIn && !clockedOut && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${activeBreak || activeLunch ? 'bg-orange-100 text-orange-800' : 'bg-emerald-100 text-emerald-800'}`}>{activeBreak ? 'On break' : activeLunch ? 'At lunch' : 'Working'}</span>}</div>{error && <Alert>{error}</Alert>}{main}{clockedIn && !clockedOut && <button type="button" disabled={busy || activeBreak || activeLunch} onClick={() => void action('clock-out')} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Clock Out</button>}<dl className="grid grid-cols-2 gap-3 text-sm"><Metric label="Clock in" value={time(day?.clockInAt)} /><Metric label="Clock out" value={time(day?.clockOutAt)} /><Metric label="Break taken" value={duration(day?.actualBreakMinutes)} /><Metric label="Lunch taken" value={duration(day?.actualLunchMinutes)} /><Metric label="Gross" value={duration(day?.grossElapsedMinutes)} /><Metric label="Worked" value={workedLabel} /></dl></section>;
};
const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3"><dt className="text-xs font-medium text-slate-500">{label}</dt><dd className="mt-1 font-semibold tabular-nums text-slate-800">{value}</dd></div>;
export default EmployeeTimeCard;
