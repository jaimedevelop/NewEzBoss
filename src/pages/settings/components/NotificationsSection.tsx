import React, { useState } from 'react';
import { Bell, Save, Mail, Smartphone, Monitor } from 'lucide-react';

const NotificationsSection: React.FC = () => {
  const [notifications, setNotifications] = useState({
    email: {
      projectUpdates: true,
      inventoryAlerts: true,
      estimateApprovals: true,
      teamActivities: false,
      systemMaintenance: true,
      weeklyReports: true
    },
    push: {
      projectUpdates: true,
      inventoryAlerts: true,
      estimateApprovals: true,
      teamActivities: false,
      systemMaintenance: false,
      weeklyReports: false
    },
    inApp: {
      projectUpdates: true,
      inventoryAlerts: true,
      estimateApprovals: true,
      teamActivities: true,
      systemMaintenance: true,
      weeklyReports: false
    }
  });

  const handleNotificationChange = (type: 'email' | 'push' | 'inApp', key: string, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [key]: value
      }
    }));
  };

  const handleSave = () => {
    console.log('Saving notification preferences:', notifications);
  };

  const notificationTypes = [
    {
      key: 'projectUpdates',
      label: 'Project Updates',
      description: 'Status changes, milestones, and progress updates'
    },
    {
      key: 'inventoryAlerts',
      label: 'Inventory Alerts',
      description: 'Low stock warnings and reorder notifications'
    },
    {
      key: 'estimateApprovals',
      label: 'Estimate Approvals',
      description: 'When estimates are approved, rejected, or require attention'
    },
    {
      key: 'teamActivities',
      label: 'Team Activities',
      description: 'Updates from team members and collaborators'
    },
    {
      key: 'systemMaintenance',
      label: 'System Maintenance',
      description: 'Scheduled maintenance and system updates'
    },
    {
      key: 'weeklyReports',
      label: 'Weekly Reports',
      description: 'Summary of weekly activities and performance'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Notification Channels */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Bell className="h-5 w-5 mr-2 text-orange-600" />
          Notification Preferences
        </h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 pr-4">
                  <span className="text-sm font-medium text-gray-900">Notification Type</span>
                </th>
                <th className="text-center py-3 px-4">
                  <div className="flex items-center justify-center">
                    <Mail className="h-4 w-4 mr-1 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">Email</span>
                  </div>
                </th>
                <th className="text-center py-3 px-4">
                  <div className="flex items-center justify-center">
                    <Smartphone className="h-4 w-4 mr-1 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">Push</span>
                  </div>
                </th>
                <th className="text-center py-3 pl-4">
                  <div className="flex items-center justify-center">
                    <Monitor className="h-4 w-4 mr-1 text-gray-500" />
                    <span className="text-sm font-medium text-gray-900">In-App</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {notificationTypes.map((type) => (
                <tr key={type.key} className="hover:bg-gray-50">
                  <td className="py-4 pr-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{type.label}</p>
                      <p className="text-sm text-gray-500">{type.description}</p>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.email[type.key as keyof typeof notifications.email]}
                        onChange={(e) => handleNotificationChange('email', type.key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.push[type.key as keyof typeof notifications.push]}
                        onChange={(e) => handleNotificationChange('push', type.key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </td>
                  <td className="py-4 pl-4 text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications.inApp[type.key as keyof typeof notifications.inApp]}
                        onChange={(e) => handleNotificationChange('inApp', type.key, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <h4 className="font-medium text-gray-900 mb-1">Enable All Email Notifications</h4>
            <p className="text-sm text-gray-500">Turn on all email notifications at once</p>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <h4 className="font-medium text-gray-900 mb-1">Disable All Push Notifications</h4>
            <p className="text-sm text-gray-500">Turn off all push notifications</p>
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>Save Preferences</span>
        </button>
      </div>
    </div>
  );
};

export default NotificationsSection;