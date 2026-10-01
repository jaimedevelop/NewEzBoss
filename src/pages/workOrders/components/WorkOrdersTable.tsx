import React, { useCallback, useMemo, useRef } from 'react';
import { AlertCircle, ClipboardList, Calendar, ChevronDown, ExternalLink } from 'lucide-react';
import { WorkOrder } from '../../../services/workOrders/workOrders.types';
import { Link, useNavigate } from 'react-router-dom';

interface WorkOrdersTableProps {
    workOrders: WorkOrder[];
    isLoading: boolean;
    searchTerm: string;
    onNavigate: (id: string) => void;
}

const WorkOrdersTable: React.FC<WorkOrdersTableProps> = ({
    workOrders,
    isLoading,
    searchTerm,
    onNavigate
}) => {
    const navigate = useNavigate();
    const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

    const pendingReviewWorkOrders = useMemo(() => workOrders.filter(wo => wo.needsManagerReview === true), [workOrders]);

    const scrollToNextPendingReview = useCallback(() => {
        const next = pendingReviewWorkOrders.find(wo => {
            const row = wo.id && rowRefs.current.get(wo.id);
            return row && row.getBoundingClientRect().top > 8;
        }) || pendingReviewWorkOrders[0];
        const row = next?.id ? rowRefs.current.get(next.id) : undefined;
        row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [pendingReviewWorkOrders]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-700 border-green-200';
            case 'in-progress': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'review': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'revisions': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'pending': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getStatusLabel = (status: string) => {
        return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading work orders...</p>
            </div>
        );
    }

    if (workOrders.length === 0) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ClipboardList className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No work orders found</h3>
                <p className="text-gray-500 mt-1">
                    {searchTerm ? 'Try adjusting your search terms' : 'New work orders will appear here once generated'}
                </p>
            </div>
        );
    }

    return (
        <div className="relative bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                W.O. Number
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Customer
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Estimate
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {workOrders.map((wo) => (
                            <tr
                                key={wo.id}
                                ref={(row) => {
                                    if (wo.id) {
                                        if (row) rowRefs.current.set(wo.id, row);
                                        else rowRefs.current.delete(wo.id);
                                    }
                                }}
                                data-work-order-id={wo.id}
                                onClick={() => onNavigate(wo.id!)}
                                className={`hover:bg-gray-50 cursor-pointer transition-colors ${wo.needsManagerReview ? 'bg-amber-50/80 hover:bg-amber-100/80' : ''}`}
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <ClipboardList className="w-4 h-4 text-orange-500" />
                                        <Link
                                            to={`/work-orders/${wo.id}`}
                                            onClick={(event) => event.stopPropagation()}
                                            className="text-sm font-medium text-orange-600 hover:text-orange-800 hover:underline"
                                        >
                                            {wo.woNumber}
                                        </Link>
                                        {wo.needsManagerReview && (
                                            <span
                                                title="Needs management review"
                                                className="inline-flex text-amber-700"
                                            >
                                                <AlertCircle aria-label="Needs management review" className="w-4 h-4" />
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">
                                        {wo.customerName}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/estimates/${wo.estimateId}`);
                                        }}
                                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                        {wo.estimateNumber}
                                        <ExternalLink className="w-3 h-3" />
                                    </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Calendar className="w-4 h-4" />
                                        {wo.createdAt
                                            ? (typeof wo.createdAt === 'string'
                                                ? new Date(wo.createdAt).toLocaleDateString()
                                                : (wo.createdAt as any)?.toDate?.().toLocaleDateString() || 'N/A')
                                            : 'N/A'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(wo.status)}`}>
                                        {getStatusLabel(wo.status)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {pendingReviewWorkOrders.length > 0 && (
                <button
                    type="button"
                    onClick={scrollToNextPendingReview}
                    title="See the next work order that needs management review"
                    aria-label={`See ${pendingReviewWorkOrders.length} work order${pendingReviewWorkOrders.length === 1 ? '' : 's'} that need management review`}
                    className="fixed bottom-6 right-6 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg transition-transform hover:scale-105 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
                >
                    <ChevronDown className="h-6 w-6" />
                    <AlertCircle className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-white text-amber-600" />
                </button>
            )}
        </div>
    );
};

export default WorkOrdersTable;
