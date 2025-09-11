import React from 'react';
import { FileText, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';

interface EstimateInvoice {
  id: string;
  type: 'estimate' | 'invoice';
  clientName: string;
  projectName: string;
  amount: number;
  status: 'pending' | 'approved' | 'paid' | 'overdue' | 'rejected';
  date: string;
  dueDate?: string;
}

const RecentEstimatesInvoices: React.FC = () => {
  const recentItems: EstimateInvoice[] = [
    {
      id: 'EST-2025-001',
      type: 'estimate',
      clientName: 'Green Valley Homes',
      projectName: 'Residential Complex Phase 2',
      amount: 425000,
      status: 'pending',
      date: '2025-01-10',
      dueDate: '2025-02-10'
    },
    {
      id: 'INV-2025-003',
      type: 'invoice',
      clientName: 'Metro Business Solutions',
      projectName: 'Office Building Renovation',
      amount: 180000,
      status: 'paid',
      date: '2025-01-08'
    },
    {
      id: 'EST-2025-002',
      type: 'estimate',
      clientName: 'Sunset Retail Group',
      projectName: 'Shopping Center Expansion',
      amount: 750000,
      status: 'approved',
      date: '2025-01-12'
    },
    {
      id: 'INV-2025-002',
      type: 'invoice',
      clientName: 'Harbor Point LLC',
      projectName: 'Waterfront Condominiums',
      amount: 92000,
      status: 'overdue',
      date: '2025-01-05',
      dueDate: '2025-01-20'
    },
    {
      id: 'EST-2025-003',
      type: 'estimate',
      clientName: 'Industrial Park Corp',
      projectName: 'Warehouse Complex',
      amount: 650000,
      status: 'rejected',
      date: '2025-01-09'
    }
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      case 'approved':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'paid':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case 'overdue':
        return { color: 'bg-red-100 text-red-800', icon: XCircle };
      case 'rejected':
        return { color: 'bg-red-100 text-red-800', icon: XCircle };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: FileText };
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'invoice' ? DollarSign : FileText;
  };

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
          {recentItems.map((item) => {
            const statusConfig = getStatusConfig(item.status);
            const StatusIcon = statusConfig.icon;
            const TypeIcon = getTypeIcon(item.type);
            
            return (
              <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${item.type === 'invoice' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                    <TypeIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">{item.id}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{item.clientName}</p>
                    <p className="text-xs text-gray-500 truncate max-w-xs">{item.projectName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${item.amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{item.date}</p>
                  {item.dueDate && (
                    <p className="text-xs text-gray-400">Due: {item.dueDate}</p>
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

export default RecentEstimatesInvoices;