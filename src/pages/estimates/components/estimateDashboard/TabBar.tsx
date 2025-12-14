import React from 'react';
import { Package, Calendar, MessageSquare, History } from 'lucide-react';

interface TabBarProps {
  activeTab: 'items' | 'timeline' | 'communication' | 'history';
  onTabChange: (tab: 'items' | 'timeline' | 'communication' | 'history') => void;
}

const TabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    {
      id: 'items' as const,
      label: 'Items',
      icon: Package,
      description: 'Line items & change orders'
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
                    ? 'border-blue-600 text-blue-600'
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
      
      {/* Tab Description */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <p className="text-xs text-gray-600">
          {tabs.find(t => t.id === activeTab)?.description}
        </p>
      </div>
    </div>
  );
};

export default TabBar;