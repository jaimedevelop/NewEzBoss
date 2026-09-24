import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import { ArrowLeft, FileText, MoreVertical, Printer, Download, DollarSign, Copy, Trash2, Receipt, Loader2, type LucideIcon } from 'lucide-react';
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
  onMoreClick?: () => void;
  onCreateInvoice?: () => void;
  isIssuingInvoice?: boolean;
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
  onMoreClick,
  onCreateInvoice,
  isIssuingInvoice = false
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);

  const handleTaxRateSave = (newTaxRate: number) => {
    if (onTaxRateUpdate) {
      onTaxRateUpdate(newTaxRate);
    }
    setShowTaxModal(false);
    setShowSettings(false);
  };

  const handlePrint = () => {
    window.print();
    setShowSettings(false);
  };

  const handleDownload = () => {
    // TODO: Implement PDF download functionality
    console.log('Download PDF');
    setShowSettings(false);
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate();
    }
    setShowSettings(false);
  };

  const handleDelete = () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this estimate? This action cannot be undone.'
    );
    if (confirmed && onDelete) {
      onDelete();
    }
    setShowSettings(false);
  };

  return (
    <>
      <div className="bg-white border-b border-gray-200 px-6 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left Side - Title & Basic Info */}
          <div className="flex items-start gap-4">
            <button
              onClick={onBack}
              className="mt-1 text-gray-400 hover:text-gray-600 transition-colors"
              title={backTitle}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-3 mb-2">
                <HeaderIcon className="w-6 h-6 text-orange-600" />
                <h1 className="text-2xl font-semibold text-gray-900">
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
                <div className="flex items-center gap-3">
                  <p className="text-gray-600">{estimate.customerName}</p>
                  <span className="text-gray-400">•</span>
                  <p className="text-lg font-semibold text-gray-900">
                    ${(estimate.total ?? 0).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Three Dots Menu */}
          {showOptions && onMoreClick && (
            <button
              onClick={onMoreClick}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
          )}

          {showOptions && !onMoreClick && <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="More options"
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

                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  <button
                    onClick={handlePrint}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  
                  <button
                    onClick={handleDownload}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </button>
                  
                  {onTaxRateUpdate && <button
                    onClick={() => {
                      setShowTaxModal(true);
                      setShowSettings(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    Edit Tax Rate
                  </button>}
                  
                  {onDuplicate && (
                    <button
                      onClick={handleDuplicate}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Duplicate Estimate
                    </button>
                  )}

                  {onCreateInvoice && (
                    <button
                      disabled={isIssuingInvoice}
                      onClick={() => {
                        if (window.confirm('Create an invoice from this document? A separate invoice will be created and linked to this estimate.')) {
                          onCreateInvoice();
                        }
                        setShowSettings(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors flex items-center gap-2"
                    >
                      {isIssuingInvoice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                      {isIssuingInvoice ? 'Creating Invoice…' : 'Create Invoice'}
                    </button>
                  )}

                  <div className="border-t border-gray-200 my-1"></div>

                  {onDelete && <button
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Estimate
                  </button>}
                </div>
              </>
            )}
          </div>}
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
