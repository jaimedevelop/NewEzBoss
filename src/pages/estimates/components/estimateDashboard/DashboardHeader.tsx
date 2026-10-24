import { formatDollarAmount } from '../../../../mainComponents/forms/CurrencyInput';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import { ArrowLeft, FileText, Printer, Download, DollarSign, Copy, Trash2, Loader2, type LucideIcon } from 'lucide-react';
import TaxConfigModal from './TaxConfigModal';

interface DashboardHeaderProps {
  estimate: {
    id?: string;
    estimateNumber: string;
    estimateState?: string;
    invoiceNumber?: string | null;
    sourceEstimateId?: string | null;
    issuedInvoiceId?: string | null;
    issuedInvoiceNumber?: string | null;
    customerName: string;
    viewCount?: number;
  recipientViews?: { recipientEmail: string; viewCount: number }[];
    total?: number;
    taxRate?: number;
  };
  onBack: () => void;
  onTaxRateUpdate?: (newTaxRate: number) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  secondaryInfo?: React.ReactNode;
  icon?: LucideIcon;
  backTitle?: string;
  showOptions?: boolean;
  onCreateInvoice?: () => void;
  isIssuingInvoice?: boolean;
  isDuplicating?: boolean;
  onDownloadPdf?: () => void;
  isDownloadingPdf?: boolean;
  onOpenPdf?: () => void;
  isOpeningPdf?: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  estimate,
  onBack,
  onTaxRateUpdate,
  onDelete,
  onDuplicate,
  secondaryInfo,
  icon: HeaderIcon = FileText,
  backTitle = 'Back to estimates',
  showOptions = true,
  onCreateInvoice,
  isIssuingInvoice = false,
  isDuplicating = false,
  onDownloadPdf,
  isDownloadingPdf = false,
  onOpenPdf,
  isOpeningPdf = false
}) => {
  const { canPerform, accountKind } = useAuthContext();
  const [showTaxModal, setShowTaxModal] = useState(false);

  const viewers = (estimate.recipientViews ?? []).filter(viewer => viewer.viewCount > 0);
  const unknownViews = Math.max(0, (estimate.viewCount ?? 0) - viewers.reduce((sum, viewer) => sum + viewer.viewCount, 0));
  const viewDetails = [...viewers.map(viewer => `${viewer.recipientEmail}: ${viewer.viewCount} ${viewer.viewCount === 1 ? 'view' : 'views'}`), ...(unknownViews ? [`Unidentified / shared link: ${unknownViews} views`] : [])].join('\n') || 'No client views yet.';

  const handleTaxRateSave = (newTaxRate: number) => {
    if (onTaxRateUpdate) {
      onTaxRateUpdate(newTaxRate);
    }
    setShowTaxModal(false);
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate();
    }
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this estimate? This action cannot be undone.'
    );
    if (confirmed && onDelete) {
      onDelete();
    }
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-3 py-4 sm:px-6 sm:py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left Side - Title & Basic Info */}
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <button
              onClick={onBack}
              className="mt-1 text-gray-400 hover:text-gray-600 transition-colors"
              title={backTitle}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <HeaderIcon className="w-6 h-6 text-orange-600" />
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 break-all">
                  {estimate.estimateState === 'invoice' ? estimate.invoiceNumber || 'Number pending' : estimate.estimateNumber}
                </h1>
              </div>

              {estimate.sourceEstimateId && (
                <Link className="inline-block mb-2 text-sm font-medium text-orange-600 hover:underline" to={`/estimates/${estimate.sourceEstimateId}`}>Estimate: {estimate.estimateNumber}</Link>
              )}
              {estimate.issuedInvoiceId && (
                <Link className="inline-block mb-2 text-sm font-medium text-orange-600 hover:underline" to={`/estimates/${estimate.issuedInvoiceId}`}>Invoice: {estimate.issuedInvoiceNumber}</Link>
              )}
              {secondaryInfo ?? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-gray-600">{estimate.customerName}</p>
                  <span className="text-gray-400">•</span>
                  <p className="text-lg font-semibold text-gray-900">
                    ${formatDollarAmount((estimate.total ?? 0))}
                  </p>
                  <span className="text-gray-400" aria-hidden="true">•</span>
                  <p tabIndex={0} title={`${viewDetails}\nViews are attributed to the email link recipient; forwarded links count toward that recipient.`} className="text-sm text-gray-500 cursor-help border-b border-dotted border-gray-300">
                    {viewers.length > 1 ? 'Clients have viewed' : 'Client has viewed'} {estimate.estimateState === 'invoice' ? 'Invoice' : estimate.estimateState === 'change-order' ? 'Change Order' : 'Estimate'} {estimate.viewCount ?? 0} {(estimate.viewCount ?? 0) === 1 ? 'time' : 'times'}.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Visible estimate actions */}
          {showOptions && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!onOpenPdf || isOpeningPdf}
                onClick={onOpenPdf}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isOpeningPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                {isOpeningPdf ? 'Preparing…' : 'Print'}
              </button>
              <button
                type="button"
                disabled={!onDownloadPdf || isDownloadingPdf}
                onClick={onDownloadPdf}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDownloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isDownloadingPdf ? 'Preparing…' : 'Download PDF'}
              </button>
              {onTaxRateUpdate && (
                <button
                  disabled={!canPerform('write:estimates')} onClick={() => setShowTaxModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <DollarSign className="w-4 h-4" />
                  Edit Tax Rate
                </button>
              )}
              {onDuplicate && (
                <button
                  disabled={isDuplicating || !canPerform('write:estimates')}
                  onClick={handleDuplicate}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDuplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                  {isDuplicating ? 'Duplicating…' : 'Duplicate'}
                </button>
              )}
              {onCreateInvoice && (
                <button
                  disabled={isIssuingInvoice || !canPerform('write:estimates') || (accountKind === 'employee' && !canPerform('write:finances'))}
                  onClick={() => {
                    if (window.confirm('Create an invoice from this document? A separate invoice will be created and linked to this estimate.')) {
                      onCreateInvoice();
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isIssuingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                  {isIssuingInvoice ? 'Creating Invoice…' : 'Create Invoice'}
                </button>
              )}
              {onDelete && (
                <button
                  disabled={!canPerform('delete:estimates')} onClick={handleDelete}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tax Configuration Modal */}
      {showTaxModal && (
        <TaxConfigModal
          currentTaxRate={estimate.taxRate || 0}
          estimateId={estimate.id || ''}
          onClose={() => setShowTaxModal(false)}
          onSave={handleTaxRateSave}
        />
      )}
    </>
  );
};

export default DashboardHeader;
