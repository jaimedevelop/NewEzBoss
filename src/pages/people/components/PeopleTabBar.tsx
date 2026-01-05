// src/pages/people/components/PeopleTabBar.tsx
import React from 'react';

type PeopleTab = 'clients' | 'employees' | 'other';

interface PeopleTabBarProps {
  activeTab: PeopleTab;
  onTabChange: (tab: PeopleTab) => void;
}

const PeopleTabBar: React.FC<PeopleTabBarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'clients' as PeopleTab, label: 'Clients', disabled: false },
    { id: 'employees' as PeopleTab, label: 'Employees', disabled: false },
    { id: 'other' as PeopleTab, label: 'Other', disabled: true },
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex space-x-8 px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            className={`
              py-4 px-2 border-b-2 font-medium text-sm transition-colors
              ${activeTab === tab.id
                ? 'border-orange-500 text-orange-600'
                : tab.disabled
                ? 'border-transparent text-gray-400 cursor-not-allowed'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PeopleTabBar;