import React, { useState } from 'react';
import { CheckCircle2, Circle, ClipboardCheck, ListTodo, PackageCheck, Users, X } from 'lucide-react';
import type { WorkOrder, WorkOrderApprovalState, WorkOrderTask, WorkOrderWorker } from '../../../services/workOrders/workOrders.types';

interface Props {
    workOrder: WorkOrder;
    workers: WorkOrderWorker[];
    workersLoading: boolean;
    workersError?: string | null;
    approvalState?: WorkOrderApprovalState | null;
    onOpenMaterials: () => void;
    onOpenTask: (taskId: string) => void;
    onSaveTaskAssignees: (taskId: string, workerIds: string[]) => Promise<boolean>;
    onAddWorkers: () => void;
}

const MilestonesTab: React.FC<Props> = ({ workOrder, workers, workersLoading, workersError, approvalState, onOpenMaterials, onOpenTask, onSaveTaskAssignees, onAddWorkers }) => {
    const [pickerTaskId, setPickerTaskId] = useState<string | null>(null);
    const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
    const [isSavingAssignments, setIsSavingAssignments] = useState(false);
    const [assignmentError, setAssignmentError] = useState<string | null>(null);
    const readyCount = workOrder.checklist.filter(item => item.isReady).length;
    const completedCount = workOrder.tasks.filter(task => task.isCompleted).length;
    const materialComplete = workOrder.checklist.length > 0 && readyCount === workOrder.checklist.length;
    const tasksComplete = workOrder.tasks.length > 0 && completedCount === workOrder.tasks.length;
    const reviewComplete = workOrder.status === 'completed' || Boolean(workOrder.currentApprovalId);
    const latestApproval = approvalState?.history[approvalState.history.length - 1];
    const assigneesFor = (task: WorkOrderTask) => workers.filter(worker => worker.assignedTaskIds.includes(task.id));
    const openPicker = (task: WorkOrderTask) => { setPickerTaskId(task.id); setSelectedWorkerIds(assigneesFor(task).map(worker => worker.id)); setAssignmentError(null); };
    const pickerTask = workOrder.tasks.find(task => task.id === pickerTaskId);
    const savePicker = async () => {
        if (!pickerTask) return;
        setIsSavingAssignments(true); setAssignmentError(null);
        if (await onSaveTaskAssignees(pickerTask.id, selectedWorkerIds)) setPickerTaskId(null);
        else setAssignmentError('Unable to save assignments. Please try again.');
        setIsSavingAssignments(false);
    };
    const phases = [
        ['Preparation', materialComplete, !materialComplete && workOrder.status === 'pending', PackageCheck],
        ['In Progress', tasksComplete, !tasksComplete && ['in-progress', 'revisions'].includes(workOrder.status), ListTodo],
        ['Review', reviewComplete, ['review', 'revisions', 'completed'].includes(workOrder.status) && !reviewComplete, ClipboardCheck],
    ] as const;

    return <div className="p-4 sm:p-6">
        <div className="mb-5"><h3 className="text-lg font-bold text-gray-900">Job Progress Tracker</h3><p className="mt-1 text-sm text-gray-500">Live progress from this work order’s workflow.</p></div>
        <div className="grid gap-3 md:grid-cols-3">{phases.map(([name, complete, active, Icon]) => <div key={name} className={`rounded-xl border p-4 ${complete ? 'border-green-200 bg-green-50' : active ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}`}><div className="flex items-center gap-2"><span className={complete ? 'text-green-600' : active ? 'text-orange-600' : 'text-gray-400'}>{complete ? <CheckCircle2 className="h-5 w-5" /> : <Circle className={`h-5 w-5 ${active ? 'fill-current' : ''}`} />}</span><Icon className="h-4 w-4 text-gray-500" /><h4 className="font-semibold text-gray-900">{name}</h4></div><p className="mt-2 text-sm text-gray-600">{complete ? 'Complete' : active ? 'Current phase' : 'Not started'}</p></div>)}</div>

        <div className="mt-5 space-y-4">
            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="font-semibold text-gray-900">Preparation</h4><p className="mt-1 text-sm text-gray-600">{workOrder.checklist.length ? `${readyCount} of ${workOrder.checklist.length} materials, tools, and equipment ready` : 'No readiness items on this work order.'}</p></div><button onClick={onOpenMaterials} className="inline-flex items-center justify-center rounded-lg border border-orange-200 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-50">Material Readiness</button></div></section>
            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><h4 className="font-semibold text-gray-900">In Progress</h4><p className="text-sm text-gray-600">{completedCount} of {workOrder.tasks.length} tasks completed</p></div><span className="capitalize text-sm font-medium text-gray-500">{workOrder.status.replace('-', ' ')}</span></div>{workersError && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Assignments could not be refreshed. {workersError}</p>}{workersLoading && <p className="mt-4 text-sm text-gray-500">Loading task assignments…</p>}{!workersLoading && !workOrder.tasks.length && <p className="mt-4 text-sm text-gray-500">No tasks have been added to this work order.</p>}<div className="mt-4 divide-y divide-gray-100">{workOrder.tasks.map(task => { const assignees = assigneesFor(task); return <div key={task.id} className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><CheckCircle2 className={`h-4 w-4 shrink-0 ${task.isCompleted ? 'text-green-600' : 'text-gray-300'}`} /><span className={`font-medium ${task.isCompleted ? 'text-gray-600' : 'text-gray-900'}`}>{task.name}</span></div><p className="mt-1 text-sm text-gray-500">{assignees.length ? <><Users className="mr-1 inline h-3.5 w-3.5" />{assignees.map(worker => worker.displayName).join(', ')}</> : 'No worker assigned'}</p>{task.isCompleted && <p className="mt-1 text-xs text-green-700">Completed {task.completedAt ? new Date(task.completedAt).toLocaleString() : '— timestamp unavailable'}</p>}</div><div className="flex shrink-0 gap-3"><button onClick={() => onOpenTask(task.id)} className="text-sm font-medium text-orange-700 hover:text-orange-800 hover:underline">View task</button>{!workersLoading && <button onClick={() => openPicker(task)} className="rounded-lg border border-orange-200 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50">{assignees.length ? 'Edit assignees' : 'Assign'}</button>}</div></div>; })}</div></section>
            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5"><h4 className="font-semibold text-gray-900">Review</h4><p className="mt-1 text-sm text-gray-600">{workOrder.status === 'revisions' ? `${workOrder.revisionCount} revision${workOrder.revisionCount === 1 ? '' : 's'} requested` : reviewComplete ? 'Approved' : workOrder.status === 'review' || workOrder.needsManagerReview ? 'Pending approval' : 'Waiting for completed tasks'}</p>{latestApproval && <p className="mt-3 text-sm text-gray-600">{latestApproval.action === 'approved' ? 'Approved' : latestApproval.action === 'revisions_requested' ? 'Revisions requested' : 'Approval updated'} {latestApproval.action === 'approved' ? `by ${latestApproval.approverDisplayName || 'identity was not recorded'}` : ''} on {new Date(latestApproval.createdAt).toLocaleString()} · review cycle {latestApproval.reviewCycle}.</p>}<p className="mt-2 text-xs text-gray-500">Server-recorded revisions: {workOrder.revisionCount} · current review cycle {approvalState?.reviewCycle ?? workOrder.reviewCycle ?? 1}</p></section>
        </div>
        {pickerTask && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="task-assignment-title"><div className="w-full max-w-lg rounded-xl bg-white shadow-xl"><div className="flex items-center justify-between border-b p-5"><h2 id="task-assignment-title" className="text-lg font-bold">Assign “{pickerTask.name}”</h2><button aria-label="Close assignment picker" disabled={isSavingAssignments} onClick={() => setPickerTaskId(null)} className="rounded p-1 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button></div><div className="p-5">{assignmentError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{assignmentError}</p>}{workers.length ? <fieldset disabled={isSavingAssignments} className="space-y-2"><legend className="mb-3 text-sm text-gray-600">Choose one or more workers already on this work order.</legend>{workers.map(worker => <label key={worker.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3"><input type="checkbox" checked={selectedWorkerIds.includes(worker.id)} onChange={event => setSelectedWorkerIds(current => event.target.checked ? [...current, worker.id] : current.filter(id => id !== worker.id))} /><span className="font-medium text-gray-900">{worker.displayName}</span></label>)}</fieldset> : <div className="rounded-lg border border-dashed border-gray-300 p-5 text-center"><p className="text-sm text-gray-600">Add workers to this work order before assigning this task.</p><button onClick={() => { setPickerTaskId(null); onAddWorkers(); }} className="mt-3 font-medium text-orange-700 hover:underline">Add workers</button></div>}<div className="mt-6 flex justify-end gap-3"><button disabled={isSavingAssignments} onClick={() => setPickerTaskId(null)} className="px-4 py-2 text-gray-700">Cancel</button>{workers.length > 0 && <button disabled={isSavingAssignments} onClick={() => void savePicker()} className="rounded-lg bg-orange-600 px-4 py-2 text-white disabled:bg-orange-300">{isSavingAssignments ? 'Saving…' : 'Save assignments'}</button>}</div></div></div></div>}
    </div>;
};

export default MilestonesTab;
