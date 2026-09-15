import { recordOpenedEstimate } from '../../../../pages/estimates/recentEstimates';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, Trash2, MoreVertical } from 'lucide-react';
import { getEstimate, updateEstimate, createEstimate, deleteEstimate } from '../../../../services/estimates';
import { type Estimate } from '../../../../services/estimates/estimates.types';
import { Alert } from '../../../../mainComponents/ui/Alert';
import MobileEstimateTabBar, { type ContractorEstimateTab } from './MobileEstimateTabBar';
import MobileEstimateTab from './MobileEstimateTab';
import PaymentsTab from '../../../../pages/estimates/components/estimateDashboard/paymentsTab/PaymentsTab';
import TimelineSection from '../../../../pages/estimates/components/estimateDashboard/timelineTab/TimelineSection';
import RevisionHistory from '../../../../pages/estimates/components/estimateDashboard/historyTab/RevisionHistory';

const MobileEstimateDashboard: React.FC = () => {
  const { estimateId } = useParams<{ estimateId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ContractorEstimateTab>('estimate');
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.state?.success) {
      setSuccessBanner(location.state.message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    loadEstimate();
  }, [estimateId]);

  useEffect(() => {
    if (estimateId && estimate?.id === estimateId) {
      void recordOpenedEstimate(estimateId).catch((error) => {
        console.error('Failed to save estimate opening:', error);
      });
    }
  }, [estimateId, estimate?.id]);

  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successBanner]);

  useEffect(() => {
    const checkExpiration = async () => {
      if (!estimate || !estimate.id || !estimate.validUntil) return;
      if (estimate.clientState === 'expired' || estimate.clientState === 'accepted') return;

      const validDate = new Date(estimate.validUntil);
      if (new Date() > validDate) {
        try {
          await updateEstimate(estimate.id, { clientState: 'expired' });
          loadEstimate(true);
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

    const scrollPosition = scrollContainerRef.current?.scrollTop || 0;
    if (!silent) setLoading(true);
    setError(null);

    try {
      const result = await getEstimate(estimateId);
      if (result) {
        setEstimate(result);
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
      if (!silent) setLoading(false);
    }
  };

  const handleBack = () => navigate('/estimates');

  const handleDelete = async () => {
    if (!estimate?.id) return;
    if (!window.confirm(`Delete estimate ${estimate.estimateNumber}? This cannot be undone.`)) return;

    try {
      await deleteEstimate(estimate.id);
      navigate('/estimates');
    } catch (err) {
      console.error('Error deleting estimate:', err);
      alert('Failed to delete estimate. Please try again.');
    }
  };

  const handleConvertToInvoice = async () => {
    if (!estimate?.id) return;
    try {
      const result = await updateEstimate(estimate.id, { estimateState: 'invoice' });
      if (result.success) loadEstimate(true);
    } catch (err) {
      console.error('Error converting to invoice:', err);
    }
  };

  const handleCreateChangeOrder = async () => {
    if (!estimate?.id) return;
    try {
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
      navigate(`/estimates/${changeOrderId}`);
    } catch (err) {
      console.error('Error creating change order:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-7 h-7 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <button onClick={handleBack} className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Estimates
        </button>
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm">
          {error || 'Estimate not found'}
        </div>
      </div>
    );
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 h-14 flex items-center gap-2">
          <button onClick={handleBack} className="p-1 -ml-1 text-gray-500 active:bg-gray-100 rounded-full" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{estimate.customerName || 'No customer'}</p>
            <p className="text-xs text-gray-500 truncate">{estimate.estimateNumber}</p>
          </div>
          <p className="text-base font-bold text-gray-900 flex-shrink-0">{formatCurrency(estimate.total)}</p>
          <div className="relative">
            <button
              onClick={() => setShowMenu(p => !p)}
              className="p-2 -mr-1 text-gray-500 active:bg-gray-100 rounded-full"
              aria-label="More actions"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-40 py-1 w-44">
                <button
                  onClick={() => { setShowMenu(false); handleDelete(); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 active:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Estimate
                </button>
              </div>
            )}
          </div>
        </div>

        {successBanner && (
          <div className="px-4 pb-3">
            <Alert type="success" message={successBanner} onClose={() => setSuccessBanner(null)} />
          </div>
        )}
      </header>

      <MobileEstimateTabBar activeTab={activeTab} onChange={setActiveTab} />

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 pb-8">
        {activeTab === 'estimate' && (
          <MobileEstimateTab
            estimate={estimate}
            onUpdate={() => {
              loadEstimate(true);
              setSuccessBanner('Estimate updated successfully!');
            }}
            onCreateChangeOrder={handleCreateChangeOrder}
            onConvertToInvoice={handleConvertToInvoice}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsTab
            estimate={estimate}
            onUpdate={() => {
              loadEstimate(true);
              setSuccessBanner('Payment updated successfully!');
            }}
          />
        )}

        {activeTab === 'timeline' && (
          <TimelineSection estimate={estimate} />
        )}

        {activeTab === 'history' && (
          <RevisionHistory estimate={estimate} />
        )}
      </div>
    </div>
  );
};

export default MobileEstimateDashboard;
