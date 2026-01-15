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

    const settings = estimate.clientViewSettings || {
        displayMode: 'list',
        showItemPrices: true,
        showGroupPrices: true,
        showSubtotal: true,
        showTax: true,
        showTotal: true,
        hiddenLineItems: []
    };

    const getGroupedItems = () => {
        const visibleItems = (estimate.lineItems || []).filter(item => !settings.hiddenLineItems?.includes(item.id));

        if (settings.displayMode === 'list') {
            return [{ id: 'list', title: 'Items', description: '', items: visibleItems, showPrice: true }];
        }

        if (settings.displayMode === 'byType') {
            const groupsMap: Record<string, typeof visibleItems> = {};
            const typeLabels: Record<string, string> = {
                product: 'Materials',
                labor: 'Labor',
                tool: 'Tools',
                equipment: 'Equipment',
                custom: 'Other'
            };

            visibleItems.forEach(item => {
                const type = item.type || 'custom';
                if (!groupsMap[type]) groupsMap[type] = [];
                groupsMap[type].push(item);
            });

            return Object.entries(groupsMap).map(([type, items]) => ({
                id: type,
                title: typeLabels[type] || 'Other',
                description: '',
                items,
                showPrice: true
            }));
        }

        if (settings.displayMode === 'byGroup') {
            const groupsMap: Record<string, { title: string, description?: string, items: typeof visibleItems, showPrice: boolean }> = {};
            const groupDefinitions = estimate.groups || [];

            groupDefinitions.forEach(g => {
                groupsMap[g.id] = { title: g.name, description: g.description, items: [], showPrice: g.showPrice };
            });
            groupsMap['other'] = { title: 'General', items: [], showPrice: true };

            visibleItems.forEach(item => {
                const groupId = item.groupId && groupsMap[item.groupId] ? item.groupId : 'other';
                groupsMap[groupId].items.push(item);
            });

            return Object.entries(groupsMap)
                .filter(([_, data]) => data.items.length > 0)
                .map(([id, data]) => ({ id, ...data }));
        }

        return [];
    };

    const groupedItems = getGroupedItems();

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
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Estimate Details</h2>

                    <div className="space-y-10">
                        {groupedItems.map((group) => {
                            const groupTotal = group.items.reduce((sum, item) => sum + item.total, 0);

                            return (
                                <div key={group.id} className="space-y-4">
                                    <div className="flex items-baseline justify-baseline gap-4 border-b border-gray-100 pb-2">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-800">{group.title}</h3>
                                            {group.description && <p className="text-sm text-gray-500">{group.description}</p>}
                                        </div>
                                        {settings.showGroupPrices && group.showPrice && settings.displayMode !== 'list' && (
                                            <span className="text-lg font-bold text-gray-900">${groupTotal.toFixed(2)}</span>
                                        )}
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                    <th className="py-2 px-2">Description</th>
                                                    <th className="py-2 px-2 text-right w-16">Qty</th>
                                                    {settings.showItemPrices && group.showPrice && (
                                                        <>
                                                            <th className="py-2 px-2 text-right w-32">Unit Price</th>
                                                            <th className="py-2 px-2 text-right w-32">Total</th>
                                                        </>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {group.items.map((item) => (
                                                    <tr key={item.id} className="text-sm">
                                                        <td className="py-3 px-2">
                                                            <p className="font-medium text-gray-900">{item.description}</p>
                                                            {item.notes && <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>}
                                                        </td>
                                                        <td className="py-3 px-2 text-right text-gray-600">{item.quantity}</td>
                                                        {settings.showItemPrices && group.showPrice && (
                                                            <>
                                                                <td className="py-3 px-2 text-right text-gray-600">${item.unitPrice.toFixed(2)}</td>
                                                                <td className="py-3 px-2 text-right font-medium text-gray-900">${item.total.toFixed(2)}</td>
                                                            </>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Totals */}
                    {(settings.showSubtotal || settings.showTax || settings.showTotal) && (
                        <div className="mt-12 border-t border-gray-200 pt-8">
                            <div className="flex justify-end">
                                <div className="w-full max-w-xs space-y-3">
                                    {settings.showSubtotal && (
                                        <div className="flex justify-between text-gray-600">
                                            <span>Subtotal</span>
                                            <span className="font-medium">${estimate.subtotal.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {estimate.discount > 0 && (
                                        <div className="flex justify-between text-green-600">
                                            <span>Discount</span>
                                            <span className="font-medium">-${estimate.discount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {settings.showTax && (
                                        <div className="flex justify-between text-gray-600">
                                            <span>Tax ({estimate.taxRate}%)</span>
                                            <span className="font-medium">${estimate.tax.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {settings.showTotal && (
                                        <div className="flex justify-between text-2xl font-bold text-gray-900 pt-3 border-t border-gray-100">
                                            <span>Total</span>
                                            <span>${estimate.total.toFixed(2)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
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
