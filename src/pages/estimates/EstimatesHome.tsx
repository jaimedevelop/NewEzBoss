import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText } from 'lucide-react';
import EstimatesHeader from './components/EstimatesHeader';
import EstimatesStats from './components/EstimatesStats';
import { EstimatesList } from './components/EstimatesList';
import { EstimateCreationForm } from './components/EstimateCreationForm';
import { ViewEstimate } from './components/ViewEstimate';
import { EditEstimate } from './components/EditEstimate';
import { getAllEstimates, type EstimateWithId } from '../../services/estimates';

type ViewMode = 'list' | 'create' | 'view' | 'edit';

const EstimatesHome: React.FC = () => {
  const navigate = useNavigate();
  const [estimates, setEstimates] = useState<EstimateWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewMode>('list');
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);

  useEffect(() => {
    loadEstimates();
  }, []);

  const loadEstimates = async () => {
    try {
      setLoading(true);
      const estimatesData = await getAllEstimates();
      setEstimates(estimatesData);
    } catch (error) {
      console.error('Error loading estimates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from Firebase data
  const stats = React.useMemo(() => {
    const totalEstimates = estimates.length;
    const pendingEstimates = estimates.filter(e => e.status === 'sent' || e.status === 'draft').length;
    const approvedEstimates = estimates.filter(e => e.status === 'accepted').length;
    const totalValue = estimates.reduce((sum, e) => sum + e.total, 0);
    const averageValue = totalValue / totalEstimates || 0;
    const conversionRate = totalEstimates > 0 ? Math.round((approvedEstimates / totalEstimates) * 100) : 0;

    return {
      totalEstimates,
      pendingEstimates,
      approvedEstimates,
      totalValue,
      averageValue,
      conversionRate
    };
  }, [estimates]);

  const handleNewEstimate = () => {
    setCurrentView('create');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedEstimateId(null);
    loadEstimates(); // Refresh the list when returning
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

  const handleConvertToInvoice = (estimateData: any) => {
    // Placeholder for invoice conversion
    alert(`Converting estimate ${estimateData.estimateNumber} to invoice. This feature will be implemented next.`);
  };

  const handleDownloadPDF = (estimateData: any) => {
    // Placeholder for PDF generation
    alert(`Generating PDF for estimate ${estimateData.estimateNumber}. PDF generation will be implemented next.`);
  };

  const getPageTitle = () => {
    switch (currentView) {
      case 'create': return 'Create New Estimate';
      case 'view': return 'View Estimate';
      case 'edit': return 'Edit Estimate';
      default: return 'Estimates';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {currentView === 'list' ? (
        <>
          {/* Header */}
          <EstimatesHeader onNewEstimate={handleNewEstimate} />

          {/* Stats */}
          <EstimatesStats stats={stats} />

          {/* Firebase-integrated Estimates List */}
          <EstimatesList
            onCreateEstimate={handleNewEstimate}
            onViewEstimate={handleViewEstimate}
            onEditEstimate={handleEditEstimate}
          />
        </>
      ) : (
        <>
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-orange-600" />
              <h1 className="text-2xl font-semibold text-gray-900">{getPageTitle()}</h1>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleBackToList}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ← Back to Estimates
              </button>
            </div>
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