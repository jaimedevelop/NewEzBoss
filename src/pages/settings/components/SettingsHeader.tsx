import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

const SettingsHeader: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-sm text-white p-8">
      <div className="flex items-center space-x-4">
        <div className="bg-white bg-opacity-20 p-3 rounded-lg">
          <SettingsIcon className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-orange-100 text-lg">
            Manage your account, company information, and application preferences.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsHeader;