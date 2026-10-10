import EstimateMaterials from './EstimateMaterials';
import React, { useState, useEffect, useRef } from 'react';
import { FileEdit, DollarSign, ExternalLink, ClipboardList, ChevronDown, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type Estimate } from '../../../../services/estimates/estimates.types';
import EstimateShareChooser from './EstimateShareChooser';
import { sendEstimateForDelivery, generatePurchaseOrderForEstimate, setEstimateClientStatus } from '../../../../services/estimates/estimates.mutations';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { createWorkOrderFromEstimate } from '../../../../services/workOrders/workOrders.factory';

interface EstimateActionBoxProps {
  estimate: Estimate;
  onCreateChangeOrder?: () => void;
  onConvertToInvoice?: () => void;
  isIssuingInvoice?: boolean;
  onUpdate?: () => void;
  onShareDialogOpenChange?: (open: boolean) => void;
}

const EstimateActionBox: React.FC<EstimateActionBoxProps> = ({
  estimate,
  onCreateChangeOrder,
  onConvertToInvoice,
  isIssuingInvoice,
  onUpdate,
  onShareDialogOpenChange
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [createdWorkOrder, setCreatedWorkOrder] = useState<{ estimateId: string; id: string } | null>(null);
  const workOrderId = estimate.workOrderId
    || (createdWorkOrder?.estimateId === estimate.id ? createdWorkOrder.id : null);
  const [isCreatingWorkOrder, setIsCreatingWorkOrder] = useState(false);

  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const clientStatuses = ['sent', 'viewed', 'accepted', 'denied', 'on-hold', 'expired'] as const;
  const canChangeStatus = estimate.estimateState !== 'invoice' && !estimate.issuedInvoiceId && !estimate.archivedAt;

  useEffect(() => {
    if (!statusMenuOpen) return;
    const dismiss = (event: MouseEvent) => {
      if (!statusMenuRef.current?.contains(event.target as Node)) setStatusMenuOpen(false);
    };
    document.addEventListener('mousedown', dismiss);
    return () => document.removeEventListener('mousedown', dismiss);
  }, [statusMenuOpen]);

  const handleStatusChange = async (clientState: NonNullable<Estimate['clientState']>) => {
    if (!estimate.id || isUpdatingStatus) return;
    setStatusMenuOpen(false);
    if (clientState === estimate.clientState) return;
    setIsUpdatingStatus(true);
    setStatusError(null);
    try {
      await setEstimateClientStatus(estimate.id, clientState);
      await onUpdate?.();
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Unable to update status. Please try again.');
    } finally { setIsUpdatingStatus(false); }
  };

  const handleSendEstimate = async (data: {
    emailTitle: string;
    ccEmails: string;
    message: string;
  }) => {
    try {
      if (!estimate.id) {
        throw new Error('Estimate ID is missing');
      }

      const recipientEmail = estimate.estimateState === 'invoice' && estimate.clientSnapshot?.billTo === 'company'
        ? estimate.clientSnapshot.invoiceEmail?.trim() || estimate.customerEmail
        : estimate.customerEmail;
      if (!recipientEmail) {
        throw new Error('Missing client email');
      }

      // The API derives recipient, template, reply-to, and tracking links from
      // the owned estimate, and changes send status only after Mailgun accepts it.
      await sendEstimateForDelivery(estimate.id, {
        subject: data.emailTitle,
        message: data.message,
        cc: data.ccEmails,
      });

      // Show success message
      alert(`${estimate.estimateState === 'invoice' ? 'Invoice' : 'Estimate'} sent successfully!`);

      // Refresh the estimate data without full page reload
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error sending estimate:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to send ${estimate.estimateState === 'invoice' ? 'invoice' : 'estimate'}: ${message}`);
      throw error;
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
      case 'viewed': return 'Viewed';
      case 'accepted': return 'Accepted';
      case 'denied': return 'Denied';
      case 'on-hold': return 'On Hold';
      case 'expired': return 'Expired';
      default: return state;
    }
  };

  const handleConvertToInvoice = () => {
    const confirmed = window.confirm(
      'Create a separate invoice linked to this estimate? The original estimate will be preserved.'
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
      if (result.success && result.poId) {
        navigate(`/purchasing?poId=${encodeURIComponent(result.poId)}`);
        if (onUpdate) onUpdate();
      } else if (result.noShortage) {
        alert('No purchase order was created because the estimate has no uncovered material requirements. Existing inventory and purchase orders already cover its materials.');
      } else {
        alert(`Failed to create Purchase Order: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error creating Purchase Order: ${error.message}`);
    } finally {
      setIsCreatingPO(false);
    }
  };

  const handleCreateWorkOrder = async () => {
    if (!estimate.id || !currentUser?.uid) return;

    setIsCreatingWorkOrder(true);
    try {
      const result = await createWorkOrderFromEstimate(estimate, currentUser.uid);
      if (!result.success || !result.data) throw new Error('Failed to create work order');
      setCreatedWorkOrder({ estimateId: estimate.id, id: result.data.id });
      await onUpdate?.();
      alert(result.data.alreadyExists ? 'Work order is already linked to this document.' : 'Work order created from this document.');
    } catch (error) {
      console.error('Error creating work order:', error);
      alert('Unable to create the work order. Please try again.');
    } finally {
      setIsCreatingWorkOrder(false);
    }
  };

  // Determine which action buttons to show based on state
  const showCreateChangeOrderButton = estimate.clientState === 'accepted' && estimate.estimateState === 'estimate';
  const showConvertToInvoiceButton = !estimate.issuedInvoiceId && estimate.clientState === 'accepted' && estimate.estimateState === 'estimate';
  // Contractors can create a work order before client acceptance, including for invoices.
  const showWorkOrderButton = Boolean(estimate.id);
  const showCreatePOButton = estimate.estimateState !== 'invoice';

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex shrink-0 flex-col gap-2">
          {/* Estimate State Badge */}
          <div className="flex items-center gap-3">
            <label className="w-10 text-xs text-gray-500 font-medium">Type</label>
            <span className={`px-3 py-1 text-sm font-medium rounded-lg border ${getEstimateStateColor(estimate.estimateState)}`}>
              {getEstimateStateLabel(estimate.estimateState)}
            </span>
          </div>

          <div className="relative flex items-center gap-3" ref={statusMenuRef}
            onKeyDown={(event) => { if (event.key === 'Escape') { setStatusMenuOpen(false); statusMenuRef.current?.querySelector('button')?.focus(); } }}>
            <span className="w-10 text-xs text-gray-500 font-medium">Status</span>
            <button type="button" aria-label="Change estimate status" aria-expanded={statusMenuOpen}
              aria-controls="estimate-status-options" disabled={!canChangeStatus || isUpdatingStatus}
              onClick={() => setStatusMenuOpen(open => !open)}
              className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-lg border disabled:cursor-not-allowed ${getClientStateColor(estimate.clientState)}`}>
              {isUpdatingStatus ? 'Saving…' : getClientStateLabel(estimate.clientState) || 'Not sent'}
              {canChangeStatus && <ChevronDown className="w-4 h-4" />}
            </button>
            {statusMenuOpen && (
              <div id="estimate-status-options" className="absolute top-full left-0 z-30 mt-1 min-w-[160px] rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                {clientStatuses.map(status => (
                  <button key={status} type="button" onClick={() => handleStatusChange(status)}
                    aria-pressed={estimate.clientState === status}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 mb-1 text-sm font-medium hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 ${getClientStateColor(status)}`}>
                    {getClientStateLabel(status)}
                    {estimate.clientState === status && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}
            {statusError && <p role="alert" className="max-w-xs text-xs text-red-600">{statusError}</p>}
          </div>

          </div>

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


          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 xl:justify-end [&>button]:whitespace-nowrap">
            {/* Work order link comes from the loaded estimate. */}
            {showWorkOrderButton && (
              <button
                onClick={workOrderId ? () => navigate(`/work-orders/${workOrderId}`) : handleCreateWorkOrder}
                disabled={isCreatingWorkOrder}
                className={workOrderId
                  ? 'inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors'
                  : 'inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'}
              >
                <ClipboardList className="w-4 h-4" />
                {workOrderId ? 'View Work Order' : isCreatingWorkOrder ? 'Creating Work Order…' : 'Create Work Order'}
              </button>
            )}

            {showCreatePOButton && <EstimateMaterials estimate={estimate} creating={isCreatingPO} onCreate={handleCreatePO} />}

            {/* Send Estimate Button */}
            <EstimateShareChooser
              estimate={estimate}
              onSend={handleSendEstimate}
              onUpdate={onUpdate}
              onOpenChange={onShareDialogOpenChange}
            />

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
                disabled={isIssuingInvoice}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                <DollarSign className="w-4 h-4" />
                {isIssuingInvoice ? 'Issuing…' : 'Create Invoice'}
              </button>
            )}


          </div>
        </div>
      </div>

      {/* Send Estimate Modal */}
    </>
  );
};

export default EstimateActionBox;
