import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, DollarSign, Copy, Trash2 } from 'lucide-react';
import { Alert } from '../../../../mainComponents/ui/Alert';
import {
    getAllEstimates,
    type EstimateWithId,
    duplicateEstimate,
    deleteEstimate
} from '../../../../services/estimates';

interface PayAppsSectionProps {
    projectId: string;
}

export const PayAppsSection: React.FC<PayAppsSectionProps> = ({ projectId }) => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<EstimateWithId[]>([]);
    const [loading, setLoading] = useState(true);
    const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

    useEffect(() => {
        loadInvoices();
    }, [projectId]);

    const loadInvoices = async () => {
        try {
            setLoading(true);
            const estimatesData = await getAllEstimates();
            // Filter for invoices associated with this project
            const projectInvoices = estimatesData.filter(
                est => est.projectId === projectId && est.estimateState === 'invoice'
            );
            setInvoices(projectInvoices);
        } catch (error) {
            console.error('Error loading invoices:', error);
            setAlert({ type: 'error', message: 'Failed to load payment applications. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    const handleDuplicate = async (estimateId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await duplicateEstimate(estimateId);
            await loadInvoices();
            setAlert({ type: 'success', message: 'Invoice duplicated successfully!' });
        } catch (error) {
            setAlert({ type: 'error', message: 'Failed to duplicate invoice.' });
            console.error('Error duplicating invoice:', error);
        }
    };

    const handleDelete = async (estimateId: string, estimateNumber: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete invoice ${estimateNumber}? This action cannot be undone.`)) {
            try {
                await deleteEstimate(estimateId);
                await loadInvoices();
                setAlert({ type: 'success', message: 'Invoice deleted successfully!' });
            } catch (error) {
                setAlert({ type: 'error', message: 'Failed to delete invoice.' });
                console.error('Error deleting invoice:', error);
            }
        }
    };

    const handleInvoiceClick = (estimateId: string) => {
        navigate(`/estimates/${estimateId}`);
    };

    const calculatePaymentInfo = (invoice: EstimateWithId) => {
        const totalBilled = invoice.total || 0;
        const totalPaid = invoice.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
        const balance = totalBilled - totalPaid;
        const percentPaid = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0;

        return { totalBilled, totalPaid, balance, percentPaid };
    };

    const getPaymentStatusColor = (percentPaid: number) => {
        if (percentPaid >= 100) return 'bg-green-100 text-green-700 border-green-200';
        if (percentPaid >= 50) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        if (percentPaid > 0) return 'bg-orange-100 text-orange-700 border-orange-200';
        return 'bg-red-100 text-red-700 border-red-200';
    };

    const getPaymentStatusLabel = (percentPaid: number) => {
        if (percentPaid >= 100) return 'Paid';
        if (percentPaid > 0) return 'Partial';
        return 'Unpaid';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    const totalBilledSum = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPaidSum = invoices.reduce((sum, inv) => {
        return sum + (inv.payments?.reduce((pSum, p) => pSum + p.amount, 0) || 0);
    }, 0);
    const totalBalanceSum = totalBilledSum - totalPaidSum;

    return (
        <div className="space-y-4">
            {alert && (
                <Alert type={alert.type} onClose={() => setAlert(null)}>
                    {alert.message}
                </Alert>
            )}

            {/* Summary Cards */}
            {invoices.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Billed</p>
                                <p className="text-2xl font-bold text-gray-900">${totalBilledSum.toFixed(2)}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Total Paid</p>
                                <p className="text-2xl font-bold text-green-600">${totalPaidSum.toFixed(2)}</p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">Balance Due</p>
                                <p className="text-2xl font-bold text-orange-600">${totalBalanceSum.toFixed(2)}</p>
                            </div>
                            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                <DollarSign className="w-6 h-6 text-orange-600" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {invoices.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12">
                    <div className="flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-green-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Invoices Yet</h3>
                        <p className="text-gray-500 max-w-md">
                            Payment applications and invoices for this project will appear here.
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
                                        Invoice #
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Paid
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Balance
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {invoices.map((invoice) => {
                                    const paymentInfo = calculatePaymentInfo(invoice);
                                    return (
                                        <tr
                                            key={invoice.id}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                            onClick={() => handleInvoiceClick(invoice.id)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-green-500" />
                                                    <span className="text-sm font-medium text-green-600 hover:text-green-800 hover:underline">
                                                        {invoice.estimateNumber}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {invoice.customerName}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {invoice.customerEmail}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {invoice.createdDate
                                                    ? new Date(invoice.createdDate).toLocaleDateString()
                                                    : invoice.createdAt
                                                        ? new Date((invoice.createdAt as any).toDate?.() || invoice.createdAt).toLocaleDateString()
                                                        : 'N/A'
                                                }
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                ${paymentInfo.totalBilled.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                                ${paymentInfo.totalPaid.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                                                ${paymentInfo.balance.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="space-y-1">
                                                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getPaymentStatusColor(paymentInfo.percentPaid)}`}>
                                                        {getPaymentStatusLabel(paymentInfo.percentPaid)}
                                                    </span>
                                                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                        <div
                                                            className="bg-green-600 h-1.5 rounded-full transition-all"
                                                            style={{ width: `${Math.min(paymentInfo.percentPaid, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => handleDuplicate(invoice.id, e)}
                                                        className="text-gray-400 hover:text-green-600 p-1 transition-colors"
                                                        title="Duplicate invoice"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDelete(invoice.id, invoice.estimateNumber, e)}
                                                        className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                                                        title="Delete invoice"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayAppsSection;
