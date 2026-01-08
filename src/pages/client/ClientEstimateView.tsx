import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getEstimateByToken } from '../../services/estimates/estimates.queries';
import { trackEmailOpen, addClientComment, handleClientResponse } from '../../services/estimates/estimates.mutations';
import type { EstimateWithId, ClientComment } from '../../services/estimates/estimates.types';
import { ClientCommentSection } from './components/ClientCommentSection';
import { ClientActionButtons } from './components/ClientActionButtons';
import { Loader2, FileText, Calendar, DollarSign, Mail, Phone } from 'lucide-react';

export const ClientEstimateView = () => {
    const { token } = useParams<{ token: string }>();
    const [estimate, setEstimate] = useState<EstimateWithId | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');

    useEffect(() => {
        const loadEstimate = async () => {
            if (!token) {
                setError('Invalid link');
                setLoading(false);
                return;
            }

            try {
                // Track that email was opened
                await trackEmailOpen(token);

                const data = await getEstimateByToken(token);
                if (!data) {
                    setError('Estimate not found or link has expired');
                } else {
                    setEstimate(data);
                    // Pre-fill client info from estimate
                    setClientName(data.customerName);
                    setClientEmail(data.customerEmail);
                }
            } catch (err) {
                console.error('Error loading estimate:', err);
                setError('Failed to load estimate');
            } finally {
                setLoading(false);
            }
        };

        loadEstimate();
    }, [token]);

    const handleAddComment = async (text: string) => {
        if (!estimate?.id) return;

        await addClientComment(estimate.id, {
            text,
            authorName: clientName || 'Client',
            authorEmail: clientEmail || 'unknown',
            isContractor: false
        });

        // Refresh estimate to show new comment
        const updated = await getEstimateByToken(token!);
        if (updated) setEstimate(updated);
    };

    const handleApprove = async () => {
        if (!estimate?.id) return;

        await handleClientResponse(
            estimate.id,
            'approved',
            clientName || 'Client',
            clientEmail || 'unknown'
        );

        // Refresh estimate
        const updated = await getEstimateByToken(token!);
        if (updated) setEstimate(updated);
    };

    const handleReject = async (reason: string) => {
        if (!estimate?.id) return;

        await handleClientResponse(
            estimate.id,
            'rejected',
            clientName || 'Client',
            clientEmail || 'unknown',
            reason
        );

        // Refresh estimate
        const updated = await getEstimateByToken(token!);
        if (updated) setEstimate(updated);
    };

    const handleHold = async (reason?: string) => {
        if (!estimate?.id) return;

        await handleClientResponse(
            estimate.id,
            'on-hold',
            clientName || 'Client',
            clientEmail || 'unknown',
            reason
        );

        // Refresh estimate
        const updated = await getEstimateByToken(token!);
        if (updated) setEstimate(updated);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading estimate...</p>
                </div>
            </div>
        );
    }

    if (error || !estimate) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-md">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Estimate Not Found</h1>
                    <p className="text-gray-600">{error || 'This estimate could not be found.'}</p>
                </div>
            </div>
        );
    }

    const isAlreadyResponded = estimate.clientApprovalStatus === 'approved' || 
                                 estimate.clientApprovalStatus === 'rejected' || 
                                 estimate.clientState === 'on-hold';

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Estimate {estimate.estimateNumber}
                            </h1>
                            <p className="text-gray-600">From your contractor</p>
                        </div>
                        {isAlreadyResponded && (
                            <div className={`px-4 py-2 rounded-lg ${estimate.clientApprovalStatus === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                {estimate.clientApprovalStatus === 'approved' ? '✓ Approved' : '✗ Rejected'}
                            </div>
                        )}
                        {estimate.clientState === 'on-hold' && (
                            <div className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800">
                                ⏸ On Hold
                            </div>
                        )}
                    </div>

                    {/* Customer Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <Mail className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="font-medium">{estimate.customerEmail}</p>
                            </div>
                        </div>
                        {estimate.customerPhone && (
                            <div className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">Phone</p>
                                    <p className="font-medium">{estimate.customerPhone}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {estimate.sentDate && (
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">Sent Date</p>
                                    <p className="font-medium">{new Date(estimate.sentDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                        )}
                        {estimate.validUntil && (
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5 text-gray-400" />
                                <div>
                                    <p className="text-sm text-gray-500">Valid Until</p>
                                    <p className="font-medium">{new Date(estimate.validUntil).toLocaleDateString()}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Line Items */}
                <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Items</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Description</th>
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Qty</th>
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Unit Price</th>
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {estimate.lineItems.map((item) => (
                                    <tr key={item.id} className="border-b border-gray-100">
                                        <td className="py-3 px-4">
                                            <div>
                                                <p className="font-medium text-gray-900">{item.description}</p>
                                                {item.notes && <p className="text-sm text-gray-500 mt-1">{item.notes}</p>}
                                            </div>
                                        </td>
                                        <td className="text-right py-3 px-4 text-gray-700">{item.quantity}</td>
                                        <td className="text-right py-3 px-4 text-gray-700">${item.unitPrice.toFixed(2)}</td>
                                        <td className="text-right py-3 px-4 font-medium text-gray-900">${item.total.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="mt-6 border-t border-gray-200 pt-4">
                        <div className="flex justify-end">
                            <div className="w-64 space-y-2">
                                <div className="flex justify-between text-gray-700">
                                    <span>Subtotal:</span>
                                    <span>${estimate.subtotal.toFixed(2)}</span>
                                </div>
                                {estimate.discount > 0 && (
                                    <div className="flex justify-between text-gray-700">
                                        <span>Discount:</span>
                                        <span>-${estimate.discount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-gray-700">
                                    <span>Tax ({estimate.taxRate}%):</span>
                                    <span>${estimate.tax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-300">
                                    <span>Total:</span>
                                    <span>${estimate.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {estimate.notes && (
                    <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Notes</h2>
                        <p className="text-gray-700 whitespace-pre-wrap">{estimate.notes}</p>
                    </div>
                )}

                {/* Comments */}
                <ClientCommentSection
                    estimateId={estimate.id!}
                    comments={estimate.clientComments || []}
                    onAddComment={handleAddComment}
                    clientName={clientName}
                    clientEmail={clientEmail}
                    onClientNameChange={setClientName}
                    onClientEmailChange={setClientEmail}
                />

                {/* Action Buttons */}
                {!isAlreadyResponded && (
                    <ClientActionButtons
                        estimateId={estimate.id!}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onHold={handleHold}
                        disabled={!clientName || !clientEmail}
                    />
                )}

                {/* Already Responded Message */}
                {isAlreadyResponded && (
                    <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                        {estimate.clientState === 'on-hold' ? (
                            <>
                                <p className="text-gray-600">
                                    You put this estimate on hold on{' '}
                                    {estimate.onHoldDate && new Date(estimate.onHoldDate).toLocaleDateString()}
                                </p>
                                {estimate.onHoldReason && (
                                    <p className="text-gray-500 mt-2">Reason: {estimate.onHoldReason}</p>
                                )}
                            </>
                        ) : (
                            <>
                                <p className="text-gray-600">
                                    You {estimate.clientApprovalStatus === 'approved' ? 'approved' : 'rejected'} this estimate on{' '}
                                    {estimate.clientApprovalDate && new Date(estimate.clientApprovalDate).toLocaleDateString()}
                                </p>
                                {estimate.rejectionReason && (
                                    <p className="text-gray-500 mt-2">Reason: {estimate.rejectionReason}</p>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
