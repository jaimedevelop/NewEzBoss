import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { getEstimate, updateEstimate, createEstimate, deleteEstimate } from '../../../../services/estimates';
import { type Estimate } from '../../../../services/estimates/estimates.types';
import { type Client } from '../../../../services/clients';
import DashboardHeader from './DashboardHeader';
import TabBar from './TabBar';
import EstimateTab from './estimateTab/EstimateTab';
import ChangeOrderTab from './changeOrdersTab/ChangeOrderTab';
import PaymentsTab from './paymentsTab/PaymentsTab';
import TimelineSection from './timelineTab/TimelineSection';
import CommunicationLog from './communicationTab/CommunicationLog';
import RevisionHistory from './historyTab/RevisionHistory';
import { ClientViewTab } from './clientViewTab/ClientViewTab';
import { CollectionImportModal } from './estimateTab/CollectionImportModal';
import ClientSelectModal from './estimateTab/ClientSelectModal';

const EstimateDashboard: React.FC = () => {
  const { estimateId } = useParams<{ estimateId: string }>();
  const navigate = useNavigate();
  const { } = useAuthContext();

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'estimate' | 'timeline' | 'communication' | 'history' | 'change-orders' | 'payments' | 'client-view'>('estimate');
  const [showCollectionImport, setShowCollectionImport] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadEstimate();
  }, [estimateId]);

  // Automatic expiration check
  useEffect(() => {
    const checkExpiration = async () => {
      if (!estimate || !estimate.id || !estimate.validUntil) return;

      // Only check if not already expired and not accepted
      if (estimate.clientState === 'expired' || estimate.clientState === 'accepted') return;

      const validDate = new Date(estimate.validUntil);
      const now = new Date();

      if (now > validDate) {
        // Automatically update to expired
        try {
          await updateEstimate(estimate.id, { clientState: 'expired' });
          loadEstimate();
        } catch (err) {
          console.error('Error updating expired state:', err);
        }
      }
    };

    checkExpiration();
  }, [estimate]);

  const loadEstimate = async (silent: boolean = false) => {
    if (!estimateId) {
      setError('No estimate ID provided');
      setLoading(false);
      return;
    }

    // Save current scroll position before loading
    const scrollPosition = scrollContainerRef.current?.scrollTop || 0;

    // Only show loading spinner on initial load, not on silent refreshes
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await getEstimate(estimateId);
      if (result) {  // ✅ Check if result exists (not null)
        setEstimate(result);

        // Restore scroll position after DOM updates
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollPosition;
          }
        });
      } else {
        setError('Estimate not found');
      }
    } catch (err) {
      console.error('Error loading estimate:', err);
      setError('Failed to load estimate');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    navigate('/estimates');
  };

  const handleDelete = async () => {
    if (!estimate?.id) return;

    try {
      await deleteEstimate(estimate.id);
      navigate('/estimates');
    } catch (err) {
      console.error('Error deleting estimate:', err);
      alert('Failed to delete estimate. Please try again.');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!estimate?.id) return;

    try {
      const result = await updateEstimate(estimate.id, { status: newStatus });
      if (result.success) {
        loadEstimate(true); // Silent refresh to preserve edit state
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleEstimateStateChange = async (newEstimateState: string) => {
    if (!estimate?.id) return;

    try {
      const result = await updateEstimate(estimate.id, { estimateState: newEstimateState });
      if (result.success) {
        loadEstimate(true); // Silent refresh to preserve edit state
      }
    } catch (err) {
      console.error('Error updating estimate state:', err);
    }
  };

  const handleClientStateChange = async (newClientState: string | null) => {
    if (!estimate?.id) return;

    try {
      const result = await updateEstimate(estimate.id, { clientState: newClientState });
      if (result.success) {
        loadEstimate(true); // Silent refresh to preserve edit state
      }
    } catch (err) {
      console.error('Error updating client state:', err);
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
        loadEstimate(true); // Silent refresh to preserve edit state
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
        loadEstimate(true); // Silent refresh to preserve edit state
      }
    } catch (err) {
      console.error('Error updating client:', err);
    }
  };

  const handlePutOnHold = async (reason: string) => {
    if (!estimate?.id) return;

    try {
      const result = await updateEstimate(estimate.id, {
        clientState: 'on-hold',
        onHoldDate: new Date().toISOString(),
        onHoldReason: reason
      });

      if (result.success) {
        loadEstimate(true); // Silent refresh to preserve edit state
      }
    } catch (err) {
      console.error('Error putting estimate on hold:', err);
    }
  };

  const handleResume = async () => {
    if (!estimate?.id) return;

    try {
      const result = await updateEstimate(estimate.id, {
        clientState: 'sent'
      });

      if (result.success) {
        loadEstimate(true); // Silent refresh to preserve edit state
      }
    } catch (err) {
      console.error('Error resuming estimate:', err);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!estimate?.id) return;

    try {
      const result = await updateEstimate(estimate.id, {
        estimateState: 'invoice'
      });

      if (result.success) {
        loadEstimate(true); // Silent refresh to preserve edit state
      }
    } catch (err) {
      console.error('Error converting to invoice:', err);
    }
  };

  const handleCreateChangeOrder = async () => {
    if (!estimate?.id) return;

    try {
      // Create new estimate as change order
      const changeOrderData = {
        estimateState: 'change-order' as const,
        clientState: null,
        parentEstimateId: estimate.id,
        customerName: estimate.customerName,
        customerEmail: estimate.customerEmail,
        customerPhone: estimate.customerPhone,
        lineItems: [],
        subtotal: 0,
        discount: 0,
        discountType: estimate.discountType,
        tax: 0,
        taxRate: estimate.taxRate || 0,
        total: 0,
        validUntil: estimate.validUntil,
        notes: `Change order for estimate ${estimate.estimateNumber}`
      };

      const changeOrderId = await createEstimate(changeOrderData);

      // Navigate to the new change order
      navigate(`/estimates/${changeOrderId}`);
    } catch (err) {
      console.error('Error creating change order:', err);
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
          onTaxRateUpdate={handleTaxRateUpdate}
          onDelete={handleDelete}
        />

        <TabBar activeTab={activeTab} onTabChange={setActiveTab} estimate={estimate} />
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 pb-6">
        {activeTab === 'estimate' && (
          <EstimateTab
            estimate={estimate}
            onUpdate={() => loadEstimate(true)} // Silent refresh to preserve edit state
            onImportCollection={handleImportCollection}
            onCreateChangeOrder={handleCreateChangeOrder}
            onConvertToInvoice={handleConvertToInvoice}
          />
        )}

        {activeTab === 'client-view' && (
          <ClientViewTab
            estimate={estimate}
            onUpdate={() => loadEstimate(true)}
          />
        )}

        {activeTab === 'change-orders' && (
          <ChangeOrderTab
            estimate={estimate}
            onUpdate={loadEstimate}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsTab
            estimate={estimate}
            onUpdate={loadEstimate}
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
              onImport={async (lineItems) => {
                if (!estimate?.id) return;

                setIsImporting(true);
                try {
                  // Save current scroll position
                  const scrollPosition = scrollContainerRef.current?.scrollTop || 0;

                  // Get current line items from estimate
                  const currentItems = estimate.lineItems || [];

                  // Merge imported items with existing items
                  const updatedItems = [...currentItems, ...lineItems];

                  // Update estimate in database with new line items
                  const result = await updateEstimate(estimate.id, {
                    lineItems: updatedItems
                  });

                  if (result.success) {
                    // Reload estimate to get fresh data with recalculated totals
                    await loadEstimate();

                    // Restore scroll position after DOM updates
                    requestAnimationFrame(() => {
                      if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTop = scrollPosition;
                      }
                    });
                  } else {
                    console.error('Failed to import collection:', result.error);
                  }
                } catch (error) {
                  console.error('Error importing collection:', error);
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