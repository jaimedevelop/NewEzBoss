// src/pages/workOrders/components/WorkOrderDashboard.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ClipboardList,
    CheckSquare,
    ListTodo,
    ImageIcon,
    TrendingUp,
    CheckCircle2,
    Users
} from 'lucide-react';
import { getWorkOrderApprovalState, getWorkOrderById, getWorkOrderWorkers } from '../../../services/workOrders/workOrders.queries';
import { approveWorkOrder, assignWorkerTasks, completeWorkOrder, recordWorkOrderOpened, requestWorkOrderRevisions, syncWorkOrderFromEstimate, updateWorkOrder, uploadWorkOrderTaskPhoto } from '../../../services/workOrders/workOrders.mutations';
import { WorkOrder, WorkOrderApprovalState, WorkOrderWorker } from '../../../services/workOrders/workOrders.types';
import { useAuthContext } from '../../../contexts/AuthContext';

import MaterialReadinessTab from './MaterialReadinessTab';
import TaskListTab from './TaskListTab';
import MediaTab from './MediaTab';
import MilestonesTab from './MilestonesTab';
import WorkersTab from './WorkersTab';
import DashboardHeader from '../../estimates/components/estimateDashboard/DashboardHeader';

const WorkOrderDashboard: React.FC = () => {
    const { woId } = useParams<{ woId: string }>();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const requestedTab = searchParams.get('tab');
    const activeTab = (['checklist', 'tasks', 'workers', 'media', 'milestones'].includes(requestedTab || '') ? requestedTab : searchParams.get('taskId') ? 'tasks' : 'checklist') as 'checklist' | 'tasks' | 'workers' | 'media' | 'milestones';
    const selectedTaskId = searchParams.get('taskId') || undefined;
    const [trackerWorkers, setTrackerWorkers] = useState<WorkOrderWorker[]>([]);
    const [trackerWorkersLoading, setTrackerWorkersLoading] = useState(false);
    const [trackerWorkersError, setTrackerWorkersError] = useState<string | null>(null);
    const [approvalState, setApprovalState] = useState<WorkOrderApprovalState | null>(null);
    const [trackerRefreshKey, setTrackerRefreshKey] = useState(0);
    const [openWorkersAdd, setOpenWorkersAdd] = useState(false);
    const trackerRequestSequence = useRef(0);
    const assignmentSaving = useRef(false);
    const requestSequence = useRef(0);
    const inFlight = useRef<Promise<void> | null>(null);
    const saving = useRef(false);
    const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [reviewAction, setReviewAction] = useState<'approve' | 'complete' | 'revisions' | null>(null);
    const [reviewError, setReviewError] = useState<string | null>(null);
    const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
    const [revisionReason, setRevisionReason] = useState('');
    const [reopenTaskIds, setReopenTaskIds] = useState<string[]>([]);
    const { currentUser, userProfile } = useAuthContext();
    const reviewActionInFlight = useRef(false);
    const accountName = [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ') || currentUser?.displayName || userProfile?.company || currentUser?.email || 'your account';

    useEffect(() => {
        if (woId) {
            void loadWorkOrder(true);
        }
    }, [woId]);

    const refreshTrackerWorkers = async () => {
        if (!workOrder?.id || assignmentSaving.current) return;
        const sequence = ++trackerRequestSequence.current;
        setTrackerWorkersLoading(true);
        setTrackerWorkersError(null);
        try {
            const [workers, approval] = await Promise.all([getWorkOrderWorkers(workOrder.id), getWorkOrderApprovalState(workOrder.id)]);
            if (sequence !== trackerRequestSequence.current || assignmentSaving.current) return;
            if (workers.success && workers.data) setTrackerWorkers(workers.data);
            else setTrackerWorkersError(workers.error || 'Unable to load workers.');
            if (approval.success && approval.data) setApprovalState(approval.data);
        } finally { if (sequence === trackerRequestSequence.current) setTrackerWorkersLoading(false); }
    };

    useEffect(() => {
        if (!workOrder?.id) return;
        void refreshTrackerWorkers();
    }, [workOrder?.id, workOrder?.updatedAt, trackerRefreshKey]);

    // Employee completion/photos are server-side writes. Refresh while this dashboard is visible
    // so task counts and the Media tab do not retain an optimistic stale snapshot.
    useEffect(() => {
        if (!woId) return;
        const refresh = () => { if (document.visibilityState === 'visible') void loadWorkOrder(); };
        window.addEventListener('focus', refresh);
        const interval = window.setInterval(refresh, 45_000);
        return () => { window.removeEventListener('focus', refresh); window.clearInterval(interval); };
    }, [woId]);

    useEffect(() => {
        if (!workOrder?.id) return;

        void recordWorkOrderOpened(workOrder.id)
            .catch(error => console.error('Error recording work order opening:', error));
    }, [workOrder?.id]);

    const loadWorkOrder = async (initial = false) => {
        if (saving.current && !initial) return;
        if (inFlight.current) return inFlight.current;
        const sequence = ++requestSequence.current;
        if (initial && !workOrder) setIsLoading(true);
        inFlight.current = (async () => {
            try {
                const synced = await syncWorkOrderFromEstimate(woId!);
                const response = synced.success ? synced : await getWorkOrderById(woId!);
                if (sequence === requestSequence.current && response.success && response.data) setWorkOrder(response.data);
            } catch (error) { console.error('Error loading work order:', error); }
        })();
        try { await inFlight.current; }
        finally { if (sequence === requestSequence.current) { inFlight.current = null; setIsLoading(false); } }
    };

    // The server returns a versioned snapshot. Failed/conflicting optimistic
    // changes are refreshed so the screen never keeps a false-success state.
    const saveWorkOrder = async (updates: Partial<WorkOrder>) => {
        if (!workOrder?.id) return false;
        saving.current = true;
        // Ignore a refresh that began before this edit; it may contain an older snapshot.
        requestSequence.current++;
        const result = await updateWorkOrder(workOrder.id, { ...updates, version: workOrder.version });
        saving.current = false;
        if (result.success && result.data) {
            requestSequence.current++;
            setWorkOrder(result.data);
            return true;
        }
        console.error('Unable to save work order:', result.error);
        await loadWorkOrder();
        return false;
    };

    const setDashboardLocation = (tab: typeof activeTab, taskId?: string) => {
        const next = new URLSearchParams(searchParams);
        next.set('tab', tab);
        if (taskId) next.set('taskId', taskId); else next.delete('taskId');
        setSearchParams(next);
    };

    const saveTaskAssignees = async (taskId: string, workerIds: string[]) => {
        if (!workOrder?.id || assignmentSaving.current) return false;
        assignmentSaving.current = true;
        // Any response that began before this save is stale relative to it.
        trackerRequestSequence.current++;
        const selected = new Set(workerIds);
        const changed = trackerWorkers.filter(worker => worker.assignedTaskIds.includes(taskId) !== selected.has(worker.id));
        const results = await Promise.all(changed.map(worker => assignWorkerTasks(workOrder.id!, worker.id, undefined, selected.has(worker.id) ? { addTaskId: taskId } : { removeTaskId: taskId })));
        if (results.some(result => !result.success || !result.data)) {
            assignmentSaving.current = false;
            setTrackerWorkersError('Assignment save failed. No local assignment state was changed.');
            await refreshTrackerWorkers();
            return false;
        }
        const updates = new Map(results.map(result => [result.data!.id, result.data!]));
        setTrackerWorkers(current => current.map(worker => updates.get(worker.id) || worker));
        assignmentSaving.current = false;
        return true;
    };

    const refreshReview = async (id: string) => {
        const [orderResult, approvalResult] = await Promise.all([getWorkOrderById(id), getWorkOrderApprovalState(id)]);
        if (orderResult.success && orderResult.data) setWorkOrder(orderResult.data);
        if (approvalResult.success && approvalResult.data) setApprovalState(approvalResult.data);
        return { orderResult, approvalResult };
    };

    const reviewFailureMessage = (error: unknown) => {
        const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'The review action could not be saved.';
        if (/401|unauthori[sz]ed|session|token/i.test(message)) return 'Your session or account access changed. Please sign in again and refresh this work order.';
        if (/403|forbidden/i.test(message)) return 'This account is not authorized to perform that review action.';
        if (/409|changed elsewhere|current version/i.test(message)) return 'This work order changed elsewhere. The latest review state has been loaded.';
        return message;
    };

    const runReviewAction = async (action: 'approve' | 'complete' | 'revisions') => {
        if (!workOrder.id || reviewActionInFlight.current) return;
        if (action === 'revisions' && (!revisionReason.trim() || !reopenTaskIds.length)) {
            setReviewError('Enter a revision reason and select at least one completed task to reopen.');
            return;
        }
        reviewActionInFlight.current = true;
        setReviewAction(action); setReviewError(null);
        const result = action === 'approve'
            ? await approveWorkOrder(workOrder.id, workOrder.version)
            : action === 'complete'
                ? await completeWorkOrder(workOrder.id, workOrder.version)
                : await requestWorkOrderRevisions(workOrder.id, workOrder.version, revisionReason.trim(), reopenTaskIds);
        if (result.success && result.data) {
            setWorkOrder(result.data);
            await refreshReview(workOrder.id);
            window.dispatchEvent(new Event('work-orders:review-updated'));
            if (action === 'revisions') { setRevisionDialogOpen(false); setRevisionReason(''); setReopenTaskIds([]); }
        } else {
            setReviewError(reviewFailureMessage(result.error));
            await refreshReview(workOrder.id);
        }
        reviewActionInFlight.current = false;
        setReviewAction(null);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    if (!workOrder) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900">Work Order Not Found</h2>
                <button
                    onClick={() => navigate('/work-orders')}
                    className="mt-4 text-orange-600 hover:text-orange-700 font-medium"
                >
                    Back to Work Orders
                </button>
            </div>
        );
    }

    const tabs = [
        { id: 'checklist', label: 'Material Readiness', icon: CheckSquare },
        { id: 'tasks', label: 'Task List', icon: ListTodo },
        { id: 'workers', label: 'Workers', icon: Users },
        { id: 'media', label: 'Docs & Photos', icon: ImageIcon },
        { id: 'milestones', label: 'Job Tracker', icon: TrendingUp },
    ];

    return (
        <div className="h-[calc(100vh-4rem)] lg:h-screen flex flex-col bg-gray-50">
            <div className="flex-shrink-0 space-y-4">
                <DashboardHeader
                    estimate={{
                        estimateNumber: workOrder.woNumber,
                        customerName: workOrder.customerName,
                    }}
                    icon={ClipboardList}
                    backTitle="Back to work orders"
                    onBack={() => navigate('/work-orders')}
                    showOptions={false}
                    secondaryInfo={
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-gray-600">
                            <span>{workOrder.customerName}</span>
                            <span className="text-gray-400">•</span>
                            <span>{workOrder.serviceAddress}</span>
                            <span className="text-gray-400">•</span>
                            <button
                                onClick={() => navigate(`/estimates/${workOrder.estimateId}`)}
                                className="hover:text-orange-600 hover:underline"
                            >
                                Estimate: <span className="font-semibold">{workOrder.estimateNumber}</span>
                            </button>
                        </div>
                    }
                />

                {/* Tabs Navigation */}
                <div className="mx-6 flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-px">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setDashboardLocation(tab.id as typeof activeTab)}
                            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${isActive
                                ? 'border-orange-600 text-orange-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
            {/* Tab Content Area */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm min-h-[400px]">
                <div hidden={activeTab !== 'checklist'}>
                    <MaterialReadinessTab
                        checklist={workOrder.checklist}
                        onToggleReady={async (itemId, currentStatus) => {
                            const updatedChecklist = workOrder.checklist.map(item =>
                                item.id === itemId ? { ...item, isReady: !currentStatus } : item
                            );
                            setWorkOrder({ ...workOrder, checklist: updatedChecklist });
                            await saveWorkOrder({ checklist: updatedChecklist });
                        }}
                        onMarkAllReady={async () => {
                            const updatedChecklist = workOrder.checklist.map(item => ({ ...item, isReady: true }));
                            setWorkOrder({ ...workOrder, checklist: updatedChecklist });
                            await saveWorkOrder({ checklist: updatedChecklist });
                        }}
                    />
                </div>

                <div hidden={activeTab !== 'tasks'}>
                    {uploadError && <div className="mx-6 mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{uploadError}</div>}
                    <TaskListTab
                        tasks={workOrder.tasks}
                        selectedTaskId={selectedTaskId}
                        uploadingTaskId={uploadingTaskId}
                        onToggleTask={async (taskId, currentStatus) => {
                            const updatedTasks = workOrder.tasks.map(task =>
                                task.id === taskId ? { ...task, isCompleted: !currentStatus, completedAt: !currentStatus ? new Date().toISOString() : undefined } : task
                            );
                            setWorkOrder({ ...workOrder, tasks: updatedTasks });
                            await saveWorkOrder({ tasks: updatedTasks });
                        }}
                        onUploadTaskMedia={async (taskId, file) => {
                            if (!workOrder.id || uploadingTaskId) return;
                            setUploadingTaskId(taskId);
                            setUploadError(null);
                            const result = await uploadWorkOrderTaskPhoto(workOrder.id, taskId, file);
                            setUploadingTaskId(null);
                            if (result.success && result.data) {
                                setWorkOrder(result.data);
                            } else {
                                setUploadError(result.error instanceof Error ? result.error.message : 'Photo upload failed. Please try again.');
                            }
                        }}
                        onRemoveTaskMedia={async (mediaId) => {
                            const media = workOrder.media.filter(item => item.id !== mediaId);
                            setWorkOrder({ ...workOrder, media });
                            if (!await saveWorkOrder({ media })) {
                                setUploadError('Picture removal could not be saved. Please try again.');
                            }
                        }}
                        onUpdateTaskMediaDescription={async (mediaId, description) => {
                            const media = workOrder.media.map(item => item.id === mediaId ? { ...item, description } : item);
                            setWorkOrder({ ...workOrder, media });
                            if (!await saveWorkOrder({ media })) {
                                setUploadError('Picture description could not be saved. Please try again.');
                            }
                        }}
                        onUpdateTaskNote={async (taskId, note) => {
                            const updatedTasks = workOrder.tasks.map(task =>
                                task.id === taskId ? { ...task, notes: note } : task
                            );
                            setWorkOrder({ ...workOrder, tasks: updatedTasks });
                            if (!await saveWorkOrder({ tasks: updatedTasks })) {
                                setUploadError('Note could not be saved. Please try again.');
                            }
                        }}
                    />
                </div>

                {workOrder.id && <div hidden={activeTab !== 'workers'}>
                    <WorkersTab workOrderId={workOrder.id} tasks={workOrder.tasks} selectedTaskId={selectedTaskId} openAddWorkers={openWorkersAdd} onAddWorkersOpened={() => setOpenWorkersAdd(false)} workers={trackerWorkers} workersLoading={trackerWorkersLoading} onWorkersChange={setTrackerWorkers} onRefreshWorkers={refreshTrackerWorkers} onWorkersChanged={() => setTrackerRefreshKey(value => value + 1)} />
                </div>}

                <div hidden={activeTab !== 'media'}>
                    <MediaTab
                        media={workOrder.media}
                        onUpload={(type) => {
                            console.log('Upload general media:', type);
                            // TODO: Integrate file upload
                        }}
                        onDelete={async (mediaId) => {
                            const updatedMedia = workOrder.media.filter(m => m.id !== mediaId);
                            setWorkOrder({ ...workOrder, media: updatedMedia });
                            await saveWorkOrder({ media: updatedMedia });
                        }}
                    />
                </div>

                <div hidden={activeTab !== 'milestones'}>
                    <MilestonesTab
                        workOrder={workOrder}
                        workers={trackerWorkers}
                        workersLoading={trackerWorkersLoading}
                        workersError={trackerWorkersError}
                        approvalState={approvalState}
                        onOpenMaterials={() => setDashboardLocation('checklist')}
                        onOpenTask={(taskId) => setDashboardLocation('tasks', taskId)}
                        onSaveTaskAssignees={saveTaskAssignees}
                        onAddWorkers={() => { setOpenWorkersAdd(true); setDashboardLocation('workers'); }}
                    />
                </div>
            </div>

            {/* Completion Section */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Completion & Review</h3>
                        <p className="text-gray-700 mb-4">Task completion evidence and manager approval are confirmed by the server.</p>
                        {reviewError && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{reviewError}</p>}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                            <div className="p-4 rounded-lg bg-white border border-orange-200">
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-900">Task completion evidence</span>
                                    <span className="text-xs text-gray-500">{workOrder.tasks.filter(task => task.isCompleted).length} of {workOrder.tasks.length} tasks completed</span>
                                </div>
                            </div>

                            <div className="p-4 rounded-lg bg-white border border-orange-200">
                                <span className="font-bold text-gray-900">Manager approval</span>
                                {approvalState?.currentApprovalId ? (() => { const approval = approvalState.history.find(event => event.id === approvalState.currentApprovalId); return <p className="mt-1 text-xs text-gray-500">Approved by {approval?.approverDisplayName || 'identity was not recorded'} on {approval ? new Date(approval.createdAt).toLocaleString() : 'timestamp unavailable'} · cycle {approval?.reviewCycle ?? approvalState.reviewCycle}</p>; })() : <p className="mt-1 text-xs text-gray-500">No current approval recorded.</p>}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[200px]">
                        <div className="bg-white p-3 rounded-lg border border-orange-200 text-center">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Revisions</span>
                            <span className="text-2xl font-bold text-gray-900">{workOrder.revisionCount}</span>
                            <span className="text-[10px] text-gray-400 mt-1 block">Review cycle {approvalState?.reviewCycle ?? workOrder.reviewCycle ?? 1}</span>
                        </div>
                        <button disabled={!approvalState?.eligibility.approve || reviewAction !== null} onClick={() => void runReviewAction('approve')} className="w-full py-3 bg-orange-600 disabled:bg-orange-300 text-white font-bold rounded-lg shadow-sm hover:bg-orange-700">{reviewAction === 'approve' ? 'Approving…' : `Approve as ${accountName}`}</button>
                        <button disabled={!approvalState?.eligibility.requestRevisions || reviewAction !== null} onClick={() => { setReviewError(null); setRevisionDialogOpen(true); }} className="w-full py-3 border border-orange-300 bg-white disabled:border-gray-200 disabled:text-gray-400 text-orange-800 font-bold rounded-lg hover:bg-orange-100">Request revisions</button>
                        <button
                            disabled={!approvalState?.eligibility.complete || reviewAction !== null || workOrder.status === 'completed'}
                            onClick={() => void runReviewAction('complete')}
                            className="w-full py-3 bg-green-600 disabled:bg-gray-300 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 className="w-5 h-5" />
                            {reviewAction === 'complete' ? 'Completing…' : workOrder.status === 'completed' ? 'Job completed' : 'Complete Job'}
                        </button>
                    </div>
                </div>
                {approvalState?.history.length ? <div className="mt-5 border-t border-orange-200 pt-4"><h4 className="font-semibold text-gray-900">Approval history</h4><ol className="mt-2 space-y-2">{[...approvalState.history].reverse().map(event => <li key={event.id} className="rounded-lg bg-white px-3 py-2 text-sm text-gray-700"><span className="font-medium">{event.action === 'approved' ? 'Approved' : event.action === 'revisions_requested' ? 'Revisions requested' : 'Approval invalidated'}</span> · cycle {event.reviewCycle} · {new Date(event.createdAt).toLocaleString()}{event.approverDisplayName ? ` · ${event.approverDisplayName}` : event.action === 'approved' ? ' · identity was not recorded' : ''}{event.reason ? ` · ${event.reason}` : ''}{event.reopenedTaskIds.length ? ` · reopened ${event.reopenedTaskIds.length} task${event.reopenedTaskIds.length === 1 ? '' : 's'}` : ''}</li>)}</ol></div> : null}
            </div>
            {revisionDialogOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="revision-title"><div className="w-full max-w-xl rounded-xl bg-white shadow-xl"><div className="border-b border-gray-200 p-5"><h2 id="revision-title" className="text-lg font-bold">Request revisions</h2><p className="mt-1 text-sm text-gray-600">Select completed tasks to reopen and explain the required changes.</p></div><div className="space-y-4 p-5"><label className="block text-sm font-medium">Reason<textarea value={revisionReason} disabled={reviewAction !== null} onChange={event => setRevisionReason(event.target.value)} maxLength={4000} className="mt-1 min-h-24 w-full rounded-lg border border-gray-300 p-2" /></label><fieldset disabled={reviewAction !== null}><legend className="text-sm font-medium">Tasks to reopen</legend><div className="mt-2 space-y-2">{workOrder.tasks.filter(task => task.isCompleted).map(task => <label key={task.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm"><input type="checkbox" checked={reopenTaskIds.includes(task.id)} onChange={event => setReopenTaskIds(current => event.target.checked ? [...current, task.id] : current.filter(id => id !== task.id))} />{task.name}</label>)}</div></fieldset></div><div className="flex justify-end gap-3 border-t border-gray-200 p-5"><button disabled={reviewAction !== null} onClick={() => setRevisionDialogOpen(false)} className="px-4 py-2 text-gray-700">Cancel</button><button disabled={reviewAction !== null} onClick={() => void runReviewAction('revisions')} className="rounded-lg bg-orange-600 px-4 py-2 font-medium text-white disabled:bg-orange-300">{reviewAction === 'revisions' ? 'Saving…' : 'Request revisions'}</button></div></div></div>}
            </div>
        </div>
    );
};

export default WorkOrderDashboard;
