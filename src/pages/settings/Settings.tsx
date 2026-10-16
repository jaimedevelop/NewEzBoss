import React, { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Settings as SettingsIcon } from 'lucide-react';
import VariableHeader from '../../mainComponents/ui/VariableHeader';
import SettingsNavigation from './components/SettingsNavigation';
import UserProfileSection from './components/UserProfileSection';
import CompanyInfoSection from './components/CompanyInfoSection';
import PayoutsSection from './components/PayoutsSection';
import PreferencesSection from './components/PreferencesSection';
import NotificationsSection from './components/NotificationsSection';
import SecuritySection from './components/SecuritySection';
import DataManagementSection from './components/DataManagementSection';

const Settings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { hash } = useLocation();
  const activeTab = searchParams.get('tab') || (searchParams.has('stripeConnect') ? 'payments' : 'profile');
  useEffect(() => {
    if (activeTab === 'company' && hash === '#business-address') {
      const frame = requestAnimationFrame(() => {
        document.getElementById('business-address')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [activeTab, hash]);

  const setActiveTab = (tab: string) => {
    setSearchParams((params) => {
      params.set('tab', tab);
      return params;
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <UserProfileSection />;
      case 'company':
        return <CompanyInfoSection />;
      case 'payments':
        return <PayoutsSection />;
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
      <VariableHeader
        title="Settings"
        subtitle="Manage your account, company information, and application preferences."
        Icon={SettingsIcon}
      />

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