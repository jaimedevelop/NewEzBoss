import { useEstimateAutosave } from './estimateTab/useEstimateAutosave';
import { calculateEstimateTotals } from '../../../../services/estimates';
import { recordOpenedEstimate } from '../../recentEstimates';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { getEstimate, updateEstimate, createEstimate, deleteEstimate, duplicateEstimate, issueInvoice } from '../../../../services/estimates';
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
import { ClientViewDocPreview } from './clientViewTab/components';
import ClientSelectModal from './estimateTab/ClientSelectModal';
import { Alert } from '../../../../mainComponents/ui/Alert';
import { downloadElementAsPdf, openElementAsPdfInNewTab } from '../../../../utils/pdfExport';
import { getDocumentIdentity } from '../../../../services/estimates/documentIdentity';

const EstimateDashboard: React.FC = () => {
  const { estimateId } = useParams<{ estimateId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile } = useAuthContext();

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const editVersion = React.useRef(0);
  const optimisticDirty = React.useRef(false);
  const onOptimisticUpdate = React.useCallback((patch: Partial<Estimate>) => {
    editVersion.current += 1;
    optimisticDirty.current = true;
    setEstimate(current => {
      if (!current) return current;
      const next = { ...current, ...patch };
      return { ...next, ...calculateEstimateTotals(next.lineItems, next.discount || 0,
        next.discountType === 'percentage' ? 'percentage' : 'fixed', next.taxRate || 0) };
    });
  }, []);
  const autosave = useEstimateAutosave(estimateId, () => loadEstimate(true, true), onOptimisticUpdate);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'estimate' | 'timeline' | 'communication' | 'history' | 'change-orders' | 'payments' | 'client-view'>('estimate');
  const [clientViewEstimateId, setClientViewEstimateId] = useState<string | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [issuingInvoice, setIssuingInvoice] = useState(false);
  const [invoiceActionError, setInvoiceActionError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [openingPdf, setOpeningPdf] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const pdfPreviewRef = React.useRef<HTMLDivElement>(null);
  const duplicateInFlightRef = React.useRef(false);

  const handleDownloadPdf = async () => {
    if (!estimate || !pdfPreviewRef.current || downloadingPdf || openingPdf) return;

    setDownloadingPdf(true);
    try {
      await downloadElementAsPdf(pdfPreviewRef.current, getDocumentIdentity(estimate).exportFilename);
    } catch (downloadError) {
      console.error('Error generating PDF:', downloadError);
      window.alert('Unable to download the PDF. Please check that the company logo loads and try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleOpenPdf = async () => {
    if (!estimate || !pdfPreviewRef.current || downloadingPdf || openingPdf) return;

    setOpeningPdf(true);
    try {
      await openElementAsPdfInNewTab(pdfPreviewRef.current, getDocumentIdentity(estimate).exportFilename);
    } catch (openError) {
      console.error('Error opening PDF:', openError);
      window.alert('Unable to open the PDF. Please allow popups for this site and try again.');
    } finally {
      setOpeningPdf(false);
    }
  };

  useEffect(() => {
    if (location.state?.success) {
      setSuccessBanner(location.state.message);
      // Clear the state so the banner doesn't show again on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    void loadEstimate();
  }, [estimateId]);

  // Estimate decisions can be made from the client portal or another session.
  // Poll while this dashboard is visible so status and approval details stay current.
  useEffect(() => {
    if (!estimateId) return;

    const refreshIfVisible = () => {
      if (!shareDialogOpen && document.visibilityState === 'visible') {
        void loadEstimate(true);
      }
    };
    const intervalId = window.setInterval(refreshIfVisible, 10_000);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [estimateId, shareDialogOpen]);

  useEffect(() => {
    if (currentUser?.uid && estimate?.id === estimateId && estimateId) {
      void recordOpenedEstimate(estimateId).catch((error) => {
        console.error('Failed to save estimate opening:', error);
      });
    }
  }, [currentUser?.uid, estimate?.id, estimateId]);

  // Auto-hide success banner
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => {
        setSuccessBanner(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successBanner]);

  // Automatic expiration check
  useEffect(() => {
    const checkExpiration = async () => {
      if (!estimate || !estimate.id || !estimate.validUntil || estimate.estimateState === 'invoice' || estimate.issuedInvoiceId) return;

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

  const loadEstimate = async (silent: boolean = false, reconcile: boolean = false) => {
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
      const version = editVersion.current;
      const result = await getEstimate(estimateId);
      if (silent && (version !== editVersion.current || autosave.hasPendingChanges() || (optimisticDirty.current && !reconcile))) return;
      if (result) {  // ✅ Check if result exists (not null)
        optimisticDirty.current = false;
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
      const reason = err instanceof Error ? err.message : '';
      alert(reason ? `Estimate could not be deleted: ${reason}.` : 'Could not delete estimate. Please try again.');
    }
  };

  const handleDuplicate = async () => {
    if (!estimate?.id || duplicateInFlightRef.current) return;

    duplicateInFlightRef.current = true;
    setDuplicating(true);
    try {
      const newEstimateId = await duplicateEstimate(estimate.id);
      navigate(`/estimates/${newEstimateId}`, {
        state: { success: true, message: 'Estimate duplicated successfully!' }
      });
    } catch (err) {
      console.error('Error duplicating estimate:', err);
      alert('Failed to duplicate estimate. Please try again.');
    } finally {
      duplicateInFlightRef.current = false;
      setDuplicating(false);
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
    if (!estimate?.id || issuingInvoice) return;
    if (estimate.issuedInvoiceId) { navigate(`/estimates/${estimate.issuedInvoiceId}`); return; }
    setInvoiceActionError(null);
    setIssuingInvoice(true);
    try {
      const issued = await issueInvoice(estimate.id);
      navigate(`/estimates/${issued.id}`);
      setInvoiceActionError(null);
    } catch (err) {
      console.error('Error converting to invoice:', err);
      setInvoiceActionError(err instanceof Error ? err.message : 'Unable to issue invoice. Please try again.');
    } finally {
      setIssuingInvoice(false);
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
    <div className="relative h-[calc(100vh-4rem)] lg:h-screen flex flex-col bg-gray-50">
      {(successBanner || error || invoiceActionError) && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-50 space-y-3 px-6 pt-6">
          {successBanner && (
            <Alert
              type="success"
              message={successBanner}
              onClose={() => setSuccessBanner(null)}
              className="pointer-events-auto shadow-md"
            />
          )}
          {error && (
            <Alert
              type="error"
              message={error}
              onClose={() => setError(null)}
              className="pointer-events-auto shadow-md"
            />
          )}
          {invoiceActionError && (
            <Alert
              type="error"
              message={invoiceActionError}
              onClose={() => setInvoiceActionError(null)}
              className="pointer-events-auto shadow-md"
            />
          )}
        </div>
      )}

      <div className="flex-shrink-0">
        {issuingInvoice && <p role="status" className="mx-6 mt-3 text-sm text-gray-600">Creating invoice…</p>}
        <DashboardHeader
          estimate={estimate}
          onBack={handleBack}
          onTaxRateUpdate={estimate.invoiceNumber || estimate.issuedInvoiceId ? undefined : handleTaxRateUpdate}
          onDelete={estimate.invoiceNumber || estimate.issuedInvoiceId ? undefined : handleDelete}
          onDuplicate={handleDuplicate}
          isDuplicating={duplicating}
          onCreateInvoice={estimate.issuedInvoiceId || estimate.estimateState === 'invoice' || estimate.estimateState === 'change-order' ? undefined : handleConvertToInvoice}
          isIssuingInvoice={issuingInvoice}
          onDownloadPdf={handleDownloadPdf}
          isDownloadingPdf={downloadingPdf || openingPdf}
          onOpenPdf={handleOpenPdf}
          isOpeningPdf={openingPdf || downloadingPdf}
        />

        <div className="mx-6">
          <TabBar activeTab={activeTab} onTabChange={(tab) => {
            if (tab === 'client-view') setClientViewEstimateId(estimate.id!);
            setActiveTab(tab);
          }} estimate={estimate} />
        </div>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 pb-6">
        <div hidden={activeTab !== 'estimate'}>
          <EstimateTab
            key={estimate.id}
            estimate={estimate}
            autosave={autosave}
            onOptimisticUpdate={onOptimisticUpdate}
            onUpdate={(options) => {
              // Returned so autosave can wait for the refetch before reporting "Saved".
              const refreshed = loadEstimate(true);
              if (options?.showSuccess !== false) {
                setSuccessBanner('Estimate updated successfully!');
              }
              return refreshed;
            }} // Silent refresh
            onCreateChangeOrder={handleCreateChangeOrder}
            onConvertToInvoice={handleConvertToInvoice}
            isIssuingInvoice={issuingInvoice}
            onShareDialogOpenChange={setShareDialogOpen}
          />
        </div>

        {/* Preserve the editor and its pending autosave when changing tabs. */}
        {(activeTab === 'client-view' || clientViewEstimateId === estimate.id) && (
          <div hidden={activeTab !== 'client-view'}>
            <ClientViewTab
              key={estimate.id}
              estimate={estimate}
              autosave={autosave}
              onOptimisticUpdate={onOptimisticUpdate}
              onUpdate={() => loadEstimate(true)}
            />
          </div>
        )}

        {activeTab === 'change-orders' && (
          <ChangeOrderTab
            estimate={estimate}
            onUpdate={() => {
              loadEstimate(true);
              setSuccessBanner('Change order updated successfully!');
            }}
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

        {activeTab === 'communication' && (
          <CommunicationLog estimate={estimate} onUpdate={loadEstimate} />
        )}

        {activeTab === 'history' && (
          <RevisionHistory estimate={estimate} />
        )}
      </div>

      {/* This stays mounted so the header can export the same client-facing document from any tab. */}
      <div className="fixed left-[-9999px] top-0 w-[850px]" aria-hidden="true">
        <div ref={pdfPreviewRef}>
          <ClientViewDocPreview
            estimate={estimate}
            settings={estimate.clientViewSettings || {
              displayMode: 'list',
              showItemPrices: true,
              showGroupPrices: true,
              showSubtotal: true,
              showTax: true,
              showTotal: true,
              hiddenLineItems: [],
              showEstimateTab: true,
              showPaymentsTab: true,
              showTimelineTab: true,
              showMessagesTab: false,
              showHistoryTab: false,
              addImagesToEstimate: false,
            }}
            groups={estimate.groups || []}
            companyInfo={{
              companyName: userProfile?.company,
              address: userProfile?.address,
              city: userProfile?.city,
              state: userProfile?.state,
              zipCode: userProfile?.zipCode,
              logoUrl: userProfile?.companyLogo,
              phone: userProfile?.phone,
              website: userProfile?.website,
              email: userProfile?.email,
              licenses: userProfile?.licenses,
            }}
          />
        </div>
      </div>

      <ClientSelectModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSelectClient={handleSelectClient}
      />
    </div>
  );
};

export default EstimateDashboard;
