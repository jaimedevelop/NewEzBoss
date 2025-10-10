import React from 'react';
import { Package, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';

interface ProductsStatsData {
  totalProducts: number;
  lowStockItems: number;
  totalValue: number;
  categories: number;
  totalOnHand: number;
  totalAssigned: number;
}

interface ProductsStatsProps {
  stats: ProductsStatsData;
}

const ProductsStats: React.FC<ProductsStatsProps> = ({ stats }) => {
  const statItems = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-orange-50 text-orange-600',
      change: '+12 this month'
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-600',
      change: '-3 from last week'
    },
    {
      title: 'Total Value',
      value: `$${(stats.totalValue / 1000).toFixed(0)}K`,
      icon: DollarSign,
      color: 'bg-green-50 text-green-600',
      change: '+8% growth'
    },
    {
      title: 'Categories',
      value: stats.categories,
      icon: TrendingUp,
      color: 'bg-purple-50 text-purple-600',
      change: '2 new categories'
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

export default ProductsStats;