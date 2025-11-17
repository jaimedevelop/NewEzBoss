// src/pages/collections/components/CollectionsScreen/components/CollectionTopTabBar.tsx
import React from 'react';
import { Package, Briefcase, Wrench, Truck, Layers } from 'lucide-react';
import type { CollectionContentType, Collection } from '../../../../../services/collections';

// ✅ NEW: Union type for view
type CollectionViewType = 'summary' | CollectionContentType;

interface CollectionTopTabBarProps {
  activeView: CollectionViewType;  // ✅ Changed from activeContentType
  collection: Collection;
  onViewChange: (view: CollectionViewType) => void;  // ✅ Changed from onContentTypeChange
}

const CollectionTopTabBar: React.FC<CollectionTopTabBarProps> = ({
  activeView,
  collection,
  onViewChange,
}) => {
  const tabs = [
    {
      type: 'summary' as const,
      label: 'Summary',
      icon: Layers,
      color: 'indigo',
      count: 0, // No count badge for summary
    },
    {
      type: 'products' as CollectionContentType,
      label: 'Products',
      icon: Package,
      color: 'blue',
      count: collection.productCategoryTabs?.length || 0,
    },
    {
      type: 'labor' as CollectionContentType,
      label: 'Labor',
      icon: Briefcase,
      color: 'purple',
      count: collection.laborCategoryTabs?.length || 0,
    },
    {
      type: 'tools' as CollectionContentType,
      label: 'Tools',
      icon: Wrench,
      color: 'orange',
      count: collection.toolCategoryTabs?.length || 0,
    },
    {
      type: 'equipment' as CollectionContentType,
      label: 'Equipment',
      icon: Truck,
      color: 'green',
      count: collection.equipmentCategoryTabs?.length || 0,
    },
  ];

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors = {
      indigo: {
        active: 'bg-indigo-50 border-indigo-500 text-indigo-700',
        inactive: 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600',
        badge: 'bg-indigo-100 text-indigo-800',
      },
      blue: {
        active: 'bg-blue-50 border-blue-500 text-blue-700',
        inactive: 'text-gray-600 hover:bg-blue-50 hover:text-blue-600',
        badge: 'bg-blue-100 text-blue-800',
      },
      purple: {
        active: 'bg-purple-50 border-purple-500 text-purple-700',
        inactive: 'text-gray-600 hover:bg-purple-50 hover:text-purple-600',
        badge: 'bg-purple-100 text-purple-800',
      },
      orange: {
        active: 'bg-orange-50 border-orange-500 text-orange-700',
        inactive: 'text-gray-600 hover:bg-orange-50 hover:text-orange-600',
        badge: 'bg-orange-100 text-orange-800',
      },
      green: {
        active: 'bg-green-50 border-green-500 text-green-700',
        inactive: 'text-gray-600 hover:bg-green-50 hover:text-green-600',
        badge: 'bg-green-100 text-green-800',
      },
    };

    return isActive ? colors[color].active : colors[color].inactive;
  };

  const getBadgeColorClasses = (color: string) => {
    const colors = {
      indigo: 'bg-indigo-100 text-indigo-800',
      blue: 'bg-blue-100 text-blue-800',
      purple: 'bg-purple-100 text-purple-800',
      orange: 'bg-orange-100 text-orange-800',
      green: 'bg-green-100 text-green-800',
    };
    return colors[color];
  };

  return (
    <div className="bg-white border-b-2 border-gray-200">
      <div className="px-6 py-3">
        <div className="flex items-center space-x-2">
          {tabs.map((tab) => {
            const isActive = activeView === tab.type;
            const Icon = tab.icon;

            return (
              <button
                key={tab.type}
                onClick={() => onViewChange(tab.type)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 border-2
                  ${getColorClasses(tab.color, isActive)}
                  ${isActive ? 'border-current' : 'border-transparent'}
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-semibold text-sm">{tab.label}</span>
                {tab.count > 0 && tab.type !== 'summary' && (
                  <span className={`
                    px-2 py-0.5 text-xs rounded-full font-bold
                    ${getBadgeColorClasses(tab.color)}
                  `}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CollectionTopTabBar;