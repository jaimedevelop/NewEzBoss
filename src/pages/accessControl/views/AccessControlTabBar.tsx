// src/pages/accessControl/views/AccessControlTabBar.tsx
import React from 'react';

export type AccessControlTab = 'users' | 'roles';

interface AccessControlTabBarProps {
  activeTab: AccessControlTab;
  onTabChange: (tab: AccessControlTab) => void;
}

const AccessControlTabBar: React.FC<AccessControlTabBarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'users' as AccessControlTab, label: 'Users' },
    { id: 'roles' as AccessControlTab, label: 'Roles & Permissions' },
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex space-x-8 px-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              py-4 px-2 border-b-2 font-medium text-sm transition-colors
              ${activeTab === tab.id
                ? 'border-orange-500 text-orange-600'
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

export default AccessControlTabBar;
