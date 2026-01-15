import React from 'react';
import { Package, Calendar, MessageSquare, History, FileEdit, DollarSign, Eye } from 'lucide-react';
import { type Estimate } from '../../../../services/estimates/estimates.types';

interface TabBarProps {
  activeTab: 'estimate' | 'timeline' | 'communication' | 'history' | 'change-orders' | 'payments' | 'client-view';
  onTabChange: (tab: 'estimate' | 'timeline' | 'communication' | 'history' | 'change-orders' | 'payments' | 'client-view') => void;
  estimate: Estimate;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange, estimate }) => {
  const allTabs = [
    {
      id: 'estimate' as const,
      label: 'Estimate',
      icon: Package,
      description: 'Estimate details'
    },
    {
      id: 'client-view' as const,
      label: 'Client View',
      icon: Eye,
      description: 'Customize client display'
    },
    {
      id: 'change-orders' as const,
      label: 'Change Orders',
      icon: FileEdit,
      description: 'Modifications and additions to the estimate'
    },
    {
      id: 'payments' as const,
      label: 'Payments',
      icon: DollarSign,
      description: 'Payment records and balance tracking'
    },
    {
      id: 'timeline' as const,
      label: 'Timeline',
      icon: Calendar,
      description: 'Key dates & milestones'
    },
    {
      id: 'communication' as const,
      label: 'Communication',
      icon: MessageSquare,
      description: 'Customer interactions'
    },
    {
      id: 'history' as const,
      label: 'History',
      icon: History,
      description: 'Revision tracking'
    }
  ];

  // Filter out Change Orders tab if this is a Change Order
  const tabs = estimate.estimateState === 'change-order'
    ? allTabs.filter(tab => tab.id !== 'change-orders')
    : allTabs;

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${isActive
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default TabBar;