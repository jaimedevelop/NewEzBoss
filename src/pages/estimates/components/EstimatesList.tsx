import { useEstimateListSearch } from '../../../hooks/useEstimateListSearch';
import { nextColumnSort, sortEstimateColumns, columnSortLabel, serviceAddress as getServiceAddress, type ColumnSort, type SortColumn } from '../estimateSort';
import { matchesEstimateSearch, ESTIMATE_SEARCH_HINT } from '../estimateSearch';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Search, Copy, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';
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

type EstimateSortOrder = 'most-recent' | 'date-asc' | 'date-desc';

const CustomerName: React.FC<{ name: string }> = ({ name }) => {
  const nameRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const isPopupVisible = isTruncated && pointer !== null;

  useEffect(() => {
    const element = nameRef.current;
    if (!element) return;

    const checkOverflow = () => setIsTruncated(element.scrollWidth > element.clientWidth);
    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [name]);

  useEffect(() => {
    if (!isPopupVisible) return;
    const dismiss = () => setPointer(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPopupVisible]);

  const updatePointer = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isTruncated) setPointer({ x: event.clientX, y: event.clientY });
  };

  return (
    <>
    <div
      ref={nameRef}
      className="truncate text-sm font-medium text-gray-900"
      onMouseEnter={updatePointer}
      onMouseMove={updatePointer}
      onMouseLeave={() => setPointer(null)}
    >
      {name}
    </div>
    {isPopupVisible && createPortal(
      <div
        role="tooltip"
        className="pointer-events-none fixed z-[100] w-max max-w-[min(20rem,calc(100vw-1rem))] whitespace-normal break-words rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-lg"
        style={{
          left: Math.max(8, Math.min(pointer.x, window.innerWidth - 328)),
          ...(pointer.y >= 160
            ? { bottom: window.innerHeight - pointer.y + 8 }
            : { top: pointer.y + 16 }),
          maxHeight: pointer.y >= 160 ? pointer.y - 16 : window.innerHeight - pointer.y - 24,
          overflow: 'hidden',
        }}
      >
        {name}
      </div>,
      document.body
    )}
    </>
  );
};

const readSortOrder = (storageKey: string): EstimateSortOrder => {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'most-recent' || saved === 'date-asc' || saved === 'date-desc') {
      return saved;
    }
  } catch {
    // Keep sorting usable when browser storage is unavailable.
  }
  return 'most-recent';
};

