// src/pages/workOrders/WorkOrdersHome.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardList,
    Plus,
    Search,
    Filter,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { getWorkOrders } from '../../services/workOrders/workOrders.queries';
import { WorkOrder } from '../../services/workOrders/workOrders.types';

const WorkOrdersHome: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuthContext();
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (currentUser?.uid) {
            loadWorkOrders();
        }
    }, [currentUser?.uid]);

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

    const filteredWorkOrders = workOrders.filter(wo =>
        wo.woNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.estimateNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ClipboardList className="w-8 h-8 text-orange-600" />
                        Work Orders
                    </h1>
                    <p className="text-gray-500 mt-1">Manage and track your active jobs</p>
                </div>

                <button
                    onClick={() => {/* TODO: Manual Create Modal */ }}
                    className="inline-flex items-center justify-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors shadow-sm gap-2"
                >
                    <Plus className="w-5 h-5" />
                    New Work Order
                </button>
            </div>

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
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by WO#, customer, or estimate..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="inline-flex items-center justify-center px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors gap-2">
                    <Filter className="w-5 h-5" />
                    Filters
                </button>
            </div>

            {/* Main List */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading work orders...</p>
                    </div>
                ) : filteredWorkOrders.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ClipboardList className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No work orders found</h3>
                        <p className="text-gray-500 mt-1">
                            {searchTerm ? 'Try adjusting your search terms' : 'New work orders will appear here once generated'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Work Order</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer / Estimate</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredWorkOrders.map((wo) => (
                                    <tr
                                        key={wo.id}
                                        onClick={() => navigate(`/work-orders/${wo.id}`)}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-gray-900">{wo.woNumber}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900">{wo.customerName}</p>
                                                <p className="text-sm text-gray-500">{wo.estimateNumber}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(wo.status)}`}>
                                                {wo.status.split('-').map(word => word.charAt(0)?.toUpperCase() + word.slice(1)).join(' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {typeof wo.createdAt === 'string'
                                                ? new Date(wo.createdAt).toLocaleDateString()
                                                : (wo.createdAt as any)?.toDate?.().toLocaleDateString() || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <ChevronRight className="w-5 h-5 text-gray-400" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkOrdersHome;
