import React, { useState } from 'react';
import { FileEdit, DollarSign, Lock, ExternalLink, Send, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type Estimate } from '../../../../services/estimates/estimates.types';
import SendEstimateModal from './estimateTab/SendEstimateModal';
import { sendEstimateEmail } from '../../../../services/email';
import { updateEstimate } from '../../../../services/estimates';
import { prepareEstimateForSending, generatePurchaseOrderForEstimate } from '../../../../services/estimates/estimates.mutations';

interface EstimateActionBoxProps {
  estimate: Estimate;
  onCreateChangeOrder?: () => void;
  onConvertToInvoice?: () => void;
  onUpdate?: () => void;
}

const EstimateActionBox: React.FC<EstimateActionBoxProps> = ({
  estimate,
  onCreateChangeOrder,
  onConvertToInvoice,
  onUpdate
}) => {
  const navigate = useNavigate();
  const [showSendModal, setShowSendModal] = useState(false);
  const [isCreatingPO, setIsCreatingPO] = useState(false);

  const handleSendEstimate = async (data: {
    emailTitle: string;
    ccEmails: string;
    message: string;
  }) => {
    try {
      if (!estimate.id) {
        throw new Error('Estimate ID is missing');
      }

      if (!estimate.customerEmail) {
        throw new Error('Missing client email');
      }

      // Step 1: Prepare estimate for sending (generates token, updates state)
      const prepareResult = await prepareEstimateForSending(
        estimate.id,
        estimate.contractorEmail || 'noreply@example.com' // Fallback email
      );

      if (!prepareResult.success || !prepareResult.token) {
        throw new Error(prepareResult.error || 'Failed to prepare estimate');
      }

      // Step 2: Send the email via Mailgun with custom fields from modal
      await sendEstimateEmail({
        estimate: {
          ...estimate,
          emailToken: prepareResult.token
        },
        recipientEmail: estimate.customerEmail,
        recipientName: estimate.customerName,
        contractorName: 'Your Company', // TODO: Get from user settings/profile
        contractorEmail: estimate.contractorEmail || 'noreply@example.com',
        customSubject: data.emailTitle,
        customMessage: data.message,
        ccEmails: data.ccEmails
      });

      // Step 3: Update clientState to 'sent' and estimateState to 'estimate' if it was a draft
      const updates: any = {
        clientState: 'sent',
        sentDate: new Date().toISOString()
      };

      // Transition from draft to estimate when sending
      if (estimate.estimateState === 'draft') {
        updates.estimateState = 'estimate';
      }

      await updateEstimate(estimate.id, updates);

      // Show success message
      alert('Estimate sent successfully!');

      // Refresh the estimate data without full page reload
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error sending estimate:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to send estimate: ${message}`);
    }
  };

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

  const handleConvertToInvoice = () => {
    const confirmed = window.confirm(
      'Are you sure you want to convert this estimate to an invoice? This action cannot be undone.'
    );
    if (confirmed && onConvertToInvoice) {
      onConvertToInvoice();
    }
  };

  const handleCreateChangeOrder = () => {
    if (!estimate.id) {
      console.error('Cannot create change order: estimate ID is missing');
      return;
    }
    console.log('Creating change order for estimate:', estimate.id);
    navigate(`/estimates/new?mode=change-order&parent=${estimate.id}`);
  };

  const handleCreatePO = async () => {
    if (!estimate.id) return;
    
    setIsCreatingPO(true);
    try {
      const result = await generatePurchaseOrderForEstimate(estimate.id);
      if (result.success) {
        alert('Purchase Order created successfully!');
        if (onUpdate) onUpdate();
      } else {
        alert(`Failed to create Purchase Order: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error creating Purchase Order: ${error.message}`);
    } finally {
      setIsCreatingPO(false);
    }
  };

  // Determine which action buttons to show based on state
  const showSendButton = estimate.estimateState !== 'invoice' && !estimate.clientState;
  const showCreateChangeOrderButton = estimate.clientState === 'accepted' && estimate.estimateState === 'estimate';
  const showConvertToInvoiceButton = estimate.clientState === 'accepted' && estimate.estimateState === 'estimate';
  const showLineItemsLocked = estimate.clientState === 'accepted';
  const showCreatePOButton = estimate.estimateState !== 'invoice';
  const isPODisabled = isCreatingPO || (!!estimate.purchaseOrderIds && estimate.purchaseOrderIds.length > 0);

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
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

          {/* Spacer to push action buttons to the right */}
          <div className="flex-1"></div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Create Purchase Order Button */}
            {showCreatePOButton && (
              <button
                onClick={handleCreatePO}
                disabled={isPODisabled}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-4 h-4" />
                {isCreatingPO ? 'Creating...' : estimate.purchaseOrderIds && estimate.purchaseOrderIds.length > 0 ? 'P.O. Created' : 'Create P.O.'}
              </button>
            )}

            {/* Send Estimate Button */}
            {showSendButton && (
              <button
                onClick={() => setShowSendModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Send className="w-4 h-4" />
                Send {estimate.estimateState === 'change-order' ? 'Change Order' : 'Estimate'}
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
                Invoice
              </button>
            )}

            {/* Line Items Locked Indicator */}
            {showLineItemsLocked && (
              <div className="inline-flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800">
                <Lock className="w-4 h-4" />
                <span className="font-medium">Line Items Locked</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Send Estimate Modal */}
      <SendEstimateModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        estimate={estimate}
        onSend={handleSendEstimate}
      />
    </>
  );
};

export default EstimateActionBox;
