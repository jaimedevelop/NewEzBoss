import React, { useState, useEffect } from 'react';
import { Plus, FileText } from 'lucide-react';
import EstimatesHeader from './components/EstimatesHeader';
import EstimatesStats from './components/EstimatesStats';
import { EstimatesList } from './components/EstimatesList';
import { EstimateCreationForm } from './components/EstimateCreationForm';
import { ViewEstimate } from './components/ViewEstimate';
import { EditEstimate } from './components/EditEstimate';
import { getAllEstimates, deleteEstimate } from '../../services/estimates';

// Interface for compatibility with existing components
interface Estimate {
  id: string;
  estimateNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectId?: string;
  projectName?: string;
  projectDescription?: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
  createdDate: string;
  validUntil: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  lineItems: LineItem[];
  notes?: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

type ViewMode = 'list' | 'create' | 'view' | 'edit';

const Estimates: React.FC = () => {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
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
      
      // Transform Firebase data to match existing interface
      const transformedEstimates = estimatesData.map(estimate => ({
        ...estimate,
        customerName: estimate.customerName || estimate.client, // Handle field name differences
      }));
      
      setEstimates(transformedEstimates);
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
    const approvedEstimates = estimates.filter(e => e.status === 'approved').length;
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
    setSelectedEstimateId(estimateId);
    setCurrentView('view');
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <FileText className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-semibold text-gray-900">{getPageTitle()}</h1>
            </div>
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

export default Estimates;