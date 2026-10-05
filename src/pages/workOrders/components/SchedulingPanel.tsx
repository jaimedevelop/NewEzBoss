import { useState } from 'react';
import type { WorkOrder, WorkOrderAppointment, WorkOrderWorker } from '../../../services/workOrders/workOrders.types';
import { estimatesApiRequest } from '../../../services/estimates/estimatesApi';

export default function SchedulingPanel({ order, workers, onSaved }: { order: WorkOrder; workers: WorkOrderWorker[]; onSaved: (order: WorkOrder) => void }) {
  const empty = (): WorkOrderAppointment => ({ id: '', scheduledDate: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, status: 'scheduled', shifts: [] });
  const [draft, setDraft] = useState(empty);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const closed = ['completed', 'cancelled'].includes(order.status);
  const inputClass = 'rounded border border-gray-300 px-2 py-1 w-full';
  async function save(action: 'save' | 'cancel') {
    setBusy(true); setError('');
    try {
      const updated = await estimatesApiRequest<WorkOrder>(`/work-orders/${encodeURIComponent(order.id!)}/schedule`, { method: 'POST', body: JSON.stringify({ action, version: order.version, appointmentId: draft.id || undefined, appointment: draft, reason }) });
      onSaved(updated); setEditing(false); setDraft(empty()); setReason('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save schedule'); }
    finally { setBusy(false); }
  }
  return <section className="mx-6 my-4 rounded-lg border border-gray-200 p-4">
    <div className="flex justify-between gap-3"><h2 className="font-semibold">Appointments & expected shifts</h2><button disabled={busy || closed} className="text-orange-700 disabled:opacity-50" onClick={() => { setDraft(empty()); setReason(''); setError(''); setEditing(true); }}>Add appointment</button></div>
    <p className="mt-1 text-sm text-gray-600">Add a visit for each job day. Expected worker shifts are separate from actual clock-ins. Times use the appointment timezone.</p>
    {!order.appointments?.length && <p className="mt-3 text-sm">This work order is unscheduled.</p>}
    <ul className="mt-3 space-y-2">{order.appointments?.map(a => <li key={a.id} className="rounded bg-gray-50 p-3 text-sm">
      <div className="flex justify-between gap-3"><span>{a.scheduledDate} {a.startTime || '(start time optional)'}{a.endTime ? ` – ${a.endTime}` : ''} · {a.timezone} · {a.status}</span><button disabled={busy || closed} className="text-orange-700" onClick={() => { setDraft({ ...a, shifts: a.shifts.map(s => ({ ...s })) }); setReason(''); setError(''); setEditing(true); }}>Edit / cancel</button></div>
      {a.shifts.map(s => <p key={s.assignmentId} className="mt-1 text-gray-600">{workers.find(w => w.id === s.assignmentId)?.displayName || 'Former assignment'}: {s.scheduledDate} {s.startTime || 'Time unspecified'}{s.endTime ? ` – ${s.endTime}` : ''}</p>)}
    </li>)}</ul>
    {editing && <form className="mt-4 space-y-3" onSubmit={e => { e.preventDefault(); void save('save'); }}>
      <fieldset disabled={busy} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="text-sm">Scheduled date<input required type="date" className={inputClass} value={draft.scheduledDate} onChange={e => setDraft({ ...draft, scheduledDate: e.target.value })} /></label>
          <label className="text-sm">Start time (optional)<input type="time" className={inputClass} value={draft.startTime || ''} onChange={e => setDraft({ ...draft, startTime: e.target.value })} /></label>
          <label className="text-sm">End time (optional)<input type="time" className={inputClass} value={draft.endTime || ''} onChange={e => setDraft({ ...draft, endTime: e.target.value })} /></label>
          <label className="text-sm">Timezone<input required className={inputClass} value={draft.timezone} placeholder="America/New_York" onChange={e => setDraft({ ...draft, timezone: e.target.value })} /></label>
        </div>
        <p className="text-sm font-medium">Assigned workers and expected shifts</p>
        {!workers.length && <p className="text-sm text-gray-600">Add workers in the Workers tab to plan their shifts.</p>}
        {workers.filter(w => !w.invitationRevokedAt || draft.shifts.some(s => s.assignmentId === w.id)).map(w => {
          const shift = draft.shifts.find(s => s.assignmentId === w.id);
          const change = (field: 'scheduledDate' | 'startTime' | 'endTime', value: string) => setDraft({ ...draft, shifts: draft.shifts.map(s => s.assignmentId === w.id ? { ...s, [field]: value } : s) });
          return <div key={w.id} className="grid items-center gap-3 sm:grid-cols-4">
            <label className="text-sm"><input type="checkbox" checked={!!shift} onChange={e => setDraft({ ...draft, shifts: e.target.checked ? [...draft.shifts, { assignmentId: w.id, scheduledDate: draft.scheduledDate, startTime: draft.startTime, endTime: draft.endTime }] : draft.shifts.filter(s => s.assignmentId !== w.id) })} /> {w.displayName}</label>
            {shift && <><label className="text-sm">Shift date<input required type="date" className={inputClass} value={shift.scheduledDate} onChange={e => change('scheduledDate', e.target.value)} /></label><label className="text-sm">Shift start<input type="time" className={inputClass} value={shift.startTime || ''} onChange={e => change('startTime', e.target.value)} /></label><label className="text-sm">Shift end<input type="time" className={inputClass} value={shift.endTime || ''} onChange={e => change('endTime', e.target.value)} /></label></>}
          </div>;
        })}
        <label className="block text-sm">Reason / scheduling note<textarea required maxLength={2000} className={inputClass} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <div className="flex gap-4"><button type="submit" className="rounded bg-orange-600 px-3 py-2 text-white">{busy ? 'Saving…' : 'Save appointment'}</button>{draft.id && draft.status !== 'cancelled' && <button type="button" className="text-red-700" disabled={!reason.trim()} onClick={() => void save('cancel')}>Cancel appointment</button>}<button type="button" onClick={() => setEditing(false)}>Close</button></div>
      </fieldset>
    </form>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {!!order.scheduleHistory?.length && <details className="mt-4 text-sm"><summary className="cursor-pointer">Scheduling history</summary><ul className="mt-2 space-y-2">{[...order.scheduleHistory].reverse().map(event => <li key={event.id}><p>{new Date(event.createdAt).toLocaleString()} · {event.action} · {event.reason}</p><p className="text-gray-600">{event.before ? `${event.before.scheduledDate} ${event.before.startTime || ''} ${event.before.timezone} → ` : ''}{event.after.scheduledDate} {event.after.startTime || ''} {event.after.timezone} ({event.after.status})</p></li>)}</ul></details>}
  </section>;
}
