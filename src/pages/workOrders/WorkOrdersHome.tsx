import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Filter,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { getWorkOrders } from '../../services/workOrders/workOrders.queries';
import { WorkOrder } from '../../services/workOrders/workOrders.types';
import ManualWorkOrderModal from './components/ManualWorkOrderModal';
import WorkOrdersHeader from './components/WorkOrdersHeader';
import WorkOrdersTable from './components/WorkOrdersTable';

const WorkOrdersHome: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuthContext();
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

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

    const filteredWorkOrders = workOrders.filter(wo =>
        wo.woNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wo.estimateNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <WorkOrdersHeader onCreate={() => setShowCreateModal(true)} />

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

            <WorkOrdersTable
                workOrders={filteredWorkOrders}
                isLoading={isLoading}
                searchTerm={searchTerm}
                onNavigate={(id) => navigate(`/work-orders/${id}`)}
            />

            {showCreateModal && (
                <ManualWorkOrderModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => {
                        setShowCreateModal(false);
                        loadWorkOrders();
                    }}
                />
            )}
        </div>
    );
};

export default WorkOrdersHome;

