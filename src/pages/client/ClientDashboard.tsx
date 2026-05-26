import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText, Eye, Calendar, MessageCircle, History, ChevronDown } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase/config';
import {
  getClientUserByUid,
  getClientEstimates,
  type ClientUser
} from '../../services/clients/client.auth';
import { getEstimate } from '../../services/estimates';
import { type Estimate } from '../../services/estimates/estimates.types';
import ClientLayout from './ClientLayout';
import ClientActionButtons from './components/ClientActionButtons';
import ClientCommentSection from './components/ClientCommentSection';
import TimelineSection from '../estimates/components/estimateDashboard/timelineTab/TimelineSection';
import RevisionHistory from '../estimates/components/estimateDashboard/historyTab/RevisionHistory';
import PaymentsTab from '../estimates/components/estimateDashboard/paymentsTab/PaymentsTab';

type Tab = 'estimate' | 'payments' | 'timeline' | 'messages' | 'history';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'estimate', label: 'Estimate', icon: <FileText className="w-4 h-4" /> },
  { id: 'payments', label: 'Payments', icon: <Eye className="w-4 h-4" /> },
  { id: 'timeline', label: 'Timeline', icon: <Calendar className="w-4 h-4" /> },
  { id: 'messages', label: 'Messages', icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
];

const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [estimates, setEstimates] = useState<(Estimate & { id: string })[]>([]);
  const [activeEstimate, setActiveEstimate] = useState<(Estimate & { id: string }) | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('estimate');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEstimatePicker, setShowEstimatePicker] = useState(false);

  // Auth guard — client accounts only
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) {
        navigate('/client/login');
        return;
      }
      try {
        const profile = await getClientUserByUid(user.uid);
        if (!profile) {
          // Firebase Auth user exists but no clientUsers doc — redirect
          navigate('/client/login');
          return;
        }
        setClientUser(profile);
        await loadEstimates(profile);
      } catch (err) {
        console.error('Auth error:', err);
        setError('Failed to load your account.');
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const loadEstimates = async (profile: ClientUser) => {
    try {
      const list = await getClientEstimates(profile.email, profile.contractorUserId);
      // Sort newest first by createdAt
      list.sort((a, b) => {
        const ta = (a as any).createdAt?.toMillis?.() ?? 0;
        const tb = (b as any).createdAt?.toMillis?.() ?? 0;
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
      const fresh = await getEstimate(activeEstimate.id);
      if (fresh) setActiveEstimate(fresh as Estimate & { id: string });
    } catch (err) {
      console.error('Error refreshing estimate:', err);
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

  const formatDate = (val: any): string => {
    if (!val) return '—';
    try {
      const d = val?.toDate ? val.toDate() : new Date(val);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col flex-1 gap-4">

        {/* Estimate selector */}
        {estimates.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowEstimatePicker(p => !p)}
              className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm shadow-sm hover:border-gray-300 transition-colors"
            >
              <FileText className="w-4 h-4 text-orange-600" />
              <span className="font-medium text-gray-800">
                {activeEstimate?.estimateNumber ?? 'Select Estimate'}
              </span>
              <span className="text-gray-400 text-xs ml-1">
                {activeEstimate ? formatCurrency(activeEstimate.total) : ''}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
            </button>
            {showEstimatePicker && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-64 py-1">
                {estimates.map(est => (
                  <button
                    key={est.id}
                    onClick={() => {
                      setActiveEstimate(est);
                      setShowEstimatePicker(false);
                      setActiveTab('estimate');
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center justify-between text-sm"
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
            {/* Header card */}
            <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Estimate</p>
                  <h1 className="text-xl font-bold text-gray-900">{activeEstimate.estimateNumber}</h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Valid until {formatDate(activeEstimate.validUntil)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(activeEstimate.total)}</p>
                  {activeEstimate.clientState && (
                    <span className={`inline-block mt-1 text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
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

              <div className="p-5">
                {activeTab === 'estimate' && (
                  <EstimateDetailView estimate={activeEstimate} clientUser={clientUser} onUpdate={refreshActiveEstimate} />
                )}
                {activeTab === 'payments' && (
                  <PaymentsTab estimate={activeEstimate} onUpdate={refreshActiveEstimate} />
                )}
                {activeTab === 'timeline' && (
                  <TimelineSection estimate={activeEstimate} />
                )}
                {activeTab === 'messages' && (
                  <ClientCommentSection
                    estimate={activeEstimate}
                    clientUser={clientUser}
                    onUpdate={refreshActiveEstimate}
                  />
                )}
                {activeTab === 'history' && (
                  <RevisionHistory estimate={activeEstimate} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </ClientLayout>
  );
};

// ─── Inline Estimate Detail View ─────────────────────────────────────────────

interface EstimateDetailViewProps {
  estimate: Estimate & { id: string };
  clientUser: ClientUser;
  onUpdate: () => void;
}

const EstimateDetailView: React.FC<EstimateDetailViewProps> = ({ estimate, clientUser, onUpdate }) => {
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

  return (
    <div className="space-y-6">
      {/* Line items */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-400 uppercase pb-2 pr-4">Description</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase pb-2 px-4">Qty</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase pb-2 px-4">Unit Price</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {(estimate.lineItems ?? []).map((item, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 pr-4 text-gray-800">{item.description}</td>
                  <td className="py-2.5 px-4 text-right text-gray-600">{item.quantity}</td>
                  <td className="py-2.5 px-4 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2.5 text-right font-medium text-gray-800">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      <div className="border-t border-gray-100 pt-4 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span>{formatCurrency(estimate.subtotal ?? 0)}</span>
        </div>
        {estimate.discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>
              -{estimate.discountType === 'percentage'
                ? `${estimate.discount}%`
                : formatCurrency(estimate.discount)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-gray-600">
          <span>Tax ({estimate.taxRate ?? 0}%)</span>
          <span>{formatCurrency(estimate.tax ?? 0)}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2 mt-2">
          <span>Total</span>
          <span>{formatCurrency(estimate.total)}</span>
        </div>
      </div>

      {/* Notes */}
      {estimate.notes && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Notes</h3>
          <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3 whitespace-pre-wrap">
            {estimate.notes}
          </p>
        </div>
      )}

      {/* Decision buttons */}
      <ClientActionButtons estimate={estimate} onUpdate={onUpdate} />
    </div>
  );
};

export default ClientDashboard;