import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckSquare, Clock3, Plus, Send, UserRound, X, RefreshCw, Ban } from 'lucide-react';
import { getEmployeesGroupedByLetter, type Employee } from '../../../services/employees';
import { addWorkOrderWorkers, assignWorkerTasks, resendWorkerInvitation, revokeWorkerInvitation } from '../../../services/workOrders/workOrders.mutations';
import { getWorkerWorkdays, getWorkOrderWorkers } from '../../../services/workOrders/workOrders.queries';
import type { WorkOrderTask, WorkOrderWorker, WorkerWorkday } from '../../../services/workOrders/workOrders.types';
import { useAuthContext } from '../../../contexts/AuthContext';

interface Props { workOrderId: string; tasks: WorkOrderTask[]; }
const stamp = (value?: string) => value ? new Date(value).toLocaleString() : 'Not recorded yet';

const WorkersTab: React.FC<Props> = ({ workOrderId, tasks }) => {
  const { currentUser } = useAuthContext();
  const [workers, setWorkers] = useState<WorkOrderWorker[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [workdays, setWorkdays] = useState<WorkerWorkday[]>([]);
  const desiredTasks = useRef<Record<string, string[]>>({});
  const taskWrite = useRef<Record<string, Promise<void>>>({});
  const loadSequence = useRef(0);
  const loading = useRef<Promise<void> | null>(null);

  const load = async (initial = false) => {
    if (loading.current) return loading.current;
    const sequence = ++loadSequence.current;
    if (initial) setIsLoading(true);
    loading.current = (async () => {
      const result = await getWorkOrderWorkers(workOrderId);
      if (sequence !== loadSequence.current) return;
      if (result.success && result.data) {
        setWorkers(result.data);
        setSelectedWorkerId(current => result.data!.some(worker => worker.id === current) ? current : result.data![0]?.id || '');
      } else setError(result.error || 'Unable to refresh workers');
    })();
    try { await loading.current; } finally { if (sequence === loadSequence.current) { loading.current = null; setIsLoading(false); } }
  };
  useEffect(() => { void load(true); return () => { loadSequence.current++; loading.current = null; }; }, [workOrderId]);
  useEffect(() => { const refresh = () => { if (document.visibilityState === 'visible') void load(); }; window.addEventListener('focus', refresh); const interval = window.setInterval(refresh, 45_000); return () => { window.removeEventListener('focus', refresh); window.clearInterval(interval); }; }, [workOrderId]);
  useEffect(() => {
    if (!currentUser) return;
    void getEmployeesGroupedByLetter(currentUser.uid).then(result => {
      if (result.success && result.data) setEmployees(Object.values(result.data).flat().filter(employee => employee.id && employee.isActive !== false));
    });
  }, [currentUser]);

  const worker = workers.find(item => item.id === selectedWorkerId);
  useEffect(() => { if (!worker) { setWorkdays([]); return; } let active = true; void getWorkerWorkdays(workOrderId, worker.id).then(result => { if (active && result.success) setWorkdays(result.data || []); }); return () => { active = false; }; }, [workOrderId, worker?.id, workers]);
  const assignedTasks = useMemo(() => tasks.filter(task => worker?.assignedTaskIds.includes(task.id)), [tasks, worker]);
  const completed = assignedTasks.filter(task => task.isCompleted).length;
  const selectableEmployees = employees.filter(employee => !workers.some(worker => worker.employeeId === employee.id));

  const saveWorkers = async () => {
    if (!selectedEmployeeIds.length && !inviteEmail.trim()) { setError('Select an employee or enter an email address.'); return; }
    setIsSaving(true); setError('');
    const result = await addWorkOrderWorkers(workOrderId, selectedEmployeeIds, inviteEmail.trim() || undefined);
    setIsSaving(false);
    if (!result.success) { setError(result.error instanceof Error ? result.error.message : 'Unable to add workers'); return; }
    const updatedWorkers = result.data?.workers || [];
    setWorkers(updatedWorkers);
    setSelectedWorkerId(updatedWorkers[updatedWorkers.length - 1]?.id || '');
    setSelectedEmployeeIds([]); setInviteEmail(''); setShowAdd(false);
    const failed = result.data?.deliveryResults.filter(item => item.deliveryStatus !== 'accepted');
    if (failed?.length) setError(failed.map(item => item.action || 'Invitation delivery needs attention.').join(' '));
  };
  const saveTasks = async (taskIds: string[]) => {
    if (!worker) return;
    // Serialize writes per worker; rapid checkbox taps always send the latest desired set.
    desiredTasks.current[worker.id] = taskIds;
    taskWrite.current[worker.id] = (taskWrite.current[worker.id] || Promise.resolve()).then(async () => {
      const next = desiredTasks.current[worker!.id]; const result = await assignWorkerTasks(workOrderId, worker!.id, next);
      if (!result.success || !result.data) { setError(result.error instanceof Error ? result.error.message : 'Unable to assign tasks'); return; }
      setWorkers(current => current.map(item => item.id === worker!.id ? result.data! : item));
    });
    await taskWrite.current[worker.id];
  };
  const resend = async () => { if (!worker) return; setIsSaving(true); setError(''); const result = await resendWorkerInvitation(workOrderId, worker.id); setIsSaving(false); if (!result.success) setError('Invitation could not be sent. The assignment remains available to retry.'); else { const status = result.data?.deliveryResult.deliveryStatus; if (status === 'accepted') setError(''); else setError(result.data?.deliveryResult.action || 'Invitation delivery needs attention.'); await load(); } };
  const revoke = async () => { if (!worker || !window.confirm(`Revoke ${worker.displayName}'s employee portal access?`)) return; setIsSaving(true); const result = await revokeWorkerInvitation(workOrderId, worker.id); setIsSaving(false); if (!result.success) setError('Unable to revoke access.'); else await load(); };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading workers…</div>;
  return <div className="p-6 space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold text-gray-900">Workers</h2><p className="text-sm text-gray-500 mt-1">Assign employees and monitor job activity from one place.</p></div><button onClick={() => { setError(''); setShowAdd(true); }} className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"><Plus className="w-4 h-4" />Add worker</button></div>
    {error && <div className="p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>}
    {!workers.length ? <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-xl"><UserRound className="w-10 h-10 mx-auto text-gray-300" /><h3 className="mt-4 font-semibold text-gray-900">No workers have been added</h3><p className="mt-1 text-sm text-gray-500">Add employees from People to assign them to this job.</p><button onClick={() => setShowAdd(true)} className="mt-5 text-sm font-semibold text-orange-600 hover:text-orange-700">Add the first worker</button></div> : worker && <div className="space-y-5">
      <div className="flex gap-2 overflow-x-auto pb-1">{workers.map(item => <button key={item.id} onClick={() => setSelectedWorkerId(item.id)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border ${item.id === worker.id ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{item.displayName}</button>)}</div>
      <div className="border border-gray-200 rounded-xl p-6"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-gray-100 pb-5"><div><h3 className="text-xl font-bold text-gray-900">{worker.profileFirstName ? `${worker.profileFirstName} ${worker.profileLastName || ''}` : worker.displayName}</h3><p className="text-gray-500">{worker.occupation || 'Occupation not set'}</p>{worker.email && <p className="text-sm text-gray-500 mt-1">{worker.email}</p>}<InvitationStatus worker={worker} />{worker.profilePhone && <p className="text-sm text-gray-500">{worker.profilePhone}</p>}</div><div className="flex flex-wrap gap-2"><button onClick={() => void resend()} disabled={isSaving || !!worker.invitationRevokedAt} className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm"><RefreshCw className="w-4 h-4" />Resend</button><button onClick={() => void revoke()} disabled={isSaving || !!worker.invitationRevokedAt} className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm text-red-700"><Ban className="w-4 h-4" />Revoke</button><button onClick={() => setShowTasks(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-50"><CheckSquare className="w-4 h-4" />Assign Tasks</button></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5"><Info icon={<Clock3 />} label="Clock in" value={stamp(worker.currentWorkday?.clockInAt || worker.clockInAt)} /><Info icon={<Clock3 />} label="Clock out" value={stamp(worker.currentWorkday?.clockOutAt)} /><Info icon={<Clock3 />} label="Actual break" value={`${worker.currentWorkday?.actualBreakMinutes ?? 0}m`} /><Info icon={<Clock3 />} label="Actual lunch" value={`${worker.currentWorkday?.actualLunchMinutes ?? 0}m`} /><Info icon={<CheckSquare />} label="Tasks completed" value={`${completed}/${assignedTasks.length} assigned`} /></div>
        <div className="mt-5 text-sm text-gray-600"><strong>Daily history</strong>{workdays.length ? <ul className="mt-2 space-y-1">{workdays.map(day => <li key={day.localDate}>{day.localDate}: in {stamp(day.clockInAt)}, out {stamp(day.clockOutAt)} · worked {day.netWorkedMinutes ?? 0}m (break {day.actualBreakMinutes ?? 0}m, lunch {day.actualLunchMinutes ?? 0}m)</li>)}</ul> : <p className="mt-1">No completed workdays yet.</p>}</div>
      </div></div>}
    {showAdd && <Modal title="Add workers" onClose={() => setShowAdd(false)}><p className="text-sm text-gray-600 mb-4">Select one or more active employees from People.</p><select multiple value={selectedEmployeeIds} onChange={event => setSelectedEmployeeIds(Array.from(event.target.selectedOptions, option => option.value))} className="w-full min-h-36 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:outline-none">{selectableEmployees.map(employee => <option key={employee.id} value={employee.id}>{employee.name} {employee.employeeRole ? `— ${employee.employeeRole}` : ''}</option>)}</select><p className="text-xs text-gray-500 mt-2">Hold Command/Ctrl to select more than one worker.</p><div className="my-5 border-t" /><label className="block text-sm font-semibold text-gray-800 mb-2">Invite by email</label><input type="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="worker@example.com" className="w-full border border-gray-300 rounded-lg px-3 py-2" /><p className="text-xs text-gray-500 mt-2">Email is sent by the API. {/* TODO: Add SMS invitations in a future release. */}</p><div className="mt-6 flex justify-end gap-3"><button onClick={() => setShowAdd(false)} className="px-4 py-2 text-gray-700">Cancel</button><button disabled={isSaving} onClick={() => void saveWorkers()} className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 disabled:bg-orange-300 text-white rounded-lg"><Send className="w-4 h-4" />{isSaving ? 'Adding…' : 'Add workers'}</button></div></Modal>}
    {showTasks && worker && <Modal title={`Assign tasks to ${worker.displayName}`} onClose={() => setShowTasks(false)}><div className="space-y-2 max-h-80 overflow-y-auto">{tasks.length ? tasks.map(task => <label key={task.id} className="flex gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer"><input type="checkbox" checked={worker.assignedTaskIds.includes(task.id)} onChange={event => void saveTasks(event.target.checked ? [...worker.assignedTaskIds, task.id] : worker.assignedTaskIds.filter(id => id !== task.id))} className="mt-1" /><span><span className="block font-medium text-gray-900">{task.name}</span>{task.description && <span className="text-sm text-gray-500">{task.description}</span>}</span></label>) : <p className="text-sm text-gray-500">This work order has no tasks yet.</p>}</div><div className="mt-6 flex justify-end"><button onClick={() => setShowTasks(false)} className="px-4 py-2 bg-orange-600 text-white rounded-lg">Done</button></div></Modal>}
  </div>;
};

const Info: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => <div className="bg-gray-50 rounded-lg p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{icon}{label}</div><p className="mt-2 text-sm font-medium text-gray-900">{value}</p></div>;
const InvitationStatus: React.FC<{ worker: WorkOrderWorker }> = ({ worker }) => {
  if (worker.invitationRevokedAt) return <p className="text-sm text-red-700 mt-1">Invitation revoked.</p>;
  if (worker.onboardedAt) return <p className="text-sm text-green-700 mt-1">Worker onboarding completed {stamp(worker.onboardedAt)}.</p>;
  if (worker.invitationDeliveryStatus === 'accepted') return <p className="text-sm text-green-700 mt-1">Email provider accepted the invitation {stamp(worker.invitationSentAt)}. Inbox delivery and onboarding are not yet confirmed.</p>;
  if (worker.invitationDeliveryStatus === 'failed') return <p className="text-sm text-red-700 mt-1">Invitation was not sent ({worker.invitationDeliveryError === 'not_configured' ? 'email configuration needs attention' : worker.invitationDeliveryError || 'delivery failed'}). You can resend after resolving it.</p>;
  if (worker.invitationDeliveryStatus === 'pending') return <p className="text-sm text-amber-700 mt-1">Invitation is being prepared.</p>;
  return <p className="text-sm text-gray-500 mt-1">No invitation has been sent.</p>;
};
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-lg bg-white rounded-xl shadow-xl"><div className="flex items-center justify-between p-5 border-b"><h2 className="text-lg font-bold">{title}</h2><button onClick={onClose} className="p-1 text-gray-500 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button></div><div className="p-5">{children}</div></div></div>;
export default WorkersTab;
