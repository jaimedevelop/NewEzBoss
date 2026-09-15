import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, FileText, Eye, Calendar, MessageCircle, History, Download } from 'lucide-react';
import { getPublicEstimate } from '../../services/clients/publicEstimate';
import { type Estimate } from '../../services/estimates';
import type { ClientViewSettings } from '../../services/estimates/estimates.types';
import ClientActionButtons from './components/ClientActionButtons';
import GuestCommentSection from './components/GuestCommentSection';
import TimelineSection from '../estimates/components/estimateDashboard/timelineTab/TimelineSection';
import RevisionHistory from '../estimates/components/estimateDashboard/historyTab/RevisionHistory';
import PaymentsTab from '../estimates/components/estimateDashboard/paymentsTab/PaymentsTab';
import { ClientViewDocPreview } from '../estimates/components/estimateDashboard/clientViewTab/components';
import { downloadElementAsPdf } from '../../utils/pdfExport';

const DEFAULT_CLIENT_VIEW_SETTINGS: ClientViewSettings = {
  displayMode: 'list',
  showItemPrices: true,
  showGroupPrices: true,
  showSubtotal: true,
  showTax: true,
  showTotal: true,
  hiddenLineItems: []
};

type Tab = 'estimate' | 'payments' | 'timeline' | 'messages' | 'history';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'estimate', label: 'Estimate', icon: <FileText className="w-4 h-4" /> },
  { id: 'payments', label: 'Payments', icon: <Eye className="w-4 h-4" /> },
  { id: 'timeline', label: 'Timeline', icon: <Calendar className="w-4 h-4" /> },
  { id: 'messages', label: 'Messages', icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
];

const ClientEstimateView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [estimate, setEstimate] = useState<(Estimate & { id: string }) | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('estimate');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const docPreviewRef = useRef<HTMLDivElement>(null);

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

  const handleDownloadPdf = async () => {
    if (!docPreviewRef.current || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      await downloadElementAsPdf(docPreviewRef.current, `Estimate-${estimate?.estimateNumber || 'download'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.alert('Unable to download the PDF. Please check that the company logo loads and try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

  const formatDate = (val: string | null | undefined): string => {
    if (!val) return '—';
    try {
      const d = new Date(val);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '—';
    }
  };

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
      <header className="bg-slate-900 flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-center">
          <img src="/EzBossLogo2.png" alt="EzBoss" className="h-20" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col flex-1 gap-4">
        {/* Header card */}
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Estimate</p>
              <h1 className="text-xl font-bold text-gray-900">{estimate.estimateNumber}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Valid until {formatDate(estimate.validUntil)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Total</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(estimate.total)}</p>
              {estimate.clientState && ['accepted', 'denied', 'on-hold', 'expired'].includes(estimate.clientState) && (
                <span className={`inline-block mt-1 text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                  estimate.clientState === 'accepted' ? 'bg-green-100 text-green-700' :
                  estimate.clientState === 'denied' ? 'bg-red-100 text-red-700' :
                  estimate.clientState === 'on-hold' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {estimate.clientState.replace('-', ' ')}
                </span>
              )}
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {downloadingPdf ? 'Preparing...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'estimate' && (
            <div className="space-y-6 p-5">
              <div ref={docPreviewRef}>
                <ClientViewDocPreview
                  estimate={estimate}
                  settings={estimate.clientViewSettings || DEFAULT_CLIENT_VIEW_SETTINGS}
                  groups={estimate.groups || []}
                  companyInfo={{
                    companyName: estimate.contractorCompany,
                    address: estimate.contractorCompanyAddress,
                    logoUrl: estimate.contractorCompanyLogo,
                    phone: estimate.contractorCompanyPhone,
                    website: estimate.contractorCompanyWebsite,
                    email: estimate.contractorCompanyEmail,
                    licenses: estimate.contractorCompanyLicenses,
                  }}
                />
              </div>

              {estimate.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3 whitespace-pre-wrap">
                    {estimate.notes}
                  </p>
                </div>
              )}

              <ClientActionButtons estimate={estimate} onUpdate={refreshEstimate} token={token} />
            </div>
          )}
          <div className={activeTab === 'estimate' ? 'hidden' : 'p-5'}>
            {activeTab === 'payments' && (
              <PaymentsTab estimate={estimate} onUpdate={refreshEstimate} publicReadOnly publicToken={token} />
            )}
            {activeTab === 'timeline' && (
              <TimelineSection estimate={estimate as any} />
            )}
            {activeTab === 'messages' && (
              <GuestCommentSection estimate={estimate} token={token!} onUpdate={refreshEstimate} />
            )}
            {activeTab === 'history' && (
              <RevisionHistory estimate={estimate} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientEstimateView;
