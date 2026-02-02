import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Copy, Trash2 } from 'lucide-react';
import { Alert } from '../../../../mainComponents/ui/Alert';
import {
    getAllEstimates,
    type EstimateWithId,
    duplicateEstimate,
    deleteEstimate
} from '../../../../services/estimates';

interface EstimatesSectionProps {
    projectId: string;
}

export const EstimatesSection: React.FC<EstimatesSectionProps> = ({ projectId }) => {
    const navigate = useNavigate();
    const [estimates, setEstimates] = useState<EstimateWithId[]>([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

    useEffect(() => {
        loadEstimates();
    }, [projectId]);

    const loadEstimates = async () => {
        try {
            setLoading(true);
            const estimatesData = await getAllEstimates();
            // Filter estimates by projectId
            const projectEstimates = estimatesData.filter(est => est.projectId === projectId);
            setEstimates(projectEstimates);
        } catch (error) {
            console.error('Error loading estimates:', error);
            setAlert({ type: 'error', message: 'Failed to load estimates. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDuplicate = async (estimateId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await duplicateEstimate(estimateId);
            await loadEstimates();
            setAlert({ type: 'success', message: 'Estimate duplicated successfully!' });
        } catch (error) {
            setAlert({ type: 'error', message: 'Failed to duplicate estimate.' });
            console.error('Error duplicating estimate:', error);
        }
    };

    const handleDelete = async (estimateId: string, estimateNumber: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete estimate ${estimateNumber}? This action cannot be undone.`)) {
            try {
                await deleteEstimate(estimateId);
                await loadEstimates();
                setAlert({ type: 'success', message: 'Estimate deleted successfully!' });
            } catch (error) {
                setAlert({ type: 'error', message: 'Failed to delete estimate.' });
                console.error('Error deleting estimate:', error);
            }
        }
    };

    const handleEstimateClick = (estimateId: string) => {
        navigate(`/estimates/${estimateId}`);
    };

    const getEstimateStateColor = (estimateState: string) => {
        switch (estimateState) {
            case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'estimate': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'invoice': return 'bg-green-100 text-green-700 border-green-200';
            case 'change-order': return 'bg-orange-100 text-orange-700 border-orange-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getEstimateStateLabel = (estimateState: string) => {
        switch (estimateState) {
            case 'draft': return 'Draft';
            case 'estimate': return 'Estimate';
            case 'invoice': return 'Invoice';
            case 'change-order': return 'Change Order';
            default: return estimateState;
        }
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

            {estimates.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Estimates Yet</h3>
                        <p className="text-gray-500 max-w-md">
                            Estimates associated with this project will appear here.
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
                                        Estimate #
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {estimates.map((estimate) => (
                                    <tr
                                        key={estimate.id}
                                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        onClick={() => handleEstimateClick(estimate.id)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-blue-500" />
                                                <span className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                                                    {estimate.estimateNumber}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {estimate.customerName}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {estimate.customerEmail}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {estimate.createdDate
                                                ? new Date(estimate.createdDate).toLocaleDateString()
                                                : estimate.createdAt
                                                    ? new Date((estimate.createdAt as any).toDate?.() || estimate.createdAt).toLocaleDateString()
                                                    : 'N/A'
                                            }
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getEstimateStateColor(estimate.estimateState)}`}>
                                                {getEstimateStateLabel(estimate.estimateState)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getClientStateColor(estimate.clientState)}`}>
                                                {getClientStateLabel(estimate.clientState)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            ${estimate.total?.toFixed(2) || '0.00'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => handleDuplicate(estimate.id, e)}
                                                    className="text-gray-400 hover:text-green-600 p-1 transition-colors"
                                                    title="Duplicate estimate"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(estimate.id, estimate.estimateNumber, e)}
                                                    className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                                                    title="Delete estimate"
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

export default EstimatesSection;
