import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Copy, Trash2, ArrowUpDown, ChevronDown } from 'lucide-react';
import { InputField } from '../../../mainComponents/forms/InputField';
import { SelectField } from '../../../mainComponents/forms/SelectField';
import { Alert } from '../../../mainComponents/ui/Alert';
import { EstimateTypeFilterBar, type EstimateTypeFilter } from './EstimateTypeFilter';
import { useAuthContext } from '../../../contexts/AuthContext';
import {
  getAllEstimates,
  type EstimateWithId,
  duplicateEstimate,
  deleteEstimate
} from '../../../services/estimates';

interface EstimatesListProps {
  onCreateEstimate?: () => void;
  onViewEstimate?: (estimateId: string) => void;
  onEditEstimate?: (estimateId: string) => void;
}

export const EstimatesList: React.FC<EstimatesListProps> = ({
  onCreateEstimate: _onCreateEstimate,
  onViewEstimate: _onViewEstimate,
  onEditEstimate: _onEditEstimate
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  const [sortOrder, setSortOrder] = useState('most-recent');
  const [estimates, setEstimates] = useState<EstimateWithId[]>([]);
  const [filteredEstimates, setFilteredEstimates] = useState<EstimateWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<EstimateTypeFilter>('all');
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadEstimates();
  }, []);

  useEffect(() => {
    filterEstimates();
  }, [estimates, searchTerm, statusFilter, typeFilter, sortOrder, currentUser?.uid]);

  const loadEstimates = async () => {
    try {
      setLoading(true);
      const estimatesData = await getAllEstimates();
      setEstimates(estimatesData);
    } catch (error) {
      console.error('Error loading estimates:', error);
      setAlert({ type: 'error', message: 'Failed to load estimates. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const filterEstimates = () => {
    let filtered = estimates;

    if (typeFilter !== 'all') {
      filtered = filtered.filter(estimate => {
        if (typeFilter === 'draft') {
          return estimate.estimateState === 'draft';
        } else if (typeFilter === 'estimate') {
          return estimate.estimateState === 'estimate';
        } else if (typeFilter === 'change-order') {
          return estimate.estimateState === 'change-order';
        } else if (typeFilter === 'invoice') {
          return estimate.estimateState === 'invoice';
        }
        return true;
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(estimate => estimate.clientState === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(estimate =>
        estimate.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (estimate.invoiceNumber || estimate.estimateNumber).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const dateValue = (estimate: EstimateWithId) => {
      const timestamp = Date.parse(estimate.createdDate || estimate.createdAt || '');
      return Number.isFinite(timestamp) ? timestamp : null;
    };

    const mostRecentActivity = (estimate: EstimateWithId) => {
      const opened = Date.parse(estimate.lastOpenedAt || '');
      // Prefer the precise createdAt timestamp over the date-only createdDate
      // so same-day duplicates (which share a createdDate) still sort by
      // actual creation time instead of tying with the original.
      const created = Date.parse(estimate.createdAt || estimate.createdDate || '');
      return Math.max(
        Number.isFinite(opened) ? opened : -Infinity,
        Number.isFinite(created) ? created : -Infinity
      );
    };

    setFilteredEstimates([...filtered].sort((a, b) => {
      if (sortOrder === 'most-recent') {
        return mostRecentActivity(b) - mostRecentActivity(a);
      }
      const aDate = dateValue(a);
      const bDate = dateValue(b);
      if (aDate === null) return bDate === null ? 0 : 1;
      if (bDate === null) return -1;
      return sortOrder === 'date-asc' ? aDate - bDate : bDate - aDate;
    }));
  };

  const handleDuplicate = async (estimateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await duplicateEstimate(estimateId);
      await loadEstimates();
      setAlert({ type: 'success', message: 'Estimate duplicated successfully!' });
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to duplicate estimate.' });
      console.error('Error duplicating estimate:', error);
    }
  };

  const getEstimateDisplayName = (estimate: EstimateWithId) =>
    estimate.estimateNumber ? `Estimate-${estimate.estimateState === 'invoice' ? estimate.invoiceNumber || 'Number pending' : estimate.estimateNumber}` : 'estimate';

  const handleDelete = (estimateId: string, estimateDisplayName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete estimate ${estimateDisplayName}? This action cannot be undone.`)) {
      return;
    }

    // Keep the row mounted while its exit animation plays. The request still starts
    // immediately, so this is optimistic from the user's perspective.
    setDeletingId(estimateId);
    const estimateToRestore = estimates.find(estimate => estimate.id === estimateId) ?? null;

    setAlert({ type: 'success', message: `Estimate ${estimateDisplayName} deleted successfully!` });

    deleteEstimate(estimateId).catch((error) => {
      console.error('Error deleting estimate:', error);
      if (estimateToRestore) {
        setEstimates(prev => (prev.some(estimate => estimate.id === estimateId) ? prev : [...prev, estimateToRestore]));
      }
      // If the request fails before the animation ends, cancel the exit and leave
      // the existing row in place. If it fails afterward, the row is restored above.
      setDeletingId(null);
      setAlert({ type: 'error', message: `Failed to delete estimate ${estimateDisplayName}. It has been restored.` });
    });
  };

  const finishDeleteAnimation = (estimateId: string, event: React.AnimationEvent<HTMLSpanElement>) => {
    if (event.animationName !== 'estimateBlipPop') return;

    setEstimates(prev => prev.filter(estimate => estimate.id !== estimateId));
    // filteredEstimates is derived in an effect, so update it in the same render
    // to prevent a single-frame reappearance after the animation finishes.
    setFilteredEstimates(prev => prev.filter(estimate => estimate.id !== estimateId));
    setDeletingId(currentId => currentId === estimateId ? null : currentId);
  };

  const handleEstimateClick = (estimateId: string) => {
    navigate(`/estimates/${estimateId}`);
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
    return clientState.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

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

  const clientStateOptions = [
    { value: 'all', label: 'All Client States' },
    { value: 'sent', label: 'Sent' },
    { value: 'viewed', label: 'Viewed' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'denied', label: 'Denied' },
    { value: 'on-hold', label: 'On Hold' },
    { value: 'expired', label: 'Expired' }
  ];

  const typeCounts = React.useMemo(() => {
    const counts = {
      all: estimates.length,
      draft: 0,
      estimate: 0,
      changeOrder: 0,
      invoice: 0
    };

    estimates.forEach(estimate => {
      if (estimate.estimateState === 'draft') {
        counts.draft++;
      } else if (estimate.estimateState === 'estimate') {
        counts.estimate++;
      } else if (estimate.estimateState === 'change-order') {
        counts.changeOrder++;
      } else if (estimate.estimateState === 'invoice') {
        counts.invoice++;
      }
    });

    return counts;
  }, [estimates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <style>{`
        /* Table rows don't reliably animate transforms themselves (browsers snap
           to the end state), so animate normal elements inside each cell instead. */
        @keyframes estimateCellSquish {
          0% { transform: scale(1); opacity: 1; filter: blur(0); }
          45% { transform: scale(0.92, 0.62); opacity: 1; filter: blur(0); }
          100% { transform: scale(0.02, 0.08); opacity: 0; filter: blur(1px); }
        }
        .estimate-row-deleting {
          pointer-events: none;
        }
        .estimate-cell-squish {
          display: block;
          transform-origin: center;
          animation: estimateCellSquish 420ms cubic-bezier(0.4, 0, 0.75, 0.3) forwards;
          will-change: transform, opacity, filter;
        }
        @keyframes estimateBlipPop {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0.95; }
          40% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(2.8); opacity: 0; }
        }
        .estimate-blip {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 14px;
          height: 14px;
          border-radius: 9999px;
          background: rgba(239, 68, 68, 0.6);
          animation: estimateBlipPop 420ms ease-out forwards;
          z-index: 10;
        }
      `}</style>
      {alert && (
        <Alert type={alert.type} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <InputField
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name or estimate number..."
            className="pl-10"
          />
        </div>
        <div className="w-full md:w-48 md:shrink-0">
          <SelectField
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={clientStateOptions}
          />
        </div>
        <div className="relative w-full md:w-56 md:shrink-0">
          <ArrowUpDown aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-600" />
          <select
            aria-label="Sort estimates"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            className="block w-full appearance-none rounded-md border border-orange-200 bg-orange-50 py-2 pl-9 pr-8 text-sm font-medium leading-5 text-orange-700 hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors cursor-pointer"
          >
            <option value="most-recent">Most Recent</option>
            <option value="date-asc">Date (Ascending)</option>
            <option value="date-desc">Date (Descending)</option>
          </select>
          <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-600" />
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <EstimateTypeFilterBar
          activeFilter={typeFilter}
          onFilterChange={setTypeFilter}
          counts={typeCounts}
        />
      </div>

      {/* Estimates List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {filteredEstimates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No estimates found</h3>
            <p className="text-gray-500">
              {estimates.length === 0
                ? "Get started by creating your first estimate."
                : "Try adjusting your search or filter criteria."
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredEstimates.map((estimate) => {
                  const isDeleting = deletingId === estimate.id;
                  const cellClass = isDeleting ? 'estimate-cell-squish' : '';
                  return (
                  <tr
                    key={estimate.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors relative ${
                      isDeleting ? 'estimate-row-deleting' : ''
                    }`}
                    onClick={() => handleEstimateClick(estimate.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap relative">
                      {isDeleting && (
                        <span
                          className="estimate-blip"
                          aria-hidden="true"
                          onAnimationEnd={(event) => finishDeleteAnimation(estimate.id, event)}
                        />
                      )}
                      <div className={`flex items-center gap-2 ${cellClass}`}>
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
                          {estimate.estimateState === 'invoice' ? estimate.invoiceNumber || 'Number pending' : estimate.estimateNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex flex-col ${cellClass}`}>
                        <div className="text-sm font-medium text-gray-900">
                          {estimate.customerName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {estimate.customerEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={cellClass}>
                        {estimate.createdDate
                          ? new Date(`${estimate.createdDate}T00:00:00`).toLocaleDateString()
                          : estimate.createdAt
                            ? new Date(estimate.createdAt).toLocaleDateString()
                            : 'N/A'
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getEstimateStateColor(estimate.estimateState)} ${cellClass}`}>
                        {getEstimateStateLabel(estimate.estimateState)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getClientStateColor(estimate.clientState)} ${cellClass}`}>
                        {getClientStateLabel(estimate.clientState)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <span className={cellClass}>${estimate.total?.toFixed(2) || '0.00'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className={`flex items-center gap-2 ${cellClass}`}>
                        <button
                          onClick={(e) => handleDuplicate(estimate.id, e)}
                          className="text-gray-400 hover:text-green-600 p-1 transition-colors"
                          title="Duplicate estimate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(estimate.id, getEstimateDisplayName(estimate), e)}
                          className="text-gray-400 hover:text-red-600 p-1 transition-colors"
                          title="Delete estimate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
