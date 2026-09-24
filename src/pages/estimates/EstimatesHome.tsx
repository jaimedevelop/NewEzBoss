import { issueInvoice } from '../../services/estimates';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText } from 'lucide-react';
import VariableHeader from '../../mainComponents/ui/VariableHeader';
import { EstimatesList } from './components/EstimatesList';
import { EstimateCreationForm } from './components/EstimateCreationForm';
import { ViewEstimate } from './components/ViewEstimate';
import { EditEstimate } from './components/EditEstimate';

type ViewMode = 'list' | 'create' | 'view' | 'edit';

const EstimatesHome: React.FC = () => {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<ViewMode>('list');
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);
  const [listRefreshKey, setListRefreshKey] = useState(0);

  const handleNewEstimate = () => {
    setCurrentView('create');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedEstimateId(null);
    setListRefreshKey((key) => key + 1); // Refresh the list when returning
  };

  const handleViewEstimate = (estimateId: string) => {
    // Navigate to dashboard instead of opening view modal
    navigate(`/estimates/${estimateId}`);
  };

  const handleEditEstimate = (estimateId: string) => {
    setSelectedEstimateId(estimateId);
    setCurrentView('edit');
  };

  const handleSaveComplete = () => {
    // Called when estimate is saved/updated
    handleBackToList();
  };

  const handleConvertToInvoice = async (estimateData: any) => {
    try {
      const invoice = await issueInvoice(estimateData.id);
      navigate(`/estimates/${invoice.id}`);
    } catch (error) { alert(error instanceof Error ? error.message : 'Unable to create invoice'); }
  };

  const handleDownloadPDF = (estimateData: any) => {
    // Placeholder for PDF generation
    alert(`Generating PDF for estimate ${estimateData.estimateNumber}. PDF generation will be implemented next.`);
  };

  return (
    <div className="space-y-8">
      {currentView === 'list' ? (
        <>
          {/* Header */}
          <VariableHeader
            title="Estimates"
            subtitle="Create, manage, and track project estimates and proposals."
            Icon={FileText}
            rightAction={{
              label: "New Estimate",
              onClick: handleNewEstimate,
              Icon: Plus
            }}
          />


          {/* API-backed estimates list */}
          <EstimatesList
            key={listRefreshKey}
            onCreateEstimate={handleNewEstimate}
            onViewEstimate={handleViewEstimate}
            onEditEstimate={handleEditEstimate}
          />
        </>
      ) : (
        <>
          {/* Page Header */}
          <div className="flex items-center justify-start">
            <button
              onClick={handleBackToList}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ← Back to Estimates
            </button>
          </div>

          {/* Dynamic Content */}
          {currentView === 'create' && (
            <EstimateCreationForm />
          )}

          {currentView === 'view' && selectedEstimateId && (
            <ViewEstimate
              estimateId={selectedEstimateId}
              onClose={handleBackToList}
              onConvertToInvoice={handleConvertToInvoice}
              onDownloadPDF={handleDownloadPDF}
            />
          )}

          {currentView === 'edit' && selectedEstimateId && (
            <EditEstimate
              estimateId={selectedEstimateId}
              onSave={handleSaveComplete}
              onCancel={handleBackToList}
            />
          )}
        </>
      )}
    </div>
  );
};

export default EstimatesHome;
