import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Clock,
    CheckCircle2,
    AlertCircle,
    Plus,
    ClipboardList,
    ArrowUpDown,
    ChevronDown,
    X
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { getWorkOrders } from '../../services/workOrders/workOrders.queries';
import { getWorkOrderById } from '../../services/workOrders/workOrders.queries';
import { WorkOrder } from '../../services/workOrders/workOrders.types';
import type { WorkOrderCreation } from '../../services/workOrders/workOrders.factory';
import ManualWorkOrderModal from './components/ManualWorkOrderModal';
import WorkOrdersTable from './components/WorkOrdersTable';
import VariableHeader from '../../mainComponents/ui/VariableHeader';

const WorkOrdersHome: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuthContext();
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState('recent');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    useEffect(() => {
        if (currentUser?.uid) {
            loadWorkOrders();
        }
    }, [currentUser?.uid]);

    // Review requirements are server-owned. Refreshing on focus keeps the
    // persistent summary accurate after actions performed in another tab.
    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === 'visible' && currentUser?.uid) void loadWorkOrders();
        };
        window.addEventListener('focus', refresh);
        window.addEventListener('work-orders:review-updated', refresh);
        return () => {
            window.removeEventListener('focus', refresh);
            window.removeEventListener('work-orders:review-updated', refresh);
        };
    }, [currentUser?.uid]);

    useEffect(() => {
        if (!successMessage) return;
        const timeout = window.setTimeout(() => setSuccessMessage(null), 6000);
        return () => window.clearTimeout(timeout);
    }, [successMessage]);

    const loadWorkOrders = async () => {
        setIsLoading(true);
        try {
            const response = await getWorkOrders(currentUser!.uid);
            if (response.success && response.data) {
                setWorkOrders(response.data);
            }
        } catch (error) {
            console.error('Error loading work orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredWorkOrders = React.useMemo(() => {
        const matches = workOrders.filter(wo =>
            (statusFilter === 'all' || wo.status === statusFilter) &&
            (wo.woNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                wo.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                wo.estimateNumber.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        const dateValue = (value: WorkOrder['createdAt']) => {
            if (typeof value === 'string') {
                const timestamp = Date.parse(value);
                return Number.isFinite(timestamp) ? timestamp : null;
            }
            return null;
        };

        return [...matches].sort((a, b) => {
            if (sortOrder === 'recent') {
                const openedDifference = (Date.parse(b.lastOpenedAt || '') || 0) - (Date.parse(a.lastOpenedAt || '') || 0);
                if (openedDifference) return openedDifference;
            }

            const aDate = dateValue(a.createdAt);
            const bDate = dateValue(b.createdAt);
            if (aDate === null) return bDate === null ? 0 : 1;
            if (bDate === null) return -1;
            return sortOrder === 'date-asc' ? aDate - bDate : bDate - aDate;
        });
    }, [workOrders, searchTerm, statusFilter, sortOrder]);

    const pendingReviewWorkOrders = React.useMemo(
        () => workOrders.filter(workOrder => workOrder.needsManagerReview === true),
        [workOrders]
    );

    const handleWorkOrderCreated = async (workOrder: WorkOrderCreation) => {
        setShowCreateModal(false);
        setSuccessMessage(
            workOrder.alreadyExists
                ? `Work order number ${workOrder.woNumber} already exists.`
                : `Work order number ${workOrder.woNumber} created successfully.`
        );

        await loadWorkOrders();

        // A direct lookup keeps the newly created record visible after reload.
        const response = await getWorkOrderById(workOrder.id);
        if (response.success && response.data) {
            setWorkOrders(current => current.some(item => item.id === workOrder.id)
                ? current
                : [response.data!, ...current]);
        }
    };

    return (
        <div className="space-y-6">
            {successMessage && (
                <div role="status" className="fixed right-6 top-6 z-[110] flex max-w-md items-center gap-3 rounded-xl border border-green-200 bg-white px-4 py-3 text-sm font-semibold text-green-800 shadow-lg">
                    <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-green-600" />
                    <span>{successMessage}</span>
                    <button
                        type="button"
                        onClick={() => setSuccessMessage(null)}
                        aria-label="Dismiss work order confirmation"
                        className="ml-1 rounded p-1 text-green-700 hover:bg-green-50"
                    >
                        <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                </div>
            )}
            {/* Header */}
            <VariableHeader
                title="Work Orders"
                subtitle="Manage and track your active jobs"
                Icon={ClipboardList}
                rightAction={{
                    label: "New Work Order",
                    onClick: () => setShowCreateModal(true),
                    Icon: Plus
                }}
            />

            {pendingReviewWorkOrders.length > 0 && (
                <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 shadow-sm" aria-label="Needs management review">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="font-semibold">Needs management review ({pendingReviewWorkOrders.length})</p>
                            <p className="text-sm text-amber-800">Completed work is waiting for your decision.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {pendingReviewWorkOrders.map(workOrder => (
                                <button
                                    key={workOrder.id}
                                    type="button"
                                    onClick={() => navigate(`/work-orders/${workOrder.id}?tab=milestones`)}
                                    className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
                                >
                                    {workOrder.woNumber} — Review
                                </button>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Filters and Search */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by WO#, customer, or estimate..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-48 md:shrink-0">
                    <select
                        aria-label="Filter work orders by status"
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm leading-5 text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="revisions">Revisions</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                <div className="relative w-full md:w-56 md:shrink-0">
                    <ArrowUpDown aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-600" />
                    <select
                        aria-label="Sort work orders"
                        value={sortOrder}
                        onChange={(event) => setSortOrder(event.target.value)}
                        className="block w-full appearance-none rounded-md border border-orange-200 bg-orange-50 py-2 pl-9 pr-8 text-sm font-medium leading-5 text-orange-700 transition-colors cursor-pointer hover:bg-orange-100 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="recent">Recently Opened</option>
                        <option value="date-asc">Creation Date (Ascending)</option>
                        <option value="date-desc">Creation Date (Descending)</option>
                    </select>
                    <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-600" />
                </div>
            </div>

            <WorkOrdersTable
                workOrders={filteredWorkOrders}
                isLoading={isLoading}
                searchTerm={searchTerm}
                onNavigate={(id) => navigate(`/work-orders/${id}`)}
            />

            {showCreateModal && (
                <ManualWorkOrderModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={handleWorkOrderCreated}
                />
            )}
        </div>
    );
};

export default WorkOrdersHome;
