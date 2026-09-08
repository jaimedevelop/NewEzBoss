import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText, ChevronDown } from 'lucide-react';
import {
  getClientUserByUid,
  getClientEstimates,
  getClientEstimate,
  type ClientUser
} from '../../../services/clients/client.auth';
import { type Estimate } from '../../../services/estimates';
import type { ClientViewSettings } from '../../../services/estimates/estimates.types';
import ClientLayout from './ClientLayout';
import MobileTabBar, { type ClientTab } from './MobileTabBar';
import MobileEstimateDoc from './MobileEstimateDoc';
import ClientActionButtons from '../../../pages/client/components/ClientActionButtons';
import ClientCommentSection from '../../../pages/client/components/ClientCommentSection';
import TimelineSection from '../../../pages/estimates/components/estimateDashboard/timelineTab/TimelineSection';
import RevisionHistory from '../../../pages/estimates/components/estimateDashboard/historyTab/RevisionHistory';
import PaymentsTab from '../../../pages/estimates/components/estimateDashboard/paymentsTab/PaymentsTab';

const DEFAULT_CLIENT_VIEW_SETTINGS: ClientViewSettings = {
  displayMode: 'list',
  showItemPrices: true,
  showGroupPrices: true,
  showSubtotal: true,
  showTax: true,
  showTotal: true,
  hiddenLineItems: []
};

const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [estimates, setEstimates] = useState<(Estimate & { id: string })[]>([]);
  const [activeEstimate, setActiveEstimate] = useState<(Estimate & { id: string }) | null>(null);
  const [activeTab, setActiveTab] = useState<ClientTab>('estimate');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEstimatePicker, setShowEstimatePicker] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const profile = await getClientUserByUid('');
        if (!profile) {
          navigate('/client/login');
          return;
        }
        setClientUser(profile);
        await loadEstimates(profile);
      } catch (err) {
        console.error('Auth error:', err);
        navigate('/client/login');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadEstimates = async (profile: ClientUser) => {
    try {
      const list = await getClientEstimates(profile.email, profile.contractorUserId);
      list.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
      setEstimates(list);
      if (list.length > 0) setActiveEstimate(list[0]);
    } catch (err) {
      console.error('Error loading estimates:', err);
      setError('Failed to load estimates.');
    }
  };

  const refreshActiveEstimate = async () => {
    if (!activeEstimate?.id) return;
    try {
      const fresh = await getClientEstimate(activeEstimate.id);
      if (fresh) setActiveEstimate(fresh as Estimate & { id: string });
    } catch (err) {
      console.error('Error refreshing estimate:', err);
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

  const formatDate = (val: string | null | undefined): string => {
    if (!val) return '—';
    try {
      return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (error || !clientUser) {
    return (
      <div className="p-6 max-w-md mx-auto mt-20">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm">
          {error ?? 'Something went wrong. Please try again.'}
        </div>
      </div>
    );
  }

  if (estimates.length === 0) {
    return (
      <ClientLayout clientUser={clientUser}>
        <div className="flex flex-col items-center justify-center flex-1 text-center p-8">
          <FileText className="w-12 h-12 text-gray-300 mb-3" />
          <h2 className="text-lg font-semibold text-gray-700 mb-1">No estimates yet</h2>
          <p className="text-sm text-gray-400">Your contractor hasn't sent you any estimates yet.</p>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout clientUser={clientUser}>
      {estimates.length > 1 && (
        <div className="relative bg-white border-b border-gray-200 px-4 py-2.5">
          <button
            onClick={() => setShowEstimatePicker(p => !p)}
            className="flex items-center gap-2 w-full text-sm"
          >
            <FileText className="w-4 h-4 text-orange-600 flex-shrink-0" />
            <span className="font-medium text-gray-800 truncate">
              {activeEstimate?.estimateNumber ?? 'Select Estimate'}
            </span>
            <span className="text-gray-400 text-xs">
              {activeEstimate ? formatCurrency(activeEstimate.total) : ''}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
          </button>
          {showEstimatePicker && (
            <div className="absolute top-full left-0 right-0 mt-0 bg-white border-b border-gray-200 shadow-lg z-20 py-1">
              {estimates.map(est => (
                <button
                  key={est.id}
                  onClick={() => {
                    setActiveEstimate(est);
                    setShowEstimatePicker(false);
                    setActiveTab('estimate');
                  }}
                  className="w-full text-left px-4 py-3 active:bg-gray-50 flex items-center justify-between text-sm"
                >
                  <span className="font-medium text-gray-800">{est.estimateNumber}</span>
                  <span className="text-gray-400">{formatCurrency(est.total)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {activeEstimate && (
        <>
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm text-gray-500 truncate">
                Valid until {formatDate(activeEstimate.validUntil)}
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className="text-lg font-bold text-gray-900">{formatCurrency(activeEstimate.total)}</p>
              {activeEstimate.clientState && ['accepted', 'denied', 'on-hold', 'expired'].includes(activeEstimate.clientState) && (
                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
                  activeEstimate.clientState === 'accepted' ? 'bg-green-100 text-green-700' :
                  activeEstimate.clientState === 'denied' ? 'bg-red-100 text-red-700' :
                  activeEstimate.clientState === 'on-hold' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {activeEstimate.clientState.replace('-', ' ')}
                </span>
              )}
            </div>
          </div>

          <MobileTabBar activeTab={activeTab} onChange={setActiveTab} />

          <div className="flex-1 bg-gray-50">
            {activeTab === 'estimate' && (
              <div>
                <MobileEstimateDoc
                  estimate={activeEstimate}
                  settings={activeEstimate.clientViewSettings || DEFAULT_CLIENT_VIEW_SETTINGS}
                  groups={activeEstimate.groups || []}
                  companyInfo={{
                    companyName: activeEstimate.contractorCompany,
                    address: activeEstimate.contractorCompanyAddress,
                    logoUrl: activeEstimate.contractorCompanyLogo,
                  }}
                />
                {activeEstimate.notes && (
                  <div className="px-4 py-4 bg-white border-t border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Notes</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{activeEstimate.notes}</p>
                  </div>
                )}
                <div className="px-4 py-4">
                  <ClientActionButtons estimate={activeEstimate} onUpdate={refreshActiveEstimate} />
                </div>
              </div>
            )}
            {activeTab === 'payments' && (
              <div className="p-4">
                <PaymentsTab estimate={activeEstimate} onUpdate={refreshActiveEstimate} clientUser={clientUser} />
              </div>
            )}
            {activeTab === 'timeline' && (
              <div className="p-4">
                <TimelineSection estimate={activeEstimate as any} />
              </div>
            )}
            {activeTab === 'messages' && (
              <div className="p-4">
                <ClientCommentSection
                  estimate={activeEstimate}
                  clientUser={clientUser}
                  onUpdate={refreshActiveEstimate}
                />
              </div>
            )}
            {activeTab === 'history' && (
              <div className="p-4">
                <RevisionHistory estimate={activeEstimate} />
              </div>
            )}
          </div>
        </>
      )}
    </ClientLayout>
  );
};

export default ClientDashboard;
