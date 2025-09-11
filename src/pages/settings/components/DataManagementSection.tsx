import React from 'react';
import { Database, Download, Upload, Trash2, Shield, AlertTriangle } from 'lucide-react';

const DataManagementSection: React.FC = () => {
  const handleExportData = () => {
    console.log('Exporting data...');
  };

  const handleImportData = () => {
    console.log('Importing data...');
  };

  const handleBackupData = () => {
    console.log('Creating backup...');
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      console.log('Deleting account...');
    }
  };

  return (
    <div className="space-y-8">
      {/* Data Export */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Download className="h-5 w-5 mr-2 text-orange-600" />
          Export Data
        </h3>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Download all your construction data including projects, estimates, inventory, and client information.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Complete Data Export</h4>
              <p className="text-sm text-gray-600 mb-3">
                Export all data in JSON format for backup or migration purposes.
              </p>
              <button
                onClick={handleExportData}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm"
              >
                Export All Data
              </button>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">PDF Reports</h4>
              <p className="text-sm text-gray-600 mb-3">
                Generate PDF reports for projects, estimates, and financial summaries.
              </p>
              <button
                onClick={handleExportData}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Generate Reports
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Import */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Upload className="h-5 w-5 mr-2 text-orange-600" />
          Import Data
        </h3>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Import data from other construction management systems or restore from a backup.
          </p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 mb-2">Upload Data File</h4>
            <p className="text-sm text-gray-600 mb-4">
              Drag and drop your data file here, or click to browse. Supports JSON, CSV, and Excel formats.
            </p>
            <button
              onClick={handleImportData}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              Choose File
            </button>
          </div>
        </div>
      </div>

      {/* Backup Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Database className="h-5 w-5 mr-2 text-orange-600" />
          Backup Settings
        </h3>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Automatic Backup Frequency
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup Retention
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors">
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
                <option value="forever">Forever</option>
              </select>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">Backup Information</h4>
                <p className="text-sm text-blue-800">
                  Your data is automatically backed up to secure cloud storage. Last backup: January 15, 2025 at 3:00 AM
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleBackupData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Create Manual Backup
          </button>
        </div>
      </div>

      {/* Data Privacy */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Data Privacy & Compliance</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Data Processing Agreement</h4>
              <p className="text-sm text-gray-600 mb-3">
                Review our data processing terms and privacy policy.
              </p>
              <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                View Agreement →
              </button>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">GDPR Compliance</h4>
              <p className="text-sm text-gray-600 mb-3">
                Manage your data rights and privacy preferences.
              </p>
              <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
                Privacy Settings →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-6 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Danger Zone
        </h3>
        <div className="space-y-4">
          <div className="bg-white border border-red-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-red-900 mb-2">Delete Account</h4>
                <p className="text-sm text-red-700">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center space-x-2 ml-4"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManagementSection;