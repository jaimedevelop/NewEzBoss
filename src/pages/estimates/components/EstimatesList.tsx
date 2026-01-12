import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Search, Filter, Plus, Eye, Copy, Trash2, Edit } from 'lucide-react';
import { InputField } from '../../../mainComponents/forms/InputField';
import { SelectField } from '../../../mainComponents/forms/SelectField';
import { LoadingButton } from '../../../mainComponents/ui/LoadingButton';
import { Alert } from '../../../mainComponents/ui/Alert';
import { EstimateTypeFilterBar, type EstimateTypeFilter } from './EstimateTypeFilter';
import { 
  getAllEstimates,
  type EstimateWithId, 
  getEstimatesByStatus, 
  duplicateEstimate, 
  deleteEstimate,
  updateEstimateStatus 
} from '../../../services/estimates';


interface Estimate {
  id: string;
  estimateNumber: string;
  customerName: string;
  customerEmail: string;
  projectId?: string;
  estimateState: 'draft' | 'estimate' | 'invoice' | 'change-order';
  clientState?: 'sent' | 'viewed' | 'accepted' | 'denied' | 'on-hold' | 'expired' | null;
  parentEstimateId?: string;
  // Legacy field for backward compatibility
  status?: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  total: number;
  createdDate: string;
  validUntil: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

interface EstimatesListProps {
  onCreateEstimate?: () => void;
  onViewEstimate?: (estimateId: string) => void;
  onEditEstimate?: (estimateId: string) => void;
}

export const EstimatesList: React.FC<EstimatesListProps> = ({ 
  onCreateEstimate, 
  onViewEstimate, 
  onEditEstimate 
}) => {
  const navigate = useNavigate();
  const [estimates, setEstimates] = useState<EstimateWithId[]>([]);
  const [filteredEstimates, setFilteredEstimates] = useState<EstimateWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<EstimateTypeFilter>('all');
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  useEffect(() => {
    loadEstimates();
  }, []);

  useEffect(() => {
    filterEstimates();
  }, [estimates, searchTerm, statusFilter, typeFilter]);

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

    // Filter by type (Draft, Estimate, Change-Order, Invoice)
    if (typeFilter !== 'all') {
      filtered = filtered.filter(estimate => {
        // Use new estimateState field
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

    // Filter by client state
    if (statusFilter !== 'all') {
      filtered = filtered.filter(estimate => estimate.clientState === statusFilter);
    }

    // Filter by search term (customer name or estimate number)
    if (searchTerm) {
      filtered = filtered.filter(estimate => 
        estimate.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        estimate.estimateNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredEstimates(filtered);
  };

  const handleDuplicate = async (estimateId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    try {
      await duplicateEstimate(estimateId);
      await loadEstimates(); // Reload to show the new estimate
      setAlert({ type: 'success', message: 'Estimate duplicated successfully!' });
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to duplicate estimate.' });
      console.error('Error duplicating estimate:', error);
    }
  };

  const handleDelete = async (estimateId: string, estimateNumber: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    if (window.confirm(`Are you sure you want to delete estimate ${estimateNumber}? This action cannot be undone.`)) {
      try {
        await deleteEstimate(estimateId);
        await loadEstimates(); // Reload to remove the deleted estimate
        setAlert({ type: 'success', message: 'Estimate deleted successfully!' });
      } catch (error) {
        setAlert({ type: 'error', message: 'Failed to delete estimate.' });
        console.error('Error deleting estimate:', error);
      }
    }
  };

  const handleStatusChange = async (estimateId: string, newStatus: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation
    try {
      await updateEstimateStatus(estimateId, newStatus);
      await loadEstimates(); // Reload to show updated status
      setAlert({ type: 'success', message: 'Estimate status updated successfully!' });
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to update estimate status.' });
      console.error('Error updating estimate status:', error);
    }
  };

  const handleEstimateClick = (estimateId: string) => {
    // Navigate to dashboard
    navigate(`/estimates/${estimateId}`);
  };

  const getClientStateColor = (clientState?: string | null) => {
    switch (clientState) {
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'viewed': return 'bg-purple-100 text-purple-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstimateStateColor = (estimateState: string) => {
    switch (estimateState) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'estimate': return 'bg-blue-100 text-blue-800';
      case 'invoice': return 'bg-green-100 text-green-800';
      case 'change-order': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
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

  // Calculate counts for each type filter
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
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-semibold text-gray-900">Estimates</h1>
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
            {filteredEstimates.length}
          </span>
        </div>
        
        <LoadingButton
          onClick={onCreateEstimate || (() => {
            setAlert({ type: 'warning', message: 'Create estimate button will navigate to creation form!' });
          })}
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Estimate
        </LoadingButton>
      </div>

      {alert && (
        <div className="mb-6">
          <Alert type={alert.type} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <InputField
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by customer name or estimate number..."
            />
          </div>
          <SelectField
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={clientStateOptions}
          />
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm border mb-6 overflow-hidden">
        <EstimateTypeFilterBar
          activeFilter={typeFilter}
          onFilterChange={setTypeFilter}
          counts={typeCounts}
        />
      </div>

      {/* Estimates List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {filteredEstimates.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estimate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estimate Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valid Until
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEstimates.map((estimate) => (
                  <tr 
                    key={estimate.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleEstimateClick(estimate.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <button
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEstimateClick(estimate.id);
                          }}
                        >
                          {estimate.estimateNumber}
                        </button>
                        <div className="text-sm text-gray-500">
                          {estimate.lineItems?.length || 0} item{(estimate.lineItems?.length || 0) !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900">
                          {estimate.customerName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {estimate.customerEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={estimate.estimateState}
                        onChange={(e) => handleStatusChange(estimate.id, e.target.value, e)}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xs font-medium px-2.5 py-1.5 rounded-full border-0 ${getEstimateStateColor(estimate.estimateState)}`}
                      >
                        <option value="draft">Draft</option>
                        <option value="estimate">Estimate</option>
                        <option value="invoice">Invoice</option>
                        <option value="change-order">Change Order</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={estimate.clientState || ''}
                        onChange={(e) => handleStatusChange(estimate.id, e.target.value, e)}
                        onClick={(e) => e.stopPropagation()}
                        className={`text-xs font-medium px-2.5 py-1.5 rounded-full border-0 ${getClientStateColor(estimate.clientState)}`}
                      >
                        <option value="">None</option>
                        <option value="sent">Sent</option>
                        <option value="viewed">Viewed</option>
                        <option value="accepted">Accepted</option>
                        <option value="denied">Denied</option>
                        <option value="on-hold">On Hold</option>
                        <option value="expired">Expired</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${estimate.total?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {estimate.createdDate 
                      ? new Date(estimate.createdDate).toLocaleDateString('en-US', { timeZone: 'UTC' })
                      : estimate.createdAt 
                        ? new Date((estimate.createdAt as any).toDate?.() || estimate.createdAt).toLocaleDateString('en-US', { timeZone: 'UTC' })
                        : 'N/A'
                    }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {estimate.validUntil ? new Date(estimate.validUntil).toLocaleDateString('en-US', { timeZone: 'UTC' }) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(estimate.id, e);
                          }}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Duplicate estimate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={(e) => handleDelete(estimate.id, estimate.estimateNumber, e)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete estimate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};