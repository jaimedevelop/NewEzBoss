import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { isEstimateUpdateUnseen } from '../../services/workOrders/workOrders.estimateUpdate';
import { acknowledgeEstimateUpdate } from '../../services/workOrders/workOrders.mutations';
import { ApiError } from '../../services/estimates/estimatesApi';
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
    const workOrdersRef = useRef<WorkOrder[]>(workOrders);
    const attemptedAcknowledgements = useRef<Set<string>>(new Set());

    useEffect(() => {
        workOrdersRef.current = workOrders;
    }, [workOrders]);

    useEffect(() => {
        if (currentUser?.uid) {
            loadWorkOrders();
        }
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

    const markEstimateUpdateSeen = useCallback(async (workOrderId: string) => {
        const workOrder = workOrdersRef.current.find(wo => wo.id === workOrderId);
        if (!workOrder?.estimateUpdatedAt || !isEstimateUpdateUnseen(workOrder)) return;

        const attemptKey = `${workOrderId}:${workOrder.estimateUpdatedAt}`;
        if (attemptedAcknowledgements.current.has(attemptKey)) return;
        attemptedAcknowledgements.current.add(attemptKey);

        const previousSeenAt = workOrder.estimateUpdateSeenAt;

        // Update the list immediately so the alert disappears as soon as the
        // row has been inspected, then persist that acknowledgement.
        setWorkOrders(current => current.map(wo =>
            wo.id === workOrderId ? { ...wo, estimateUpdateSeenAt: wo.estimateUpdatedAt } : wo
        ));

        const result = await acknowledgeEstimateUpdate(workOrderId, workOrder.estimateUpdatedAt);
        if (result.success) {
            setWorkOrders(current => current.map(wo =>
                wo.id === workOrderId ? result.data! : wo
            ));
        } else if (result.error instanceof ApiError && result.error.status === 409) {
            const refreshed = await getWorkOrderById(workOrderId);
            if (refreshed.success && refreshed.data) {
                setWorkOrders(current => current.map(wo =>
                    wo.id === workOrderId ? refreshed.data! : wo
                ));
            }
        } else {
            setWorkOrders(current => current.map(wo =>
                wo.id === workOrderId ? { ...wo, estimateUpdateSeenAt: previousSeenAt } : wo
            ));
        }
    }, []);

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

            {/* Stats Quick View (Optional placeholder) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 text-blue-600 mb-2">
                        <Clock className="w-5 h-5" />
                        <span className="text-sm font-medium uppercase tracking-wider">In Progress</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {workOrders.filter(wo => wo.status === 'in-progress').length}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 text-purple-600 mb-2">
                        <Search className="w-5 h-5" />
                        <span className="text-sm font-medium uppercase tracking-wider">In Review</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {workOrders.filter(wo => wo.status === 'review').length}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 text-green-600 mb-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm font-medium uppercase tracking-wider">Completed</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {workOrders.filter(wo => wo.status === 'completed').length}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 text-orange-600 mb-2">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm font-medium uppercase tracking-wider">Revisions</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {workOrders.filter(wo => wo.status === 'revisions').length}
                    </p>
                </div>
            </div>

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
                onEstimateUpdateSeen={markEstimateUpdateSeen}
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
