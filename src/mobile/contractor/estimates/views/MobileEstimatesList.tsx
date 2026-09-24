import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, FileText, Plus, Search, X } from 'lucide-react';
import { getAllEstimates, type EstimateWithId } from '../../../../services/estimates';

type TypeFilter = 'all' | 'draft' | 'estimate' | 'change-order' | 'invoice';

const getEstimateStateColor = (estimateState: string) => {
  switch (estimateState) {
    case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'estimate': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'invoice': return 'bg-green-100 text-green-700 border-green-200';
    case 'change-order': return 'bg-orange-100 text-orange-700 border-orange-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getEstimateStateLabel = (estimateState: string) => {
  switch (estimateState) {
    case 'draft': return 'Draft';
    case 'estimate': return 'Estimate';
    case 'invoice': return 'Invoice';
    case 'change-order': return 'Change Order';
    default: return estimateState;
  }
};

const getClientStateColor = (clientState?: string | null) => {
  switch (clientState) {
    case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'viewed': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'accepted': return 'bg-green-100 text-green-700 border-green-200';
    case 'denied': return 'bg-red-100 text-red-700 border-red-200';
    case 'on-hold': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'expired': return 'bg-orange-100 text-orange-700 border-orange-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getClientStateLabel = (clientState?: string | null) => {
  if (!clientState) return 'Draft';
  return clientState.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const MobileEstimatesList: React.FC = () => {
  const navigate = useNavigate();
  const [estimates, setEstimates] = useState<EstimateWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  useEffect(() => {
    loadEstimates();
  }, []);

  const loadEstimates = async () => {
    try {
      setLoading(true);
      const data = await getAllEstimates();
      setEstimates(data);
    } catch (err) {
      console.error('Error loading estimates:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = estimates.filter(estimate => {
    if (typeFilter !== 'all' && estimate.estimateState !== typeFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        estimate.customerName?.toLowerCase().includes(term) ||
        (estimate.invoiceNumber || estimate.estimateNumber)?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);

  const formatDate = (val: string | null | undefined): string => {
    if (!val) return '—';
    try {
      return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '—';
    }
  };

  const filterTabs: { id: TypeFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Draft' },
    { id: 'estimate', label: 'Estimate' },
    { id: 'change-order', label: 'Change Order' },
    { id: 'invoice', label: 'Invoice' },
  ];

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-200 flex-shrink-0 z-20">
        <div className="px-4 h-14 flex items-center justify-between gap-2">
          {showSearch ? (
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search customer or #..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <button
                onClick={() => { setShowSearch(false); setSearchTerm(''); }}
                className="p-2 text-gray-500"
                aria-label="Close search"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-gray-900">Estimates</h1>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowSearch(true)}
                  className="p-2 text-gray-500 active:bg-gray-100 rounded-full"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate('/estimates/new')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg active:bg-orange-700"
                >
                  <Plus className="w-4 h-4" />
                  New
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex overflow-x-auto px-4 pb-2 gap-2 no-scrollbar">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                typeFilter === tab.id
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 px-4 py-4 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 text-orange-600 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <FileText className="w-12 h-12 text-gray-300 mb-3" />
            <h2 className="text-base font-semibold text-gray-700 mb-1">No estimates found</h2>
            <p className="text-sm text-gray-400">
              {estimates.length === 0 ? 'Create your first estimate to get started.' : 'Try a different search or filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(estimate => (
              <button
                key={estimate.id}
                onClick={() => navigate(`/estimates/${estimate.id}`)}
                className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 active:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{estimate.customerName || 'No customer'}</p>
                    <p className="text-xs text-gray-500">{estimate.estimateState === 'invoice' ? estimate.invoiceNumber || 'Number pending' : estimate.estimateNumber} · {formatDate(estimate.createdDate || estimate.createdAt)}</p>
                  </div>
                  <p className="text-base font-bold text-gray-900 flex-shrink-0">{formatCurrency(estimate.total)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${getEstimateStateColor(estimate.estimateState)}`}>
                    {getEstimateStateLabel(estimate.estimateState)}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${getClientStateColor(estimate.clientState)}`}>
                    {getClientStateLabel(estimate.clientState)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileEstimatesList;
