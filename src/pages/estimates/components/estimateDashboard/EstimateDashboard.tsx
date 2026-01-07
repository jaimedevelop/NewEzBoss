import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { getEstimate, updateEstimate } from '../../../../services/estimates';
import { type Estimate } from '../../../../services/estimates/estimates.types';
import { type Client } from '../../../../services/clients';
import DashboardHeader from './DashboardHeader';
import TabBar from './TabBar';
import EstimateTab from './EstimateTab';
import TimelineSection from './TimelineSection';
import CommunicationLog from './CommunicationLog';
import RevisionHistory from './RevisionHistory';
import { CollectionImportModal } from './CollectionImportModal';
import ClientSelectModal from './ClientSelectModal';

const EstimateDashboard: React.FC = () => {
  const { estimateId } = useParams<{ estimateId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'estimate' | 'timeline' | 'communication' | 'history'>('estimate');
  const [showCollectionImport, setShowCollectionImport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);

  useEffect(() => {
    loadEstimate();
  }, [estimateId]);

const loadEstimate = async () => {
  if (!estimateId) {
    setError('No estimate ID provided');
    setLoading(false);
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const result = await getEstimate(estimateId);
    if (result) {  // ✅ Check if result exists (not null)
      setEstimate(result);
    } else {
      setError('Estimate not found');
    }
  } catch (err) {
    console.error('Error loading estimate:', err);
    setError('Failed to load estimate');
  } finally {
    setLoading(false);
  }
};

  const handleBack = () => {
    navigate('/estimates');
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!estimate?.id) return;

    try {
      const result = await updateEstimate(estimate.id, { status: newStatus });
      if (result.success) {
        loadEstimate();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleTaxRateUpdate = async (newTaxRate: number) => {
    if (!estimate?.id) return;

    try {
      const taxDecimal = newTaxRate / 100;
      const subtotal = estimate.subtotal || 0;
      const discountAmount = estimate.discountType === 'percentage'
        ? subtotal * (estimate.discount / 100)
        : estimate.discount;
      const taxableAmount = subtotal - discountAmount;
      const tax = taxableAmount * taxDecimal;
      const total = taxableAmount + tax;

      const result = await updateEstimate(estimate.id, {
        taxRate: newTaxRate,
        tax: tax,
        total: total
      });

      if (result.success) {
        loadEstimate();
      }
    } catch (err) {
      console.error('Error updating tax rate:', err);
    }
  };

  const handleImportCollection = async () => {
    setShowCollectionImport(true);
  };

  const handleSelectClient = async (client: Client) => {
    if (!estimate?.id) return;

    try {
      const result = await updateEstimate(estimate.id, {
        customerName: client.name,
        customerEmail: client.email || '',
        customerPhone: client.phoneMobile || client.phoneOther || ''
      });

      if (result.success) {
        loadEstimate();
      }
    } catch (err) {
      console.error('Error updating client:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
          {error || 'Estimate not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="flex-shrink-0 p-6 space-y-4">
        <DashboardHeader
          estimate={estimate}
          onBack={handleBack}
          onStatusChange={handleStatusChange}
          onTaxRateUpdate={handleTaxRateUpdate}
          onAddClient={() => setShowClientModal(true)}
          currentUserName={currentUser?.displayName || 'Contractor'}
          currentUserEmail={currentUser?.email || ''}
        />

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {activeTab === 'estimate' && (
          <EstimateTab
            estimate={estimate}
            onUpdate={loadEstimate}
            onImportCollection={handleImportCollection}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineSection estimate={estimate} />
        )}

        {activeTab === 'communication' && (
          <CommunicationLog estimate={estimate} onUpdate={loadEstimate} />
        )}

        {activeTab === 'history' && (
          <RevisionHistory estimate={estimate} />
        )}
      </div>

      {showCollectionImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4">
            {isImporting && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-2" />
                  <p className="text-gray-600">Importing collection...</p>
                </div>
              </div>
            )}
            <CollectionImportModal
              isOpen={showCollectionImport}
              onClose={() => setShowCollectionImport(false)}
              onImport={async (collectionId, selectedTypes) => {
                setIsImporting(true);
                try {
                  // Import logic here
                  await loadEstimate();
                } finally {
                  setIsImporting(false);
                  setShowCollectionImport(false);
                }
              }}
            />
          </div>
        </div>
      )}

      <ClientSelectModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSelectClient={handleSelectClient}
      />
    </div>
  );
};

export default EstimateDashboard;