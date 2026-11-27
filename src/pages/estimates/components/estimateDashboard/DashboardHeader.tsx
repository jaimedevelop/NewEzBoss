import { EzBossLoader } from '../../../../mainComponents/ui/EzBossLoader';
import { formatDollarAmount } from '../../../../mainComponents/forms/CurrencyInput';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import { FileText, Printer, Download, DollarSign, Copy, Trash2, Loader2, type LucideIcon } from 'lucide-react';
import { RecordDetailHeader, recordHeaderActionClass, recordHeaderDeleteClass } from '../../../../mainComponents/ui/RecordDetailHeader';
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
  onOpenPdf?: () => void;
  pdfAction?: 'download' | 'print' | null;
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
  onOpenPdf,
  pdfAction = null
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
      <RecordDetailHeader
        title={estimate.estimateState === 'invoice' ? estimate.invoiceNumber || 'Number pending' : estimate.estimateNumber}
        icon={HeaderIcon}
        backTitle={backTitle}
        onBack={onBack}
        actions={showOptions ? (
          <>
            <button
              type="button"
              disabled={!onOpenPdf || pdfAction !== null}
              aria-busy={pdfAction === 'print'}
              onClick={onOpenPdf}
              className={recordHeaderActionClass}
            >
              {pdfAction === 'print' ? <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" /> : <Printer className="w-4 h-4" aria-hidden="true" />}
              Print
            </button>
            <button
              type="button"
              disabled={!onDownloadPdf || pdfAction !== null}
              aria-busy={pdfAction === 'download'}
              onClick={onDownloadPdf}
              className={recordHeaderActionClass}
            >
              {pdfAction === 'download' ? <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" /> : <Download className="w-4 h-4" aria-hidden="true" />}
              Download PDF
            </button>
            {onTaxRateUpdate && (
              <button
                disabled={!canPerform('write:estimates')} onClick={() => setShowTaxModal(true)}
                className={recordHeaderActionClass}
              >
                <DollarSign className="w-4 h-4" />
                Edit Tax Rate
              </button>
            )}
            {onDuplicate && (
              <button
                disabled={isDuplicating || !canPerform('write:estimates')}
                onClick={handleDuplicate}
                className={recordHeaderActionClass}
              >
                {isDuplicating ? <EzBossLoader className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
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
                {isIssuingInvoice ? <EzBossLoader className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                {isIssuingInvoice ? 'Creating Invoice…' : 'Create Invoice'}
              </button>
            )}
            {onDelete && (
              <button
                disabled={!canPerform('delete:estimates')} onClick={handleDelete}
                className={recordHeaderDeleteClass}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </>
        ) : undefined}
      >
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
      </RecordDetailHeader>

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
