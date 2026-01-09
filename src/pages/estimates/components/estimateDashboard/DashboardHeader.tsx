import React, { useState } from 'react';
import { ArrowLeft, FileText, Download, Mail, Printer, Edit, MoreVertical, Send, Loader2, UserPlus, Pause, Play, FileEdit, DollarSign, Lock, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TaxConfigModal from './TaxConfigModal';
import { prepareEstimateForSending } from '../../../../services/estimates/estimates.mutations';
import { sendEstimateEmail } from '../../../../services/email';

interface DashboardHeaderProps {
  estimate: {
    id?: string;
    estimateNumber: string;
    customerName: string;
    customerEmail: string;
    estimateState: string;
    clientState?: string | null;
    parentEstimateId?: string;
    // Legacy field
    status?: string;
    total: number;
    taxRate?: number;
    validUntil?: string;
    lastEmailSent?: string;
    emailSentCount?: number;
    viewCount?: number;
  };
  onBack: () => void;
  onStatusChange: (status: string) => void;
  onEstimateStateChange?: (estimateState: string) => void;
  onClientStateChange?: (clientState: string | null) => void;
  onTaxRateUpdate?: (newTaxRate: number) => void;
  onAddClient: () => void;
  onCreateChangeOrder?: () => void;
  onConvertToInvoice?: () => void;
  onPutOnHold?: (reason: string) => void;
  onResume?: () => void;
  currentUserName?: string;
  currentUserEmail?: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  estimate,
  onBack,
  onStatusChange,
  onEstimateStateChange,
  onClientStateChange,
  onTaxRateUpdate,
  onAddClient,
  onCreateChangeOrder,
  onConvertToInvoice,
  onPutOnHold,
  onResume,
  currentUserName = 'Contractor',
  currentUserEmail = ''
}) => {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdReason, setHoldReason] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  const getEstimateStateColor = (estimateState: string) => {
    switch (estimateState) {
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'estimate': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'invoice': return 'bg-green-100 text-green-800 border-green-300';
      case 'change-order': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getClientStateColor = (clientState?: string | null) => {
    switch (clientState) {
      case 'sent': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'viewed': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-300';
      case 'denied': return 'bg-red-100 text-red-800 border-red-300';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'expired': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getEstimateStateLabel = (state: string) => {
    switch (state) {
      case 'draft': return 'Draft';
      case 'estimate': return 'Estimate';
      case 'invoice': return 'Invoice';
      case 'change-order': return 'Change Order';
      default: return state;
    }
  };

  const getClientStateLabel = (state?: string | null) => {
    if (!state) return null;
    switch (state) {
      case 'sent': return 'Sent';
      case 'viewed': return `Viewed${estimate.viewCount ? ` (${estimate.viewCount}x)` : ''}`;
      case 'accepted': return 'Accepted';
      case 'denied': return 'Denied';
      case 'on-hold': return 'On Hold';
      case 'expired': return 'Expired';
      default: return state;
    }
  };

  const handleTaxRateSave = (newTaxRate: number) => {
    if (onTaxRateUpdate) {
      onTaxRateUpdate(newTaxRate);
    }
    setShowTaxModal(false);
    setShowSettings(false);
  };

  const handleSendEmail = async () => {
    if (!estimate.id) {
      setSendError('Estimate ID is missing');
      return;
    }

    setIsSending(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      // Prepare estimate for sending (generate token and store contractor email)
      const { success, token, error } = await prepareEstimateForSending(
        estimate.id,
        currentUserEmail
      );

      if (!success || !token) {
        setSendError(error || 'Failed to prepare estimate');
        return;
      }

      // Send email via Mailgun
      await sendEstimateEmail({
        estimate: { ...estimate, emailToken: token } as any,
        recipientEmail: estimate.customerEmail,
        recipientName: estimate.customerName,
        contractorName: currentUserName,
        contractorEmail: currentUserEmail
      });

      setSendSuccess(true);
      
      // Update estimate state and client state
      if (onEstimateStateChange && estimate.estimateState === 'draft') {
        onEstimateStateChange('estimate');
      }
      if (onClientStateChange) {
        onClientStateChange('sent');
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error sending estimate:', err);
      setSendError(err.message || 'Failed to send estimate');
    } finally {
      setIsSending(false);
    }
  };

  const handlePutOnHold = () => {
    if (!holdReason.trim()) {
      alert('Please provide a reason for putting this estimate on hold.');
      return;
    }
    if (onPutOnHold) {
      onPutOnHold(holdReason);
    }
    setShowHoldModal(false);
    setHoldReason('');
  };

  const handleResume = () => {
    if (onResume) {
      onResume();
    }
  };

  const handleConvertToInvoice = () => {
    const confirmed = window.confirm(
      'Are you sure you want to convert this estimate to an invoice? This action cannot be undone.'
    );
    if (confirmed && onConvertToInvoice) {
      onConvertToInvoice();
    }
  };

  const handleCreateChangeOrder = () => {
    if (onCreateChangeOrder) {
      onCreateChangeOrder();
    }
  };

  // Determine which action buttons to show based on state
  const showSendButton = estimate.estimateState === 'draft' && !estimate.clientState;
  const showResendButton = estimate.clientState === 'denied';
  const showPutOnHoldButton = ['sent', 'viewed'].includes(estimate.clientState || '');
  const showResumeButton = estimate.clientState === 'on-hold';
  const showCreateChangeOrderButton = estimate.clientState === 'accepted' && estimate.estimateState === 'estimate';
  const showConvertToInvoiceButton = estimate.clientState === 'accepted' && estimate.estimateState === 'estimate';

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left Side - Title & Status */}
          <div className="flex items-start gap-4">
            <button
              onClick={onBack}
              className="mt-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Back to estimates"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-6 h-6 text-orange-600" />
                <h1 className="text-2xl font-semibold text-gray-900">
                  {estimate.estimateNumber}
                </h1>
              </div>

              <div className="flex items-center gap-3">
                <p className="text-gray-600">{estimate.customerName}</p>
                <span className="text-gray-400">•</span>
                <p className="text-lg font-semibold text-gray-900">
                  ${estimate.total.toFixed(2)}
                </p>
              </div>

              {/* Email Tracking Info */}
              {estimate.lastEmailSent && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                  <Mail className="w-4 h-4" />
                  <span>
                    Last sent: {new Date(estimate.lastEmailSent).toLocaleString()}
                    {estimate.emailSentCount && estimate.emailSentCount > 1 && (
                      <span className="ml-1">({estimate.emailSentCount}x)</span>
                    )}
                  </span>
                  {estimate.viewCount && estimate.viewCount > 0 && (
                    <span className="ml-2 text-purple-600">
                      • Opened {estimate.viewCount}x
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Status & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* State Badges (Read-only) */}
            <div className="flex items-center gap-2">
              {/* Estimate State Badge */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500 font-medium">Type</label>
                <span className={`px-4 py-2 text-sm font-medium rounded-lg border ${getEstimateStateColor(estimate.estimateState)}`}>
                  {getEstimateStateLabel(estimate.estimateState)}
                </span>
              </div>

              {/* Client State Badge (if exists) */}
              {estimate.clientState && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Status</label>
                  <span className={`px-4 py-2 text-sm font-medium rounded-lg border ${getClientStateColor(estimate.clientState)}`}>
                    {getClientStateLabel(estimate.clientState)}
                  </span>
                </div>
              )}
              
              {/* Parent Estimate Link (for change orders) */}
              {estimate.parentEstimateId && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Parent</label>
                  <button
                    onClick={() => navigate(`/estimates/${estimate.parentEstimateId}`)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View Parent
                  </button>
                </div>
              )}
            </div>



            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Send Estimate Button (Draft only) */}
              {showSendButton && (
                <button
                  onClick={handleSendEmail}
                  disabled={isSending}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isSending
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                  title="Send to client"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isSending ? 'Sending...' : 'Send Estimate'}
                </button>
              )}

              {/* Resend Button (Denied estimates) */}
              {showResendButton && (
                <button
                  onClick={handleSendEmail}
                  disabled={isSending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Resend Estimate
                </button>
              )}

              {/* Put on Hold Button */}
              {showPutOnHoldButton && (
                <button
                  onClick={() => setShowHoldModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  <Pause className="w-4 h-4" />
                  Put on Hold
                </button>
              )}

              {/* Resume Button */}
              {showResumeButton && (
                <button
                  onClick={handleResume}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Resume
                </button>
              )}

              {/* Create Change Order Button */}
              {showCreateChangeOrderButton && (
                <button
                  onClick={handleCreateChangeOrder}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <FileEdit className="w-4 h-4" />
                  Create Change Order
                </button>
              )}

              {/* Convert to Invoice Button */}
              {showConvertToInvoiceButton && (
                <button
                  onClick={handleConvertToInvoice}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <DollarSign className="w-4 h-4" />
                  Convert to Invoice
                </button>
              )}

              {/* Line Items Locked Indicator */}
              {estimate.clientState === 'accepted' && (
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800">
                  <Lock className="w-4 h-4" />
                  <span className="font-medium">Line Items Locked</span>
                </div>
              )}
            </div>

            {/* Add Client Button */}
            <button
              onClick={onAddClient}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Client
            </button>

            <div className="flex items-center gap-2">
              <button
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Edit estimate"
              >
                <Edit className="w-5 h-5" />
              </button>

              <button
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Email estimate"
              >
                <Mail className="w-5 h-5" />
              </button>

              <button
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Print estimate"
              >
                <Printer className="w-5 h-5" />
              </button>

              <button
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Download PDF"
              >
                <Download className="w-5 h-5" />
              </button>

              {/* Settings Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Settings"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {/* Dropdown Menu */}
                {showSettings && (
                  <>
                    {/* Backdrop to close dropdown */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowSettings(false)}
                    />

                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                      <button
                        onClick={() => {
                          setShowTaxModal(true);
                          setShowSettings(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg transition-colors"
                      >
                        Edit Tax Rate
                      </button>
                      {/* Add more settings options here in the future */}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {sendSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Estimate sent successfully!</span>
        </div>
      )}

      {sendError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{sendError}</span>
        </div>
      )}

      {/* Tax Configuration Modal */}
      {showTaxModal && (
        <TaxConfigModal
          currentTaxRate={estimate.taxRate || 0.07}
          estimateId={estimate.id || ''}
          onClose={() => setShowTaxModal(false)}
          onSave={handleTaxRateSave}
        />
      )}

      {/* Put on Hold Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Put Estimate on Hold</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Hold
                </label>
                <textarea
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder="Enter reason for putting this estimate on hold..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowHoldModal(false);
                    setHoldReason('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePutOnHold}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                >
                  Put on Hold
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DashboardHeader;