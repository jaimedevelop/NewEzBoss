// src/pages/workOrders/components/WorkOrderDashboard.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ClipboardList,
    CheckSquare,
    ListTodo,
    ImageIcon,
    TrendingUp,
    CheckCircle2,
    Users
} from 'lucide-react';
import { getWorkOrderById } from '../../../services/workOrders/workOrders.queries';
import { acknowledgeEstimateUpdate, recordWorkOrderOpened, updateWorkOrder, uploadWorkOrderTaskPhoto } from '../../../services/workOrders/workOrders.mutations';
import { isEstimateUpdateUnseen } from '../../../services/workOrders/workOrders.estimateUpdate';
import { WorkOrder } from '../../../services/workOrders/workOrders.types';

import MaterialReadinessTab from './MaterialReadinessTab';
import TaskListTab from './TaskListTab';
import MediaTab from './MediaTab';
import MilestonesTab from './MilestonesTab';
import WorkersTab from './WorkersTab';
import DashboardHeader from '../../estimates/components/estimateDashboard/DashboardHeader';

const WorkOrderDashboard: React.FC = () => {
    const { woId } = useParams<{ woId: string }>();
    const navigate = useNavigate();
    const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'checklist' | 'tasks' | 'workers' | 'media' | 'milestones'>('checklist');
    const acknowledgedEstimateUpdate = useRef<string | null>(null);
    const requestSequence = useRef(0);
    const inFlight = useRef<Promise<void> | null>(null);
    const saving = useRef(false);
    const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    useEffect(() => {
        if (woId) {
            acknowledgedEstimateUpdate.current = null;
            void loadWorkOrder(true);
        }
    }, [woId]);

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
        if (!workOrder?.id || !isEstimateUpdateUnseen(workOrder) ||
            acknowledgedEstimateUpdate.current === workOrder.estimateUpdatedAt) {
            return;
        }

        acknowledgedEstimateUpdate.current = workOrder.estimateUpdatedAt!;
        acknowledgeEstimateUpdate(workOrder.id, workOrder.estimateUpdatedAt!)
            .then(result => {
                if (result.success && result.data) {
                    setWorkOrder(current => current
                        ? { ...current, estimateUpdateSeenAt: result.data!.estimateUpdateSeenAt }
                        : current);
                }
            });
    }, [workOrder?.id, workOrder?.estimateUpdatedAt, workOrder?.estimateUpdateSeenAt]);

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
                const response = await getWorkOrderById(woId!);
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
                            onClick={() => setActiveTab(tab.id as any)}
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
                    <WorkersTab workOrderId={workOrder.id} tasks={workOrder.tasks} />
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
                    <MilestonesTab milestones={workOrder.milestones} />
                </div>
            </div>

            {/* Completion Section */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-blue-900 mb-2">Completion & Review</h3>
                        <p className="text-blue-700 mb-4">Finalize the job by completing the worker and contractor reviews. Track revisions if adjustments are needed.</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                            <div className={`p-4 rounded-lg bg-white border ${workOrder.workerReviewed ? 'border-green-200 bg-green-50' : 'border-blue-100'}`}>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={workOrder.workerReviewed}
                                        onChange={async (e) => {
                                            const reviewed = e.target.checked;
                                            setWorkOrder({ ...workOrder, workerReviewed: reviewed, workerReviewDate: reviewed ? new Date().toISOString() : undefined });
                                            await saveWorkOrder({ workerReviewed: reviewed });
                                        }}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900">Worker Review</span>
                                        <span className="text-xs text-gray-500">All tasks verified by field team</span>
                                    </div>
                                </label>
                            </div>

                            <div className={`p-4 rounded-lg bg-white border ${workOrder.contractorReviewed ? 'border-green-200 bg-green-50' : 'border-blue-100'}`}>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={workOrder.contractorReviewed}
                                        onChange={async (e) => {
                                            const reviewed = e.target.checked;
                                            setWorkOrder({ ...workOrder, contractorReviewed: reviewed, contractorReviewDate: reviewed ? new Date().toISOString() : undefined });
                                            await saveWorkOrder({ contractorReviewed: reviewed });
                                        }}
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900">Contractor Review</span>
                                        <span className="text-xs text-gray-500">Final sign-off by management</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[200px]">
                        <div className="bg-white p-3 rounded-lg border border-blue-200 text-center">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Revisions</span>
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={async () => {
                                        const count = Math.max(0, workOrder.revisionCount - 1);
                                        setWorkOrder({ ...workOrder, revisionCount: count });
                                        await saveWorkOrder({ revisionCount: count });
                                    }}
                                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                                >
                                    -
                                </button>
                                <span className="text-2xl font-bold text-blue-900">{workOrder.revisionCount}</span>
                                <button
                                    onClick={async () => {
                                        const count = workOrder.revisionCount + 1;
                                        setWorkOrder({ ...workOrder, revisionCount: count });
                                        await saveWorkOrder({ revisionCount: count });
                                    }}
                                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                                >
                                    +
                                </button>
                            </div>
                            <span className="text-[10px] text-gray-400 mt-1 block">Max 2 standard revisions</span>
                        </div>

                        <button
                            disabled={!workOrder.workerReviewed || !workOrder.contractorReviewed}
                            onClick={async () => {
                                setWorkOrder({ ...workOrder, status: 'completed' });
                                await saveWorkOrder({ status: 'completed' });
                            }}
                            className="w-full py-3 bg-green-600 disabled:bg-gray-300 text-white font-bold rounded-lg shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 className="w-5 h-5" />
                            Complete Job
                        </button>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default WorkOrderDashboard;
