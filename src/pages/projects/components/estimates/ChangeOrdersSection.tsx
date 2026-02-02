import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ExternalLink, Copy, Trash2 } from 'lucide-react';
import { Alert } from '../../../../mainComponents/ui/Alert';
import {
    getAllEstimates,
    type EstimateWithId,
    duplicateEstimate,
    deleteEstimate
} from '../../../../services/estimates';

interface ChangeOrdersSectionProps {
    projectId: string;
}

export const ChangeOrdersSection: React.FC<ChangeOrdersSectionProps> = ({ projectId }) => {
    const navigate = useNavigate();
    const [changeOrders, setChangeOrders] = useState<EstimateWithId[]>([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

    useEffect(() => {
        loadChangeOrders();
    }, [projectId]);

    const loadChangeOrders = async () => {
        try {
            setLoading(true);
            const estimatesData = await getAllEstimates();
            // Filter for change orders associated with this project
            const projectChangeOrders = estimatesData.filter(
                est => est.projectId === projectId && est.estimateState === 'change-order'
            );
            setChangeOrders(projectChangeOrders);
        } catch (error) {
            console.error('Error loading change orders:', error);
            setAlert({ type: 'error', message: 'Failed to load change orders. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDuplicate = async (estimateId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await duplicateEstimate(estimateId);
            await loadChangeOrders();
            setAlert({ type: 'success', message: 'Change order duplicated successfully!' });
        } catch (error) {
            setAlert({ type: 'error', message: 'Failed to duplicate change order.' });
            console.error('Error duplicating change order:', error);
        }
    };

    const handleDelete = async (estimateId: string, estimateNumber: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete change order ${estimateNumber}? This action cannot be undone.`)) {
            try {
                await deleteEstimate(estimateId);
                await loadChangeOrders();
                setAlert({ type: 'success', message: 'Change order deleted successfully!' });
            } catch (error) {
                setAlert({ type: 'error', message: 'Failed to delete change order.' });
                console.error('Error deleting change order:', error);
            }
        }
    };

    const handleChangeOrderClick = (estimateId: string) => {
        navigate(`/estimates/${estimateId}`);
    };

    const handleParentEstimateClick = (parentEstimateId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/estimates/${parentEstimateId}`);
    };

    const getClientStateColor = (clientState?: string | null) => {
        switch (clientState) {
            case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'viewed': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'accepted': return 'bg-green-100 text-green-700 border-green-200';
            case 'denied': return 'bg-red-100 text-red-700 border-red-200';
            case 'on-hold': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'expired': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getClientStateLabel = (clientState?: string | null) => {
        if (!clientState) return 'Draft';
        return clientState.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {alert && (
                <Alert type={alert.type} onClose={() => setAlert(null)}>
                    {alert.message}
                </Alert>
            )}

            {changeOrders.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-orange-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Change Orders Yet</h3>
                        <p className="text-gray-500 max-w-md">
                            Change orders for this project will appear here when created.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        C.O. Number
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Parent Estimate
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {changeOrders.map((changeOrder) => (
                                    <tr
                                        key={changeOrder.id}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => handleChangeOrderClick(changeOrder.id)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-orange-500" />
                                                <span className="text-sm font-medium text-orange-600 hover:text-orange-800 hover:underline">
                                                    {changeOrder.estimateNumber}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {changeOrder.parentEstimateId ? (
                                                <button
                                                    onClick={(e) => handleParentEstimateClick(changeOrder.parentEstimateId!, e)}
                                                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                                >
                                                    View Parent
                                                    <ExternalLink className="w-3 h-3" />
                                                </button>
                                            ) : (
                                                <span className="text-sm text-gray-400">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {changeOrder.customerName}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {changeOrder.customerEmail}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {changeOrder.createdDate
                                                ? new Date(changeOrder.createdDate).toLocaleDateString()
                                                : changeOrder.createdAt
                                                    ? new Date((changeOrder.createdAt as any).toDate?.() || changeOrder.createdAt).toLocaleDateString()
                                                    : 'N/A'
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getClientStateColor(changeOrder.clientState)}`}>
                                                {getClientStateLabel(changeOrder.clientState)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            ${changeOrder.total?.toFixed(2) || '0.00'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleDuplicate(changeOrder.id, e)}
                                                    className="text-gray-400 hover:text-green-600 p-1 transition-colors"
                                                    title="Duplicate change order"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(changeOrder.id, changeOrder.estimateNumber, e)}
                                                    className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                                                    title="Delete change order"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChangeOrdersSection;
