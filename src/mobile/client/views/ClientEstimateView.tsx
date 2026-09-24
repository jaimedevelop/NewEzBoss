import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, FileText } from 'lucide-react';
import { getPublicEstimate } from '../../../services/clients/publicEstimate';
import { type Estimate } from '../../../services/estimates';
import { isClientViewTabVisible, type ClientViewSettings } from '../../../services/estimates/estimates.types';
import MobileTabBar, { CLIENT_TABS, type ClientTab } from './MobileTabBar';
import MobileEstimateDoc from './MobileEstimateDoc';
import { getDocumentIdentity } from '../../../services/estimates/documentIdentity';
import ClientActionButtons from '../../../pages/client/components/ClientActionButtons';
import GuestCommentSection from '../../../pages/client/components/GuestCommentSection';
import ClientWorkOrderTimeline from '../../../pages/client/components/ClientWorkOrderTimeline';
import RevisionHistory from '../../../pages/estimates/components/estimateDashboard/historyTab/RevisionHistory';
import PaymentsTab from '../../../pages/estimates/components/estimateDashboard/paymentsTab/PaymentsTab';
import { PictureUploadGrid, type PictureItem } from '../../../components/common/PictureUploadGrid';

const DEFAULT_CLIENT_VIEW_SETTINGS: ClientViewSettings = {
  displayMode: 'list',
  showItemPrices: true,
  showGroupPrices: true,
  showSubtotal: true,
  showTax: true,
  showTotal: true,
  hiddenLineItems: []
};

const ClientEstimateView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [estimate, setEstimate] = useState<(Estimate & { id: string }) | null>(null);
  const [activeTab, setActiveTab] = useState<ClientTab>('estimate');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Missing estimate link.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const result = await getPublicEstimate(token);
        if (!result) {
          setError('This estimate link is invalid or has expired.');
          return;
        }
        setEstimate(result);
      } catch (err) {
        console.error('Error loading public estimate:', err);
        setError('Failed to load this estimate.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const refreshEstimate = async () => {
    if (!token) return;
    try {
      const fresh = await getPublicEstimate(token);
      if (fresh) setEstimate(fresh as Estimate & { id: string });
    } catch (err) {
      console.error('Error refreshing estimate:', err);
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
  const identity = getDocumentIdentity(estimate);

  const formatDate = (val: string | null | undefined): string => {
    if (!val) return '—';
    try {
      return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const visibleTabs = CLIENT_TABS.filter((tab) => isClientViewTabVisible(estimate?.clientViewSettings, tab.id));

  useEffect(() => {
    if (visibleTabs.length && !visibleTabs.some((tab) => tab.id === activeTab)) setActiveTab(visibleTabs[0].id);
  }, [activeTab, visibleTabs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-600">{error ?? 'Estimate not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-slate-900 flex-shrink-0 sticky top-0 z-30">
        <div className="px-4 h-14 flex items-center justify-center">
          <img src="/EzBossLogo2.png" alt="EzBoss" className="h-7" />
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{identity.title} · {identity.primaryNumber}</p>
          {estimate.estimateState === 'invoice' && estimate.estimateNumber && <p className="text-[10px] text-gray-400">Estimate reference #{estimate.estimateNumber}</p>}
          <p className="text-sm text-gray-500 truncate">
            Valid until {formatDate(estimate.validUntil)}
          </p>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <p className="text-lg font-bold text-gray-900">{formatCurrency(estimate.total)}</p>
          {estimate.clientState && ['accepted', 'denied', 'on-hold', 'expired'].includes(estimate.clientState) && (
            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
              estimate.clientState === 'accepted' ? 'bg-green-100 text-green-700' :
              estimate.clientState === 'denied' ? 'bg-red-100 text-red-700' :
              estimate.clientState === 'on-hold' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {estimate.clientState.replace('-', ' ')}
            </span>
          )}
        </div>
      </div>

      <MobileTabBar
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={visibleTabs}
      />

      <div className="flex-1 bg-gray-50">
        {activeTab === 'estimate' && (
          <div>
            <MobileEstimateDoc
              estimate={estimate}
              settings={estimate.clientViewSettings || DEFAULT_CLIENT_VIEW_SETTINGS}
              groups={estimate.groups || []}
              companyInfo={{
                companyName: estimate.contractorCompany,
                address: estimate.contractorCompanyAddress,
                logoUrl: estimate.contractorCompanyLogo,
              }}
            />
            {(estimate.pictures?.length ?? 0) > 0 && (
              <div className="border-t border-gray-100 bg-white px-4 py-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-700">Pictures</h3>
                <PictureUploadGrid
                  pictures={estimate.pictures!.map((picture): PictureItem => ({
                    id: picture.id,
                    file: null,
                    url: picture.url,
                    description: picture.description || '',
                  }))}
                  isEditing={false}
                  showTitle={false}
                  showAddButton={false}
                  onAdd={() => undefined}
                  onRemove={() => undefined}
                  onUpdateDescription={() => undefined}
                />
              </div>
            )}
            {estimate.notes && (
              <div className="px-4 py-4 bg-white border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Notes</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{estimate.notes}</p>
              </div>
            )}
            <div className="px-4 py-4">
              <ClientActionButtons estimate={estimate} onUpdate={refreshEstimate} token={token} />
            </div>
          </div>
        )}
        {activeTab === 'payments' && (
          <div className="p-4">
            <PaymentsTab estimate={estimate} onUpdate={refreshEstimate} publicReadOnly publicToken={token} />
          </div>
        )}
        {activeTab === 'timeline' && (
          <div className="p-4">
            <ClientWorkOrderTimeline estimateId={estimate.id} publicToken={token} />
          </div>
        )}
        {activeTab === 'messages' && (
          <div className="p-4">
            <GuestCommentSection estimate={estimate} token={token!} onUpdate={refreshEstimate} />
          </div>
        )}
        {activeTab === 'history' && (
          <div className="p-4">
            <RevisionHistory estimate={estimate} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientEstimateView;
