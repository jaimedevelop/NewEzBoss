import React, { useState } from 'react';
import SettingsHeader from './components/SettingsHeader';
import SettingsNavigation from './components/SettingsNavigation';
import UserProfileSection from './components/UserProfileSection';
import CompanyInfoSection from './components/CompanyInfoSection';
import PreferencesSection from './components/PreferencesSection';
import NotificationsSection from './components/NotificationsSection';
import SecuritySection from './components/SecuritySection';
import DataManagementSection from './components/DataManagementSection';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <UserProfileSection />;
      case 'company':
        return <CompanyInfoSection />;
      case 'preferences':
        return <PreferencesSection />;
      case 'notifications':
        return <NotificationsSection />;
      case 'security':
        return <SecuritySection />;
      case 'data':
        return <DataManagementSection />;
      default:
        return <UserProfileSection />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <SettingsHeader />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1">
          <SettingsNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;