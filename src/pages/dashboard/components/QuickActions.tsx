import React from 'react';
import { Plus, FileText, Calendar, Users, TrendingUp, Package } from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  onClick: () => void;
}

const QuickActions: React.FC = () => {
  const quickActions: QuickAction[] = [
    {
      id: 'new-project',
      title: 'New Project',
      description: 'Start a new construction project',
      icon: Plus,
      color: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
      onClick: () => console.log('Navigate to new project')
    },
    {
      id: 'create-estimate',
      title: 'Create Estimate',
      description: 'Generate project estimate',
      icon: FileText,
      color: 'bg-green-50 text-green-600 hover:bg-green-100',
      onClick: () => console.log('Navigate to new estimate')
    },
    {
      id: 'schedule-meeting',
      title: 'Schedule Meeting',
      description: 'Book client consultation',
      icon: Calendar,
      color: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      onClick: () => console.log('Open calendar')
    },
    {
      id: 'manage-team',
      title: 'Manage Team',
      description: 'View team assignments',
      icon: Users,
      color: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      onClick: () => console.log('Navigate to team management')
    },
    {
      id: 'view-reports',
      title: 'View Reports',
      description: 'Business analytics',
      icon: TrendingUp,
      color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
      onClick: () => console.log('Navigate to reports')
    },
    {
      id: 'check-inventory',
      title: 'Check Inventory',
      description: 'Material stock levels',
      icon: Package,
      color: 'bg-gray-50 text-gray-600 hover:bg-gray-100',
      onClick: () => console.log('Navigate to inventory')
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
        <p className="text-sm text-gray-600 mt-1">Common tasks and shortcuts</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={action.onClick}
                className={`p-4 rounded-lg transition-all duration-200 text-left group ${action.color}`}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <Icon className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" />
                  <div>
                    <p className="text-sm font-medium">{action.title}</p>
                    <p className="text-xs opacity-75 mt-1">{action.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuickActions;