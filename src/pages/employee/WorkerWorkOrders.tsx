import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { getAssignedJobs, getAssignedJob, getOwnWorkdays, membershipWorkerClient, normalizeWorkday, type AssignedJob } from '../../services/employee/membershipWorkerApi';
import type { EmployeePortal, EmployeeWorkday } from '../../services/employee/employee.types';
import { EmployeeJobView } from './views/EmployeeJobView';
import { Alert } from './views/EmployeeInviteView';

export default function WorkerWorkOrders() {
  const { canPerform } = useAuthContext();
  const [jobs, setJobs] = useState<AssignedJob[]>([]);
  const [selected, setSelected] = useState('');
  const [portal, setPortal] = useState<EmployeePortal | null>(null);
  const [history, setHistory] = useState<EmployeeWorkday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [taskBusy, setTaskBusy] = useState(false);
  const [timeBusy, setTimeBusy] = useState(false);
  const sequence = useRef(0);
  const locked = taskBusy || timeBusy;
  const client = useMemo(() => membershipWorkerClient(selected), [selected]);
  const canAttend = canPerform('own:attendance');
  const refresh = useCallback(async (opts?: { background?: boolean }) => {
    const version = ++sequence.current;
    if (!opts?.background) setLoading(true);
    try {
      const list = await getAssignedJobs();
      if (version !== sequence.current) return;
      setJobs(list.jobs);
      if (!selected) { setError(''); return; }
      if (!list.jobs.some(job => job.id === selected)) { setPortal(null); setError('This assignment is no longer available. Choose another job or contact your manager.'); return; }
      const [detail, days] = await Promise.all([getAssignedJob(selected), canAttend ? getOwnWorkdays(selected) : Promise.resolve({ workdays: [] })]);
      if (version !== sequence.current) return;
      const workdays = days.workdays.map(normalizeWorkday);
      setHistory(workdays);
      setPortal({ job: detail.job, profile: { onboardedAt: 'membership' }, serverNow: detail.serverNow, workday: workdays[0] ?? null });
      setError('');
    } catch (e) {
      if (version !== sequence.current) return;
      setPortal(null);
      setError(e instanceof Error ? e.message : 'Unable to load assigned jobs.');
    } finally { if (version === sequence.current) setLoading(false); }
  }, [selected, canAttend]);
  useEffect(() => { void refresh(); return () => { ++sequence.current; }; }, [refresh]);
  useEffect(() => {
    const recover = () => { if (!locked) void refresh({ background: true }); };
    window.addEventListener('focus', recover); window.addEventListener('online', recover);
    const interval = window.setInterval(recover, 30000);
    return () => { window.removeEventListener('focus', recover); window.removeEventListener('online', recover); window.clearInterval(interval); };
  }, [refresh, locked]);
  const changed = (value: EmployeePortal) => { ++sequence.current; setLoading(false); setPortal(value); setHistory(days => [value.workday!, ...days.filter(day => day.clockInAt !== value.workday?.clockInAt)]); };
  // Keep mounted job actions through read failures, so pending files and explicit retries survive.
  const lastPortal = useRef<EmployeePortal | null>(null);
  if (portal) lastPortal.current = portal;
  const shown = portal || (locked ? lastPortal.current : null);
  return <main className="mx-auto w-full max-w-2xl space-y-5 p-3 sm:p-6">
    <header className="card space-y-3"><h1 className="text-2xl font-bold">My assigned work</h1>
      <label className="block font-medium">Assigned job<select className="mt-2 w-full rounded-lg border p-3" value={selected} disabled={locked || loading} onChange={e => { setPortal(null); lastPortal.current = null; setHistory([]); setSelected(e.target.value); }}><option value="">Choose a job</option>{jobs.map(job => <option key={job.id} value={job.id}>{job.workOrderNumber} — {job.serviceAddress || 'Location pending'}</option>)}</select></label>
      {locked && <p className="text-sm text-gray-600">Finish or resolve the current action before changing jobs.</p>}
      <button className="secondary" disabled={loading || locked} onClick={() => void refresh({ background: true })}>Refresh jobs</button>
    </header>
    {error && <Alert>{error} Actions have not been saved locally.</Alert>}
    {loading && <p role="status">Loading assigned work…</p>}
    {!loading && !error && !jobs.length && <p className="card">No jobs are currently assigned to you.</p>}
    {shown && <div key={selected} className="space-y-5">
      <section className="card"><h2 className="font-bold">Schedule</h2>{!shown.job || !jobs.find(job => job.id === selected)?.appointments.length ? <p className="mt-2 text-sm">No schedule has been assigned yet.</p> : jobs.find(job => job.id === selected)!.appointments.map(appointment => <div key={appointment.id} className="mt-3 border-t pt-3"><p>{appointment.status || 'Scheduled'}{appointment.timezone ? ` (${appointment.timezone})` : ''}</p>{appointment.shifts.map((shift, index) => <p key={index}>{shift.scheduledDate || appointment.scheduledDate || appointment.startAt || 'Date pending'} · {shift.startTime || appointment.startTime || 'Time pending'} – {shift.endTime || appointment.endTime || ''}</p>)}</div>)}</section>
      <EmployeeJobView portal={shown} client={client} onChanged={changed} refresh={refresh} canComplete={canPerform('complete:tasks')} canUpload={canPerform('upload:task-photos')} canAttend={canAttend} onActivity={setTaskBusy} onAttendanceActivity={setTimeBusy} />
      {canAttend && <section className="card space-y-3"><h2 className="font-bold">My attendance history</h2>{!history.length && <p>No attendance recorded for this job.</p>}{history.map(day => <div key={day.clockInAt} className="border-t pt-3 text-sm"><p>{day.localDate} ({day.timezone})</p><p>{day.clockInAt ? new Date(day.clockInAt).toLocaleString() : '—'} → {day.clockOutAt ? new Date(day.clockOutAt).toLocaleString() : 'Active shift'}</p><p>Worked: {Math.floor(day.netWorkedMinutes ?? 0)} min</p></div>)}</section>}
    </div>}
  </main>;
}
