import React, { useState } from 'react';
import { ArrowLeft, FileText, Download, Mail, Printer, Edit, MoreVertical } from 'lucide-react';
import TaxConfigModal from './TaxConfigModal';

interface DashboardHeaderProps {
  estimate: {
    id?: string;
    estimateNumber: string;
    customerName: string;
    status: string;
    total: number;
    taxRate?: number;
  };
  onBack: () => void;
  onStatusChange: (status: string) => void;
  onTaxRateUpdate?: (newTaxRate: number) => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  estimate,
  onBack,
  onStatusChange,
  onTaxRateUpdate
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);

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
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'viewed', label: 'Viewed' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'expired', label: 'Expired' }
  ];

  const handleTaxRateSave = (newTaxRate: number) => {
    if (onTaxRateUpdate) {
      onTaxRateUpdate(newTaxRate);
    }
    setShowTaxModal(false);
    setShowSettings(false);
  };

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