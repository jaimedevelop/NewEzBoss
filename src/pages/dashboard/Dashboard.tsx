import React from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import ProjectSummaryCards from './components/ProjectSummaryCards';
import EstimatesSummary from './components/EstimatesSummary';
import InventoryAlerts from './components/InventoryAlerts';
import QuickActions from './components/QuickActions';
import TodaysSchedule from './components/TodaysSchedule';

const Dashboard: React.FC = () => {
  // Get the current user from AuthContext
  const { userProfile } = useAuthContext();
  
  // Extract user's first name for greeting (fallback to "User" if not available)
  // Check both 'name' and 'displayName' for backward compatibility
  const fullName = (userProfile as any)?.name || userProfile?.displayName || '';
  const userName = fullName ? fullName.split(' ')[0] : 'User';

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-sm text-white p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back, {userName}!</h1>
            <p className="text-orange-100 text-lg">
              Here's what's happening with your construction projects today.
            </p>
          </div>
          <div className="mt-4 sm:mt-0 text-right">
            <p className="text-orange-100 text-sm">Today</p>
            <p className="text-xl font-semibold">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Project Summary Cards */}
      <ProjectSummaryCards />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Takes 2/3 width on large screens */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Estimates & Invoices */}
          <EstimatesSummary />
          
          {/* Quick Actions */}
          <QuickActions />
        </div>

        {/* Right Column - Takes 1/3 width on large screens */}
        <div className="space-y-8">
          {/* Today's Schedule */}
          <TodaysSchedule />
          
          {/* Inventory Alerts */}
          <InventoryAlerts />
        </div>
      </div>

      {/* Bottom Section - Full Width */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Performance Overview</h2>
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent">
            <option>Last 30 days</option>
            <option>Last 3 months</option>
            <option>Last 6 months</option>
            <option>This year</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-3xl font-bold text-orange-600">$2.1M</p>
            <p className="text-sm text-gray-600 mt-1">Total Revenue</p>
            <p className="text-xs text-green-600 mt-1">+12% from last month</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-3xl font-bold text-green-600">94%</p>
            <p className="text-sm text-gray-600 mt-1">Client Satisfaction</p>
            <p className="text-xs text-green-600 mt-1">+2% from last month</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">18</p>
            <p className="text-sm text-gray-600 mt-1">Active Contracts</p>
            <p className="text-xs text-blue-600 mt-1">3 new this month</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-3xl font-bold text-purple-600">24</p>
            <p className="text-sm text-gray-600 mt-1">Team Members</p>
            <p className="text-xs text-purple-600 mt-1">2 new hires</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;