import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEstimate, type EstimateWithId } from '../../../../services/estimates';
import DashboardHeader from './DashboardHeader';
import TabBar from './TabBar';
import TimelineSection from './TimelineSection';
import LineItemsSection from './LineItemsSection';
import ChangeOrdersSection from './ChangeOrdersSection';
import CommunicationLog from './CommunicationLog';
import RevisionHistory from './RevisionHistory';

const EstimateDashboard: React.FC = () => {
  const { estimateId } = useParams<{ estimateId: string }>();
  const navigate = useNavigate();
  const [estimate, setEstimate] = useState<EstimateWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'timeline' | 'communication' | 'history'>('items');

  useEffect(() => {
    loadEstimate();
  }, [estimateId]);

  const loadEstimate = async () => {
    if (!estimateId) {
      setError('No estimate ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getEstimate(estimateId);
      setEstimate(data);
      setError(null);
    } catch (err) {
      console.error('Error loading estimate:', err);
      setError('Failed to load estimate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/estimates');
  };

  const handleStatusChange = async (newStatus: string) => {
    // Will be implemented with Firebase update
    console.log('Status change:', newStatus);
    await loadEstimate(); // Reload data
  };

  const handleTaxRateUpdate = async (newTaxRate: number) => {
    if (!estimateId || !estimate) return;

    try {
      // Import the update function from estimates service
      const { updateEstimate } = await import('../../../../services/estimates');
      
      // Calculate new totals
      const newTax = estimate.subtotal * newTaxRate;
      const newTotal = estimate.subtotal - estimate.discount + newTax;

      // Update estimate with new tax rate and recalculated totals
      await updateEstimate(estimateId, {
        taxRate: newTaxRate,
        tax: newTax,
        total: newTotal
      });

      // Reload estimate to show updated values
      await loadEstimate();
    } catch (err) {
      console.error('Error updating tax rate:', err);
      setError('Failed to update tax rate. Please try again.');
    }
  };

  const handleEstimateUpdate = async () => {
    await loadEstimate(); // Reload data after any update
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Estimate not found'}</p>
          <button
            onClick={handleBack}
            className="mt-4 text-red-600 hover:text-red-800 underline"
          >
            ← Back to Estimates
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <DashboardHeader 
        estimate={estimate}
        onBack={handleBack}
        onStatusChange={handleStatusChange}
        onTaxRateUpdate={handleTaxRateUpdate}
      />

      {/* Tab Navigation */}
      <TabBar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'items' && (
          <>
            <LineItemsSection 
              estimate={estimate}
              onUpdate={handleEstimateUpdate}
            />
            <ChangeOrdersSection 
              estimate={estimate}
              onUpdate={handleEstimateUpdate}
            />
          </>
        )}

        {activeTab === 'timeline' && (
          <TimelineSection estimate={estimate} />
        )}

        {activeTab === 'communication' && (
          <CommunicationLog 
            estimate={estimate}
            onUpdate={handleEstimateUpdate}
          />
        )}

        {activeTab === 'history' && (
          <RevisionHistory estimate={estimate} />
        )}
      </div>
    </div>
  );
};

export default EstimateDashboard;