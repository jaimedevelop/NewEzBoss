import { useState } from 'react';
import { Check, X, AlertCircle, Pause } from 'lucide-react';

interface ClientActionButtonsProps {
    estimateId: string;
    onApprove: () => void;
    onReject: (reason: string) => void;
    onHold: (reason?: string) => void;
    disabled: boolean;
}

export const ClientActionButtons = ({
    onApprove,
    onReject,
    onHold,
    disabled
}: ClientActionButtonsProps) => {
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showApproveConfirm, setShowApproveConfirm] = useState(false);
    const [showHoldModal, setShowHoldModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [holdReason, setHoldReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleApproveClick = () => {
        setShowApproveConfirm(true);
    };

    const handleApproveConfirm = async () => {
        setIsProcessing(true);
        try {
            await onApprove();
        } finally {
            setIsProcessing(false);
            setShowApproveConfirm(false);
        }
    };

    const handleRejectClick = () => {
        setShowRejectModal(true);
    };

    const handleRejectConfirm = async () => {
        if (!rejectionReason.trim()) return;

        setIsProcessing(true);
        try {
            await onReject(rejectionReason.trim());
        } finally {
            setIsProcessing(false);
            setShowRejectModal(false);
            setRejectionReason('');
        }
    };

    const handleHoldClick = () => {
        setShowHoldModal(true);
    };

    const handleHoldConfirm = async () => {
        setIsProcessing(true);
        try {
            await onHold(holdReason.trim() || undefined);
        } finally {
            setIsProcessing(false);
            setShowHoldModal(false);
            setHoldReason('');
        }
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow-sm p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Your Decision</h2>

                {disabled && (
                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-800">
                            Please fill in your name and email in the comments section above before approving or rejecting this estimate.
                        </p>
                    </div>
                )}

                <button
                    onClick={handleHoldClick}
                    disabled={disabled || isProcessing}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold mb-4"
                >
                    <Pause className="w-5 h-5" />
                    Put on Hold
                </button>

                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={handleApproveClick}
                        disabled={disabled || isProcessing}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
                    >
                        <Check className="w-5 h-5" />
                        Approve Estimate
                    </button>

                    <button
                        onClick={handleRejectClick}
                        disabled={disabled || isProcessing}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
                    >
                        <X className="w-5 h-5" />
                        Decline Estimate
                    </button>
                </div>
            </div>

            {/* Approve Confirmation Modal */}
            {showApproveConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-green-100 rounded-full">
                                <Check className="w-6 h-6 text-green-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Approve Estimate?</h3>
                        </div>

                        <p className="text-gray-600 mb-6">
                            Are you sure you want to approve this estimate? The contractor will be notified of your approval.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowApproveConfirm(false)}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApproveConfirm}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                {isProcessing ? 'Processing...' : 'Yes, Approve'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-full">
                                <X className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Reject Estimate</h3>
                        </div>

                        <p className="text-gray-600 mb-4">
                            Please provide a reason for rejecting this estimate. This will help the contractor understand your concerns.
                        </p>

                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none mb-4"
                            placeholder="Enter your reason for rejection..."
                            disabled={isProcessing}
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectionReason('');
                                }}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRejectConfirm}
                                disabled={isProcessing || !rejectionReason.trim()}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                {isProcessing ? 'Processing...' : 'Reject Estimate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hold Modal */}
            {showHoldModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-gray-100 rounded-full">
                                <Pause className="w-6 h-6 text-gray-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Put Estimate on Hold</h3>
                        </div>

                        <p className="text-gray-600 mb-4">
                            You can put this estimate on hold if you need more time to decide. Optionally provide a reason below.
                        </p>

                        <textarea
                            value={holdReason}
                            onChange={(e) => setHoldReason(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none mb-4"
                            placeholder="Optional: Enter your reason for putting this on hold..."
                            disabled={isProcessing}
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowHoldModal(false);
                                    setHoldReason('');
                                }}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleHoldConfirm}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
                            >
                                {isProcessing ? 'Processing...' : 'Put on Hold'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
