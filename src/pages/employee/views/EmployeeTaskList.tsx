import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2 } from 'lucide-react';
import { completeEmployeeTask, getEmployeeTasks, uploadEmployeeTaskPhoto } from '../../../services/employee/employeeApi';
import type { EmployeeTask } from '../../../services/employee/employee.types';
import { Alert } from './EmployeeInviteView';

const TASK_REFRESH_INTERVAL_MS = 10_000;

const EmployeeTaskList: React.FC = () => {
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const refreshSequence = useRef(0);
  const pendingTaskId = useRef<string | null>(null);

  const load = useCallback(async (initial = false) => {
    if (pendingTaskId.current) return;
    if (refreshInFlight.current) return refreshInFlight.current;

    const sequence = ++refreshSequence.current;
    if (initial) setLoading(true);
    const request = (async () => {
      try {
        const response = await getEmployeeTasks();
        if (sequence !== refreshSequence.current) return;
        setError('');
        setTasks(response.tasks);
      } catch (e) {
        if (sequence === refreshSequence.current) {
          setError(e instanceof Error ? e.message : 'Unable to load assigned tasks.');
        }
      } finally {
        if (sequence === refreshSequence.current && initial) setLoading(false);
      }
    })();

    refreshInFlight.current = request;
    try {
      await request;
    } finally {
      if (refreshInFlight.current === request) refreshInFlight.current = null;
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  // Assignment changes are made by the contractor in another session. Keep this
  // view current while it is open, and immediately sync when it becomes visible.
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };

    const intervalId = window.setInterval(refreshIfVisible, TASK_REFRESH_INTERVAL_MS);
    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [load]);

  const refreshAfterWrite = () => {
    // Let a request from before the write finish before starting the authoritative
    // follow-up request; its response has already been invalidated above.
    const request = refreshInFlight.current;
    if (request) {
      void request.finally(() => { void load(); });
      return;
    }
    void load();
  };

  const complete = async (task: EmployeeTask) => {
    if (task.isCompleted) return;
    pendingTaskId.current = task.id;
    // A background response started before this write must not replace its result.
    refreshSequence.current++;
    setPending(task.id);
    try {
      const response = await completeEmployeeTask(task.id);
      setError('');
      setTasks(all => all.map(item => item.id === task.id ? response.task : item));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Task completion could not be confirmed.');
    } finally {
      pendingTaskId.current = null;
      setPending(null);
      refreshAfterWrite();
    }
  };

  const photo = async (task: EmployeeTask, file?: File) => {
    if (!file) return;
    const key = crypto.randomUUID().replace(/-/g, '');
    pendingTaskId.current = task.id;
    // A background response started before this write must not replace its result.
    refreshSequence.current++;
    setPending(task.id);
    try {
      const response = await uploadEmployeeTaskPhoto(task.id, file, key);
      setError('');
      setTasks(all => all.map(item => item.id === task.id
        ? { ...item, media: [...(item.media || []), response.media] }
        : item));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Photo upload could not be confirmed.');
    } finally {
      pendingTaskId.current = null;
      setPending(null);
      refreshAfterWrite();
    }
  };

  if (loading) return <section className="card text-center text-gray-600">Loading assigned tasks…</section>;

  return <section className="card space-y-4">
    <div className="flex justify-between gap-3"><h2 className="font-bold">Assigned tasks</h2></div>
    {error && <Alert>{error}</Alert>}
    {!tasks.length ? <p className="text-sm text-gray-600">No tasks are assigned to you yet.</p> : tasks.map(task => <article key={task.id} className="rounded-xl border border-slate-200 p-4"><div className="flex gap-3"><CheckCircle2 className={task.isCompleted ? 'text-green-600 shrink-0' : 'text-slate-300 shrink-0'} /><div className="min-w-0 flex-1"><h3 className="font-semibold">{task.name}</h3>{task.description && <p className="mt-1 text-sm text-gray-600">{task.description}</p>}{task.isCompleted ? <p className="mt-2 text-sm text-green-700">Completed {task.completedAt ? new Date(task.completedAt).toLocaleString() : ''}. This job task was already completed and cannot be undone.</p> : <button disabled={pending === task.id} onClick={() => void complete(task)} className="secondary mt-3">{pending === task.id ? 'Saving…' : 'Complete task'}</button>}<label className="secondary mt-3 ml-2 inline-flex cursor-pointer items-center gap-1"><Camera className="h-4 w-4" /> Add photo<input className="sr-only" type="file" accept="image/jpeg,image/png,image/gif,image/webp" capture="environment" disabled={pending === task.id} onChange={e => void photo(task, e.target.files?.[0])} /></label>{task.media?.length ? <div className="mt-3 flex flex-wrap gap-2">{task.media.map(photoItem => <figure key={photoItem.id} className="w-16"><img src={photoItem.thumbnailUrl || photoItem.url} alt={photoItem.fileName} className="h-16 w-16 rounded object-cover" /><figcaption className="mt-1 text-[10px] text-gray-500">{new Date(photoItem.uploadedAt).toLocaleDateString()}</figcaption></figure>)}</div> : null}</div></div></article>)}
  </section>;
};

export default EmployeeTaskList;
