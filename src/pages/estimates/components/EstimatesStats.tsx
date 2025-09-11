import React from 'react';
import { FileText, Clock, CheckCircle, DollarSign } from 'lucide-react';

interface EstimateStatsData {
  totalEstimates: number;
  pendingEstimates: number;
  approvedEstimates: number;
  totalValue: number;
  averageValue: number;
  conversionRate: number;
}

interface EstimatesStatsProps {
  stats: EstimateStatsData;
}

const EstimatesStats: React.FC<EstimatesStatsProps> = ({ stats }) => {
  const statItems = [
    {
      title: 'Total Estimates',
      value: stats.totalEstimates,
      icon: FileText,
      color: 'bg-orange-50 text-orange-600',
      change: '+5 this month'
    },
    {
      title: 'Pending Review',
      value: stats.pendingEstimates,
      icon: Clock,
      color: 'bg-yellow-50 text-yellow-600',
      change: '3 awaiting response'
    },
    {
      title: 'Approved',
      value: stats.approvedEstimates,
      icon: CheckCircle,
      color: 'bg-green-50 text-green-600',
      change: '+2 this week'
    },
    {
      title: 'Total Value',
      value: `$${(stats.totalValue / 1000000).toFixed(1)}M`,
      icon: DollarSign,
      color: 'bg-purple-50 text-purple-600',
      change: `${stats.conversionRate}% conversion`
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${item.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">{item.title}</h3>
              <p className="text-xs text-green-600">{item.change}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EstimatesStats;