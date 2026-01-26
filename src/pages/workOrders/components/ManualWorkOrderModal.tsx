// src/pages/workOrders/components/ManualWorkOrderModal.tsx

import React, { useState, useEffect } from 'react';
import { X, Search, FileText, User, MapPin, ClipboardList } from 'lucide-react';
import { getAllEstimates } from '../../../services/estimates/estimates.queries';
import { createWorkOrder } from '../../../services/workOrders/workOrders.mutations';
import { getLaborItem } from '../../../services/inventory/labor/labor.queries';
import { EstimateWithId } from '../../../services/estimates/estimates.types';
import { useAuthContext } from '../../../contexts/AuthContext';

interface ManualWorkOrderModalProps {
    onClose: () => void;
    onCreated: () => void;
}

const ManualWorkOrderModal: React.FC<ManualWorkOrderModalProps> = ({ onClose, onCreated }) => {
    const { currentUser } = useAuthContext();
    const [estimates, setEstimates] = useState<EstimateWithId[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEstimate, setSelectedEstimate] = useState<EstimateWithId | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadEstimates();
    }, []);

    const loadEstimates = async () => {
        setIsLoading(true);
        try {
            const data = await getAllEstimates();
            setEstimates(data);
        } catch (error) {
            console.error('Error loading estimates:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredEstimates = estimates.filter(est =>
        est.estimateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        est.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async () => {
        if (!selectedEstimate || !currentUser) return;

        setIsSubmitting(true);
        try {
            // 1. Process Labor Tasks
            const laborLineItems = (selectedEstimate.lineItems || []).filter(item => item.type === 'labor');
            const allTasks: any[] = [];

            for (const item of laborLineItems) {
                // Check both laborId and itemId as potential references to the labor record
                const laborRefId = item.laborId || item.itemId;

                if (laborRefId) {
                    const laborResult = await getLaborItem(laborRefId);
                    if (laborResult.success && laborResult.data && laborResult.data.tasks && laborResult.data.tasks.length > 0) {
                        const taskSteps = laborResult.data.tasks.map(task => ({
                            id: `${item.id}_${task.id}`,
                            name: task.name,
                            description: task.description || '',
                            isCompleted: false,
                            laborItemId: item.id,
                            laborItemName: item.description
                        }));
                        allTasks.push(...taskSteps);
                    } else {
                        // Fallback to the labor item itself if no sub-tasks found
                        allTasks.push({
                            id: item.id,
                            name: item.description,
                            description: item.notes || '',
                            isCompleted: false,
                            laborItemId: item.id,
                            laborItemName: item.description
                        });
                    }
                } else {
                    // Fallback for manual labor items
                    allTasks.push({
                        id: item.id,
                        name: item.description,
                        description: item.notes || '',
                        isCompleted: false,
                        laborItemId: item.id,
                        laborItemName: item.description
                    });
                }
            }

            // 2. Process Material Checklist (Draw ALL from estimate)
            // We include everything that is specifically product/tool/equipment 
            // OR items that are NOT labor (to catch custom/manual materials)
            const checklistItems = (selectedEstimate.lineItems || [])
                .filter(item => {
                    const type = (item.type || '').toLowerCase();
                    return ['product', 'tool', 'equipment'].includes(type) || (type !== 'labor' && type !== '');
                })
                .map(item => ({
                    id: item.id,
                    name: item.description,
                    type: (item.type as any) || 'product',
                    quantity: item.quantity,
                    isReady: false,
                    notes: item.notes || ''
                }));

            const workOrderData: any = {
                estimateId: selectedEstimate.id,
                estimateNumber: selectedEstimate.estimateNumber,
                customerName: selectedEstimate.customerName,
                serviceAddress: selectedEstimate.serviceAddress || 'Address not specified',
                status: 'pending',
                checklist: checklistItems,
                tasks: allTasks,
                media: [],
                milestones: [
                    { id: 'm1', name: 'Preparation', description: 'Gathering materials and tools', status: 'active' },
                    { id: 'm2', name: 'In Progress', description: 'Work is underway', status: 'pending' },
                    { id: 'm3', name: 'Review', description: 'Final inspection and sign-off', status: 'pending' }
                ],
                workerReviewed: false,
                contractorReviewed: false,
                revisionCount: 0,
                createdBy: currentUser.uid,
                poIds: []
            };

            const result = await createWorkOrder(workOrderData);
            if (result.success) {
                onCreated();
            }
        } catch (error) {
            console.error('Error creating work order:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-orange-50">
                    <div className="flex items-center gap-3">
                        <ClipboardList className="w-6 h-6 text-orange-600" />
                        <h2 className="text-xl font-bold text-gray-900">Create Manual Work Order</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-orange-100 rounded-lg transition-colors text-orange-400">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {!selectedEstimate ? (
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-700">Select an Estimate to begin</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by estimate number or customer..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 overflow-hidden max-h-60 overflow-y-auto">
                                {isLoading ? (
                                    <div className="p-8 text-center text-gray-400">Loading estimates...</div>
                                ) : filteredEstimates.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400 text-sm">No estimates found matching your search.</div>
                                ) : (
                                    filteredEstimates.map(est => (
                                        <button
                                            key={est.id}
                                            onClick={() => setSelectedEstimate(est)}
                                            className="w-full p-4 text-left hover:bg-orange-50 transition-colors flex items-center justify-between group"
                                        >
                                            <div>
                                                <p className="font-semibold text-gray-900 group-hover:text-orange-700 transition-colors">{est.estimateNumber}</p>
                                                <p className="text-sm text-gray-500">{est.customerName}</p>
                                            </div>
                                            <FileText className="w-5 h-5 text-gray-300 group-hover:text-orange-400 transition-colors" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
                                        <FileText className="w-4 h-4" />
                                        Estimate Info
                                    </div>
                                    <p className="font-bold text-gray-900">{selectedEstimate.estimateNumber}</p>
                                    <p className="text-sm text-gray-500">${selectedEstimate.total.toFixed(2)}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
                                        <User className="w-4 h-4" />
                                        Customer
                                    </div>
                                    <p className="font-bold text-gray-900">{selectedEstimate.customerName}</p>
                                    <p className="text-sm text-gray-500 truncate">{selectedEstimate.customerEmail}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-2 text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">
                                    <MapPin className="w-4 h-4" />
                                    Service Address
                                </div>
                                <p className="text-gray-900">{selectedEstimate.serviceAddress || 'No address specified'}</p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold text-gray-700 uppercase tracking-wider">Labor Tasks to Import</p>
                                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                                        {selectedEstimate.lineItems.filter(i => i.type === 'labor').length} Tasks
                                    </span>
                                </div>
                                <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 bg-white max-h-40 overflow-y-auto">
                                    {selectedEstimate.lineItems.filter(i => i.type === 'labor').map((item, idx) => (
                                        <div key={idx} className="p-3 text-sm flex items-start gap-3">
                                            <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400 mt-0.5">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{item.description}</p>
                                                {item.notes && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.notes}</p>}
                                            </div>
                                        </div>
                                    ))}
                                    {selectedEstimate.lineItems.filter(i => i.type === 'labor').length === 0 && (
                                        <div className="p-8 text-center text-gray-400 italic text-sm">No labor items found in this estimate.</div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedEstimate(null)}
                                className="text-xs text-orange-600 font-bold hover:underline"
                            >
                                Change Selected Estimate
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-500 font-bold hover:text-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={!selectedEstimate || isSubmitting}
                        onClick={handleSubmit}
                        className={`px-8 py-2 bg-orange-600 text-white font-bold rounded-xl shadow-lg transition-all hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white border-b-transparent rounded-full animate-spin" />
                        ) : null}
                        Create Work Order
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualWorkOrderModal;
