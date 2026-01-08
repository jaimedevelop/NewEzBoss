import React, { useState, useEffect } from 'react';
import { FileText, DollarSign, Clock, CheckCircle, XCircle, Eye, Ban, AlertCircle } from 'lucide-react';
import { getAllEstimates } from '../../../services/estimates';
import type { EstimateWithId } from '../../../services/estimates';
import type { EstimateState, ClientState } from '../../../services/estimates/estimates.types';

const EstimatesSummary: React.FC = () => {
  const [estimates, setEstimates] = useState<EstimateWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEstimates = async () => {
      try {
        setLoading(true);
        setError(null);
        const allEstimates = await getAllEstimates();
        
        // Filter out drafts and get only estimates, invoices, and change orders
        const filteredEstimates = allEstimates
          .filter(est => est.estimateState !== 'draft')
          .slice(0, 5); // Get the 5 most recent
        
        setEstimates(filteredEstimates);
      } catch (err) {
        console.error('Error fetching estimates:', err);
        setError('Failed to load estimates');
      } finally {
        setLoading(false);
      }
    };

    fetchEstimates();
  }, []);

  const getClientStateConfig = (clientState: ClientState | null | undefined) => {
    switch (clientState) {
      case 'sent':
        return { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Sent' };
      case 'viewed':
        return { color: 'bg-purple-100 text-purple-800', icon: Eye, label: 'Viewed' };
      case 'accepted':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Accepted' };
      case 'denied':
        return { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Denied' };
      case 'on-hold':
        return { color: 'bg-yellow-100 text-yellow-800', icon: Ban, label: 'On Hold' };
      case 'expired':
        return { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, label: 'Expired' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: Clock, label: 'Draft' };
    }
  };

  const getTypeIcon = (estimateState: EstimateState) => {
    return estimateState === 'invoice' ? DollarSign : FileText;
  };

  const getTypeColor = (estimateState: EstimateState) => {
    return estimateState === 'invoice' 
      ? 'bg-green-50 text-green-600' 
      : 'bg-orange-50 text-orange-600';
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Recent Estimates & Invoices</h2>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Recent Estimates & Invoices</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-8 text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (estimates.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Recent Estimates & Invoices</h2>
        </div>
        <div className="p-6">
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-2" />
            <p>No estimates or invoices found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Recent Estimates & Invoices</h2>
          <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
            View All
          </button>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {estimates.map((estimate) => {
            const stateConfig = getClientStateConfig(estimate.clientState);
            const StateIcon = stateConfig.icon;
            const TypeIcon = getTypeIcon(estimate.estimateState);
            
            return (
              <div key={estimate.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${getTypeColor(estimate.estimateState)}`}>
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">{estimate.estimateNumber}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stateConfig.color}`}>
                        <StateIcon className="h-3 w-3 mr-1" />
                        {stateConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{estimate.customerName}</p>
                    {estimate.projectId && (
                      <p className="text-xs text-gray-500">Project ID: {estimate.projectId}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(estimate.total)}</p>
                  {estimate.sentDate && (
                    <p className="text-xs text-gray-500">Sent: {formatDate(estimate.sentDate)}</p>
                  )}
                  {estimate.estimateState === 'invoice' && estimate.validUntil && (
                    <p className="text-xs text-gray-400">Due: {formatDate(estimate.validUntil)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EstimatesSummary;