export const EstimatesList: React.FC<EstimatesListProps> = ({
  onCreateEstimate: _onCreateEstimate,
  onViewEstimate: _onViewEstimate,
  onEditEstimate: _onEditEstimate
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuthContext();
  const sortStorageKey = `ezboss:estimates:sort-order:${currentUser?.uid ?? 'anonymous'}`;
  const [columnSort, setColumnSort] = useState<ColumnSort>(null);
  const [sortOrder, setSortOrder] = useState<EstimateSortOrder>(() => readSortOrder(sortStorageKey));

  useEffect(() => {
    setSortOrder(readSortOrder(sortStorageKey));
  }, [sortStorageKey]);

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = event.target.value as EstimateSortOrder;
    setSortOrder(selected);
    setColumnSort(null);
    try {
      localStorage.setItem(sortStorageKey, selected);
    } catch {
      // The current selection still applies if it cannot be persisted.
    }
  };
  const [estimates, setEstimates] = useState<EstimateWithId[]>([]);
  const [filteredEstimates, setFilteredEstimates] = useState<EstimateWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useEstimateListSearch();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedType = searchParams.get('type');
  const typeFilter: EstimateTypeFilter = requestedType === 'draft' || requestedType === 'estimate' || requestedType === 'change-order' || requestedType === 'invoice' ? requestedType : 'all';
  const setTypeFilter = (filter: EstimateTypeFilter) => {
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      if (filter === 'all') next.delete('type');
      else next.set('type', filter);
      return next;
    });
  };
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  // State updates are asynchronous, so keep a ref as an immediate guard against
  // two rapid clicks before the disabled state has rendered.
  const duplicatingIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadEstimates();
  }, []);

  useEffect(() => {
    filterEstimates();
  }, [estimates, searchTerm, statusFilter, typeFilter, sortOrder, columnSort, currentUser?.uid]);

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
      filtered = filtered.filter(estimate => matchesEstimateSearch(estimate, searchTerm));
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

    setFilteredEstimates(sortEstimateColumns([...filtered].sort((a, b) => {
      if (sortOrder === 'most-recent') {
        return mostRecentActivity(b) - mostRecentActivity(a);
      }
      const aDate = dateValue(a);
      const bDate = dateValue(b);
      if (aDate === null) return bDate === null ? 0 : 1;
      if (bDate === null) return -1;
      return sortOrder === 'date-asc' ? aDate - bDate : bDate - aDate;
    }), columnSort));
  };

  const sortHeader = (column: SortColumn, label: string, compact = false) => {
    const active = columnSort?.column === column;
    const next = nextColumnSort(columnSort, column);
    const grouped = column === 'type' || column === 'status';
    const Icon = active ? (grouped || columnSort.step === 0 ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <th aria-sort={active ? (grouped ? 'other' : columnSort.step === 0 ? 'ascending' : 'descending') : 'none'} className={`${compact ? 'px-2' : 'px-3'} py-3 text-left text-xs font-medium uppercase tracking-wider ${active ? 'text-orange-700' : 'text-gray-500'}`}>
        <button type="button" onClick={() => setColumnSort(next)}
          title={`${active ? columnSortLabel(columnSort) + '. ' : ''}Click for ${columnSortLabel(next).toLowerCase()}`}
          aria-label={`${label}: ${active ? columnSortLabel(columnSort) : 'Original order'}. Click for ${columnSortLabel(next)}`}
          className="flex w-full items-center gap-1 text-left uppercase hover:text-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 rounded">
          {label}<Icon aria-hidden="true" className={`h-3 w-3 shrink-0 ${active ? 'opacity-100' : 'opacity-40'}`} />
        </button>
      </th>
    );
  };

  const handleDuplicate = async (estimateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (duplicatingIdRef.current) return;

    const sourceEstimate = estimates.find(estimate => estimate.id === estimateId);
    const isInvoice = sourceEstimate?.estimateState === 'invoice';

    if (isInvoice && !window.confirm(`Duplicating invoice ${sourceEstimate.invoiceNumber || sourceEstimate.estimateNumber} will create a new estimate. Continue?`)) {
      return;
    }

    duplicatingIdRef.current = estimateId;
    setDuplicatingId(estimateId);
    try {
      await duplicateEstimate(estimateId);
      await loadEstimates();
      setAlert({
        type: 'success',
        message: isInvoice ? 'Estimate created from invoice successfully!' : 'Estimate duplicated successfully!'
      });
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to duplicate estimate.' });
      console.error('Error duplicating estimate:', error);
    } finally {
      duplicatingIdRef.current = null;
      setDuplicatingId(null);
    }
  };

  const getEstimateDisplayName = (estimate: EstimateWithId) =>
    estimate.estimateNumber ? `Estimate-${estimate.estimateState === 'invoice' ? estimate.invoiceNumber || 'Number pending' : estimate.estimateNumber}` : 'estimate';

  const handleDelete = (estimateId: string, estimateDisplayName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete estimate ${estimateDisplayName}? This action cannot be undone.`)) {
      return;
    }

    deleteEstimate(estimateId).then(() => {
      setDeletingId(estimateId);
      setAlert({ type: 'success', message: `Estimate ${estimateDisplayName} deleted successfully!` });
    }).catch((error) => {
      console.error('Error deleting estimate:', error);
      const reason = error instanceof Error ? error.message : '';
      setAlert({
        type: 'error',
        message: reason
          ? `Estimate ${estimateDisplayName} could not be deleted: ${reason}.`
          : `Could not delete estimate ${estimateDisplayName}. It has been restored. Please try again.`,
      });
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
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          <InputField
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search estimates..."
            aria-label="Search estimates"
            aria-describedby="estimate-search-hint"
            className="pl-10"
          />
          <p id="estimate-search-hint" className="mt-1.5 text-xs text-gray-500">{ESTIMATE_SEARCH_HINT}</p>
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
            onChange={handleSortChange}
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
            <table className="w-full min-w-[1050px] table-fixed divide-y divide-gray-200">
              <colgroup>
                <col className="w-[156px]" />
                <col className="w-[22%]" />
                <col className="w-[90px]" />
                <col />
                <col className="w-[100px]" />
                <col className="w-[104px]" />
                <col className="w-[86px]" />
                <col className="w-[94px]" />
                <col className="w-[84px]" />
              </colgroup>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {sortHeader('document', 'Document #')}
                  {sortHeader('customer', 'Customer')}
                  {sortHeader('po', 'P.O.')}
                  {sortHeader('address', 'Address')}
                  {sortHeader('date', 'Date')}
                  {sortHeader('type', 'Type', true)}
                  {sortHeader('status', 'Status', true)}
                  {sortHeader('total', 'Total')}
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredEstimates.map((estimate) => {
                  const isDeleting = deletingId === estimate.id;
                  const cellClass = isDeleting ? 'estimate-cell-squish' : '';
                  const serviceAddress = getServiceAddress(estimate);
                  return (
                  <tr
                    key={estimate.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors relative ${
                      isDeleting ? 'estimate-row-deleting' : ''
                    }`}
                    onClick={() => handleEstimateClick(estimate.id)}
                  >
                    <td className="px-3 py-4 whitespace-nowrap relative">
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
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className={`flex min-w-0 flex-col ${cellClass}`}>
                        <CustomerName name={estimate.customerName} />
                        <div className="truncate text-sm text-gray-500" title={estimate.customerEmail || undefined}>
                          {estimate.customerEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      <span className={`block break-words ${cellClass}`}>
                        {estimate.poNumber || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      <span className={`block break-words ${cellClass}`}>
                        {serviceAddress || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={cellClass}>
                        {estimate.createdDate
                          ? new Date(`${estimate.createdDate}T00:00:00`).toLocaleDateString()
                          : estimate.createdAt
                            ? new Date(estimate.createdAt).toLocaleDateString()
                            : 'N/A'
                        }
                      </span>
                    </td>
                    <td className="w-px px-2 py-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 text-[10px] leading-4 font-medium rounded-full border ${getEstimateStateColor(estimate.estimateState)} ${cellClass}`}>
                        {getEstimateStateLabel(estimate.estimateState)}
                      </span>
                    </td>
                    <td className="w-px px-2 py-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 text-[10px] leading-4 font-medium rounded-full border ${getClientStateColor(estimate.clientState)} ${cellClass}`}>
                        {getClientStateLabel(estimate.clientState)}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <span className={cellClass}>${estimate.total?.toFixed(2) || '0.00'}</span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <div className={`flex items-center gap-2 ${cellClass}`}>
                        <button
                          onClick={(e) => handleDuplicate(estimate.id, e)}
                          disabled={duplicatingId !== null}
                          aria-busy={duplicatingId === estimate.id}
                          className="text-gray-400 hover:text-green-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-gray-400 p-1 transition-colors"
                          title={duplicatingId === estimate.id ? 'Duplicating estimate…' : estimate.estimateState === 'invoice' ? 'Create estimate from invoice' : 'Duplicate estimate'}
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
