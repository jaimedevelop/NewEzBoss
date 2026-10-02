import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ban, CheckSquare, ChevronDown, ChevronRight, Clock3, Plus, RefreshCw, Send, UserRound, X } from 'lucide-react';
import { getEmployeesGroupedByLetter, type Employee } from '../../../services/employees';
import { addWorkOrderWorkers, assignWorkerTasks, removeRevokedWorkOrderWorker, resendWorkerInvitation, revokeWorkerInvitation } from '../../../services/workOrders/workOrders.mutations';
import { getWorkerWorkdays } from '../../../services/workOrders/workOrders.queries';
import type { WorkOrderTask, WorkOrderWorker, WorkerWorkday } from '../../../services/workOrders/workOrders.types';
import { useAuthContext } from '../../../contexts/AuthContext';

interface Props { workOrderId: string; tasks: WorkOrderTask[]; selectedTaskId?: string; openAddWorkers?: boolean; onAddWorkersOpened?: () => void; workers: WorkOrderWorker[]; workersLoading: boolean; onWorkersChange: React.Dispatch<React.SetStateAction<WorkOrderWorker[]>>; onRefreshWorkers: () => Promise<void>; onWorkersChanged?: () => void; }
interface Cache { data: WorkerWorkday[]; fetchedAt: number; signature: string; request?: Promise<void>; version: number; }
const cache = new Map<string, Cache>();
const key = (wo: string, worker: string) => `${wo}:${worker}`;
const stamp = (value?: string) => value ? new Date(value).toLocaleString() : 'Not recorded yet';
const mins = (value?: number) => `${value ?? 0}m`;
const signature = (worker: WorkOrderWorker) => [worker.updatedAt, worker.clockInAt, worker.breakTakenAt, worker.breakDurationMinutes, worker.lunchTakenAt, worker.lunchDurationMinutes, worker.currentWorkday?.clockInAt, worker.currentWorkday?.clockOutAt, worker.currentWorkday?.breakStartedAt, worker.currentWorkday?.breakEndedAt, worker.currentWorkday?.lunchStartedAt, worker.currentWorkday?.lunchEndedAt].join('|');
const status = (worker: WorkOrderWorker) => worker.invitationRevokedAt ? 'Invitation revoked' : worker.currentWorkday?.clockInAt && !worker.currentWorkday.clockOutAt ? worker.currentWorkday.lunchStartedAt && !worker.currentWorkday.lunchEndedAt ? 'At lunch' : worker.currentWorkday.breakStartedAt && !worker.currentWorkday.breakEndedAt ? 'On break' : 'Clocked in' : worker.clockInAt && !worker.currentWorkday?.clockOutAt ? 'Clocked in' : worker.onboardedAt ? 'Ready for work' : worker.invitationDeliveryStatus === 'failed' ? 'Invitation needs attention' : worker.invitationDeliveryStatus === 'pending' ? 'Invitation pending' : worker.invitationDeliveryStatus === 'accepted' ? 'Invitation sent' : 'Not invited';

