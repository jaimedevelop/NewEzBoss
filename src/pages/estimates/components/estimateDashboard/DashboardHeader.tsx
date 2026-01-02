import React, { useState } from 'react';
import { ArrowLeft, FileText, Download, Mail, Printer, Edit, MoreVertical, FolderOpen, Send, Loader2 } from 'lucide-react';
import TaxConfigModal from './TaxConfigModal';
import { prepareEstimateForSending } from '../../../../services/estimates/estimates.mutations';
import { sendEstimateEmail } from '../../../../services/email';

interface DashboardHeaderProps {
  estimate: {
    id?: string;
    estimateNumber: string;
    customerName: string;
    customerEmail: string;
    status: string;
    total: number;
    taxRate?: number;
    validUntil?: string;
  };
  onBack: () => void;
  onStatusChange: (status: string) => void;
  onTaxRateUpdate?: (newTaxRate: number) => void;
  onImportCollection: () => void;
  currentUserName?: string;
  currentUserEmail?: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  estimate,
  onBack,
  onStatusChange,
  onTaxRateUpdate,
  onImportCollection,
  currentUserName = 'Contractor',
  currentUserEmail = ''
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'sent': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'viewed': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      case 'expired': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const statusOptions = [
    { value: 'draft', label: 'Draft', description: 'Work in progress' },
    { value: 'estimate', label: 'Estimate', description: 'Ready to send', canSend: true },
    { value: 'sent', label: 'Sent', description: 'Emailed to client', disabled: true },
    { value: 'viewed', label: 'Viewed', description: 'Client opened email', disabled: true },
    { value: 'accepted', label: 'Accepted', description: 'Client approved', disabled: true },
    { value: 'rejected', label: 'Rejected', description: 'Client declined', disabled: true },
    { value: 'change-order', label: 'Change Order', description: 'Additions during job' },
    { value: 'quote', label: 'Quote', description: 'Job complete, final record', disabled: true },
    { value: 'expired', label: 'Expired', description: 'No longer valid' }
  ];

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
      // Prepare estimate for sending (generate token)
      const { success, token, error } = await prepareEstimateForSending(estimate.id);

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
      onStatusChange('sent'); // Update status

      // Clear success message after 3 seconds
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error sending estimate:', err);
      setSendError(err.message || 'Failed to send estimate');
    } finally {
      setIsSending(false);
    }
  };

  const canSendEmail = estimate.status === 'estimate' || estimate.status === 'draft';

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
                <FileText className="w-6 h-6 text-blue-600" />
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
            </div>
          </div>

          {/* Right Side - Status & Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Status Selector */}
            <select
              value={estimate.status}
              onChange={(e) => onStatusChange(e.target.value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${getStatusColor(estimate.status)}`}
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Action Buttons */}

            {/* Send Estimate Button */}
            <button
              onClick={handleSendEmail}
              disabled={!canSendEmail || isSending}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${canSendEmail && !isSending
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              title={!canSendEmail ? 'Change status to "Estimate" to send' : 'Send to client'}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isSending ? 'Sending...' : 'Send Estimate'}
            </button>

            <button
              onClick={onImportCollection}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <FolderOpen className="w-4 h-4" />
              Import Collection
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
    </>
  );
};

export default DashboardHeader;