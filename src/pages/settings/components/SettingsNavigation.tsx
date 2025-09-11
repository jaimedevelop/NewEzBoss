import React from 'react';
import { User, Building, Cog, Database, Bell, Shield } from 'lucide-react';

interface SettingsNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const SettingsNavigation: React.FC<SettingsNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'profile', name: 'User Profile', icon: User },
    { id: 'company', name: 'Company Info', icon: Building },
    { id: 'preferences', name: 'Preferences', icon: Cog },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'data', name: 'Data Management', icon: Database },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <nav className="space-y-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-orange-50 text-orange-700 border-l-4 border-orange-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className={`h-5 w-5 mr-3 ${
                activeTab === tab.id ? 'text-orange-600' : 'text-gray-400'
              }`} />
              {tab.name}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default SettingsNavigation;