const WorkersTab: React.FC<Props> = ({ workOrderId, tasks, selectedTaskId, openAddWorkers, onAddWorkersOpened, workers, workersLoading, onWorkersChange, onRefreshWorkers, onWorkersChanged }) => {
  const { currentUser } = useAuthContext(); const [employees, setEmployees] = useState<Employee[]>([]); const [showAdd, setShowAdd] = useState(false); const [taskWorkerId, setTaskWorkerId] = useState<string | null>(null); const [expanded, setExpanded] = useState<Set<string>>(new Set()); const [selectedIds, setSelectedIds] = useState<string[]>([]); const [inviteEmail, setInviteEmail] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false); const [, rerender] = useState(0);
  const desiredTasks = useRef<Record<string, string[]>>({}); const writes = useRef<Record<string, Promise<void>>>({}); const taskSaveTimers = useRef<Record<string, number | undefined>>({}); const refreshRef = useRef(onRefreshWorkers); refreshRef.current = onRefreshWorkers;
  const taskWorker = workers.find(worker => worker.id === taskWorkerId); const selectedTask = tasks.find(task => task.id === selectedTaskId);
  const refreshDays = (worker: WorkOrderWorker, force = false) => {
    const id = key(workOrderId, worker.id), sig = signature(worker), old = cache.get(id);
    if (!force && old && old.signature === sig && Date.now() - old.fetchedAt < 30_000) return old.request || Promise.resolve();
    if (old?.request) return old.request;
    const version = (old?.version || 0) + 1, next: Cache = { data: old?.data || [], fetchedAt: old?.fetchedAt || 0, signature: sig, version };
    next.request = getWorkerWorkdays(workOrderId, worker.id).then(result => { const current = cache.get(id); if (current?.version === version && current.signature === sig && result.success) cache.set(id, { data: result.data || [], fetchedAt: Date.now(), signature: sig, version }); }).finally(() => { const current = cache.get(id); if (current?.version === version) { current.request = undefined; cache.set(id, current); } rerender(value => value + 1); }); cache.set(id, next); return next.request;
  };
  useEffect(() => { setExpanded(current => new Set([...current].filter(id => workers.some(worker => worker.id === id)))); workers.forEach(worker => { const entry = cache.get(key(workOrderId, worker.id)); if (entry && entry.signature !== signature(worker)) { entry.signature = signature(worker); entry.fetchedAt = 0; entry.version += 1; entry.request = undefined; cache.set(key(workOrderId, worker.id), entry); } }); }, [workOrderId, workers]);
  useEffect(() => { if (selectedTaskId && workers.length && tasks.some(task => task.id === selectedTaskId)) setTaskWorkerId(workers[0].id); }, [selectedTaskId, workers.length, tasks]);
  useEffect(() => { if (openAddWorkers) { setError(''); setShowAdd(true); onAddWorkersOpened?.(); } }, [openAddWorkers, onAddWorkersOpened]);
  useEffect(() => { const refresh = () => { if (document.visibilityState === 'visible') void refreshRef.current(); }; window.addEventListener('focus', refresh); const interval = window.setInterval(refresh, 45_000); return () => { window.removeEventListener('focus', refresh); window.clearInterval(interval); }; }, []);
  useEffect(() => { if (currentUser) void getEmployeesGroupedByLetter(currentUser.uid).then(result => { if (result.success && result.data) setEmployees(Object.values(result.data).flat().filter(employee => employee.id && employee.isActive !== false)); }); }, [currentUser]);
  useEffect(() => { workers.filter(worker => expanded.has(worker.id)).forEach(worker => void refreshDays(worker)); /* cache preserves results during refresh */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, workOrderId, workers]);
  const taskSummary = (worker: WorkOrderWorker) => { const assigned = tasks.filter(task => worker.assignedTaskIds.includes(task.id)); return `${assigned.filter(task => task.isCompleted).length}/${assigned.length} tasks complete`; };
  const toggle = (worker: WorkOrderWorker) => setExpanded(current => { const next = new Set(current); next.has(worker.id) ? next.delete(worker.id) : next.add(worker.id); return next; });
  const saveWorkers = async () => { if (!selectedIds.length && !inviteEmail.trim()) { setError('Select an employee or enter an email address.'); return; } setSaving(true); setError(''); const result = await addWorkOrderWorkers(workOrderId, selectedIds, inviteEmail.trim() || undefined); setSaving(false); if (!result.success) { setError(result.error instanceof Error ? result.error.message : 'Unable to add workers'); return; } onWorkersChange(result.data?.workers || []); onWorkersChanged?.(); setSelectedIds([]); setInviteEmail(''); setShowAdd(false); const failed = result.data?.deliveryResults.filter(item => item.deliveryStatus !== 'accepted'); if (failed?.length) setError(failed.map(item => item.action || 'Invitation delivery needs attention.').join(' ')); };
  const persistTasks = (worker: WorkOrderWorker) => {
    taskSaveTimers.current[worker.id] = undefined;
    writes.current[worker.id] = (writes.current[worker.id] || Promise.resolve()).catch(() => undefined).then(async () => {
      // Read this only when the serialized write starts, so all clicks made
      // while an earlier request was in flight are included in the next save.
      const requestedIds = desiredTasks.current[worker.id] || [];
      const result = await assignWorkerTasks(workOrderId, worker.id, requestedIds);
      if (!result.success || !result.data) { setError(result.error instanceof Error ? result.error.message : 'Unable to assign tasks'); return; }
      const latestIds = desiredTasks.current[worker.id] || requestedIds;
      onWorkersChange(current => current.map(item => item.id === worker.id ? { ...result.data!, assignedTaskIds: latestIds } : item));
      // Do not trigger a parent refresh with an older response while another
      // batch is queued; it would replace the optimistic checkbox state.
      if (latestIds.length === requestedIds.length && latestIds.every(id => requestedIds.includes(id))) onWorkersChanged?.();
    });
  };
  const saveTasks = (worker: WorkOrderWorker, ids: string[]) => {
    // Update the picker immediately.  Using the worker prop here made a fast
    // second click rebuild its list from an older server response and drop it.
    desiredTasks.current[worker.id] = ids;
    onWorkersChange(current => current.map(item => item.id === worker.id ? { ...item, assignedTaskIds: ids } : item));
    if (taskSaveTimers.current[worker.id] !== undefined) window.clearTimeout(taskSaveTimers.current[worker.id]);
    taskSaveTimers.current[worker.id] = window.setTimeout(() => persistTasks(worker), 175);
  };
  const flushTaskSave = (worker: WorkOrderWorker) => {
    if (taskSaveTimers.current[worker.id] === undefined) return;
    window.clearTimeout(taskSaveTimers.current[worker.id]);
    persistTasks(worker);
  };
  const resend = async (worker: WorkOrderWorker) => { setSaving(true); setError(''); const result = await resendWorkerInvitation(workOrderId, worker.id); setSaving(false); if (!result.success) setError('Invitation could not be sent. The assignment remains available to retry.'); else { setError(result.data?.deliveryResult.deliveryStatus === 'accepted' ? '' : result.data?.deliveryResult.action || 'Invitation delivery needs attention.'); await refreshRef.current(); } };
  const revoke = async (worker: WorkOrderWorker) => { if (!window.confirm(`Revoke ${worker.displayName}'s employee portal access?`)) return; setSaving(true); const result = await revokeWorkerInvitation(workOrderId, worker.id); setSaving(false); if (!result.success) setError('Unable to revoke access.'); else await refreshRef.current(); };
  const remove = async (worker: WorkOrderWorker) => { if (!worker.invitationRevokedAt || !window.confirm(`Remove ${worker.displayName} from this work order?`)) return; setSaving(true); const result = await removeRevokedWorkOrderWorker(workOrderId, worker.id); setSaving(false); if (!result.success) setError('Unable to remove the revoked worker.'); else { cache.delete(key(workOrderId, worker.id)); await refreshRef.current(); } };
  const selectable = employees.filter(employee => !workers.some(worker => worker.employeeId === employee.id));
  return <div className="p-6 space-y-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold text-gray-900">Workers</h2><p className="mt-1 text-sm text-gray-500">Assign employees and monitor job activity from one place.</p></div><button onClick={() => { setError(''); setShowAdd(true); }} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"><Plus className="w-4 h-4" />Add worker</button></div>{error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}{selectedTaskId && !selectedTask && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">The requested task is no longer available.</div>}{workersLoading && !workers.length ? <div className="p-8 text-center text-gray-500">Loading workers…</div> : !workers.length ? <Empty selectedTask={selectedTask} onAdd={() => setShowAdd(true)} /> : <div className="overflow-hidden rounded-xl border border-gray-200 divide-y divide-gray-200">{workers.map(worker => <Row key={worker.id} worker={worker} tasks={tasks} summary={taskSummary(worker)} expanded={expanded.has(worker.id)} workdays={cache.get(key(workOrderId, worker.id))?.data} refreshing={!!cache.get(key(workOrderId, worker.id))?.request} saving={saving} onToggle={() => toggle(worker)} onAssign={() => setTaskWorkerId(worker.id)} onResend={() => void resend(worker)} onRevoke={() => void revoke(worker)} onRemove={() => void remove(worker)} />)}</div>}{showAdd && <Modal title="Add workers" onClose={() => setShowAdd(false)}><p className="mb-4 text-sm text-gray-600">Select one or more active employees from People.</p><select multiple value={selectedIds} onChange={event => setSelectedIds(Array.from(event.target.selectedOptions, option => option.value))} className="min-h-36 w-full rounded-lg border border-gray-300 p-3">{selectable.map(employee => <option key={employee.id} value={employee.id}>{employee.name} {employee.employeeRole ? `— ${employee.employeeRole}` : ''}</option>)}</select><p className="mt-2 text-xs text-gray-500">Hold Command/Ctrl to select more than one worker.</p><div className="my-5 border-t" /><label className="mb-2 block text-sm font-semibold text-gray-800">Invite by email</label><input type="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="worker@example.com" className="w-full rounded-lg border border-gray-300 px-3 py-2" /><div className="mt-6 flex justify-end gap-3"><button onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-700">Cancel</button><button disabled={saving} onClick={() => void saveWorkers()} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-white disabled:bg-orange-300"><Send className="w-4 h-4" />{saving ? 'Adding…' : 'Add workers'}</button></div></Modal>}{taskWorker && <TasksModal worker={taskWorker} tasks={tasks} selectedTask={selectedTask} onClose={() => { flushTaskSave(taskWorker); setTaskWorkerId(null); }} onSave={saveTasks} />}</div>;
};
const Empty: React.FC<{ selectedTask?: WorkOrderTask; onAdd: () => void }> = ({ selectedTask, onAdd }) => <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-xl"><UserRound className="w-10 h-10 mx-auto text-gray-300" /><h3 className="mt-4 font-semibold text-gray-900">No workers have been added</h3><p className="mt-1 text-sm text-gray-500">{selectedTask ? `Add a worker before assigning “${selectedTask.name}”.` : 'Add employees from People to assign them to this job.'}</p><button onClick={onAdd} className="mt-5 text-sm font-semibold text-orange-600">Add the first worker</button></div>;
const Row: React.FC<{ worker: WorkOrderWorker; tasks: WorkOrderTask[]; summary: string; expanded: boolean; workdays?: WorkerWorkday[]; refreshing: boolean; saving: boolean; onToggle: () => void; onAssign: () => void; onResend: () => void; onRevoke: () => void; onRemove: () => void }> = ({ worker, tasks, summary, expanded, workdays, refreshing, saving, onToggle, onAssign, onResend, onRevoke, onRemove }) => { const assigned = tasks.filter(task => worker.assignedTaskIds.includes(task.id)); const name = worker.profileFirstName ? `${worker.profileFirstName} ${worker.profileLastName || ''}`.trim() : worker.displayName; return <section className="bg-white"><div className="flex items-center gap-3 px-4 py-3"><button onClick={onToggle} aria-expanded={expanded} aria-label={`${expanded ? 'Collapse' : 'Expand'} ${name}`} className="rounded p-1 text-gray-500 hover:bg-gray-100">{expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}</button><button onClick={onToggle} className="min-w-0 flex-1 text-left"><span className="block truncate font-semibold text-gray-900">{name}</span><span className="block truncate text-xs text-gray-500">{worker.occupation || worker.email || 'Occupation not set'}</span></button><div className="hidden min-w-32 sm:block text-sm"><span className="font-medium text-gray-800">{status(worker)}</span><span className="block text-xs text-gray-500">{summary}</span></div><button onClick={onAssign} className="hidden md:inline-flex items-center gap-1 rounded-lg border border-orange-200 px-2.5 py-1.5 text-sm text-orange-700"><CheckSquare className="w-4 h-4" />Tasks</button></div>{expanded && <div className="border-t border-gray-100 bg-gray-50 px-5 py-4"><div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm"><span className="font-medium text-gray-800">{status(worker)}</span><span className="text-gray-600">{summary}</span>{worker.email && <span className="text-gray-500">{worker.email}</span>}</div><div className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3"><Detail label="Clock in" value={stamp(worker.currentWorkday?.clockInAt || worker.clockInAt)} /><Detail label="Clock out" value={stamp(worker.currentWorkday?.clockOutAt)} /><Detail label="Break" value={mins(worker.currentWorkday?.actualBreakMinutes ?? worker.breakDurationMinutes)} /><Detail label="Lunch" value={mins(worker.currentWorkday?.actualLunchMinutes ?? worker.lunchDurationMinutes)} /><Detail label="Assigned work" value={assigned.length ? assigned.map(task => task.name).join(', ') : 'No tasks assigned'} /><Detail label="Invitation" value={worker.invitationRevokedAt ? 'Revoked' : worker.onboardedAt ? 'Onboarded' : worker.invitationDeliveryStatus || 'Not sent'} /></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={onAssign} className="inline-flex items-center gap-1 rounded-lg border border-orange-200 px-3 py-1.5 text-sm text-orange-700"><CheckSquare className="w-4 h-4" />Assign tasks</button><button onClick={onResend} disabled={saving || !!worker.invitationRevokedAt} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"><RefreshCw className="w-4 h-4" />Resend</button>{worker.invitationRevokedAt ? <button onClick={onRemove} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-red-700"><X className="w-4 h-4" />Remove</button> : <button onClick={onRevoke} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-red-700"><Ban className="w-4 h-4" />Revoke</button>}</div><div className="mt-4 border-t border-gray-200 pt-3"><div className="flex items-center gap-2 text-sm font-semibold text-gray-800"><Clock3 className="w-4 h-4" />Workday history {refreshing && <span className="text-xs font-normal text-gray-500">Refreshing…</span>}</div>{workdays ? workdays.length ? <table className="mt-2 w-full text-left text-xs text-gray-600"><thead className="text-gray-500"><tr><th>Date</th><th>In</th><th>Out</th><th>Break</th><th>Lunch</th></tr></thead><tbody>{workdays.map(day => <tr key={day.localDate} className="border-t border-gray-200"><td className="py-1.5">{day.localDate}</td><td>{stamp(day.clockInAt)}</td><td>{stamp(day.clockOutAt)}</td><td>{mins(day.actualBreakMinutes)}</td><td>{mins(day.actualLunchMinutes)}</td></tr>)}</tbody></table> : <p className="mt-1 text-sm text-gray-500">No completed workdays yet.</p> : <p className="mt-1 text-sm text-gray-500">Loading workday history…</p>}</div></div>}</section>; };
const Detail: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => <div className="flex gap-2"><span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span><span className="min-w-0 text-gray-800">{value}</span></div>;
const TasksModal: React.FC<{ worker: WorkOrderWorker; tasks: WorkOrderTask[]; selectedTask?: WorkOrderTask; onClose: () => void; onSave: (worker: WorkOrderWorker, ids: string[]) => void }> = ({ worker, tasks, selectedTask, onClose, onSave }) => {
  const [selectedIds, setSelectedIds] = useState(worker.assignedTaskIds);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  // A different worker opens a fresh picker. Do not reset after each save: the
  // local list is deliberately ahead of an in-flight server response.
  useEffect(() => { setSelectedIds(worker.assignedTaskIds); setExpandedTaskIds(new Set()); }, [worker.id]);
  const toggleTask = (taskId: string, checked: boolean) => {
    const next = checked ? [...new Set([...selectedIds, taskId])] : selectedIds.filter(id => id !== taskId);
    setSelectedIds(next);
    onSave(worker, next);
  };
  const toggleExpanded = (taskId: string) => setExpandedTaskIds(current => {
    const next = new Set(current);
    next.has(taskId) ? next.delete(taskId) : next.add(taskId);
    return next;
  });
  const updateSelection = (ids: string[]) => {
    setSelectedIds(ids);
    onSave(worker, ids);
  };
  return <Modal title={`Assign tasks to ${worker.displayName}`} onClose={onClose}>
    {selectedTask && <p className="mb-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800">Assigning selected task: <strong>{selectedTask.name}</strong></p>}
    {tasks.length ? <>
      <div className="mb-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => updateSelection(tasks.map(task => task.id))} className="rounded-lg border border-orange-200 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50">Select All</button>
        <button type="button" onClick={() => updateSelection([])} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Unselect All</button>
      </div>
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {tasks.map(task => {
          const expanded = expandedTaskIds.has(task.id);
          const isAssigned = selectedIds.includes(task.id);
          return <section key={task.id} className="rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 p-3">
              <input id={`task-${task.id}`} type="checkbox" aria-label={`Assign ${task.name}`} checked={isAssigned} onChange={event => toggleTask(task.id, event.target.checked)} className="h-4 w-4 shrink-0" />
              <button type="button" onClick={() => toggleExpanded(task.id)} aria-expanded={expanded} aria-controls={`task-details-${task.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                <span className="truncate font-medium text-gray-900">{task.name}</span>
                {expanded ? <ChevronDown className="h-5 w-5 shrink-0 text-gray-500" /> : <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" />}
              </button>
            </div>
            {expanded && <div id={`task-details-${task.id}`} className="border-t border-gray-100 px-3 pb-3 pt-2">
              {task.description ? <p className="text-sm text-gray-500">{task.description}</p> : <p className="text-sm text-gray-400">No task details provided.</p>}
            </div>}
          </section>;
        })}
      </div>
    </> : <p className="text-sm text-gray-500">This work order has no tasks yet.</p>}
    <div className="mt-6 flex justify-end"><button onClick={onClose} className="rounded-lg bg-orange-600 px-4 py-2 text-white">Done</button></div>
  </Modal>;
};
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-xl bg-white shadow-xl"><div className="flex items-center justify-between border-b p-5"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} aria-label="Close dialog" className="rounded p-1 text-gray-500 hover:bg-gray-100"><X className="w-5 h-5" /></button></div><div className="p-5">{children}</div></div></div>, document.body);
export default WorkersTab;
