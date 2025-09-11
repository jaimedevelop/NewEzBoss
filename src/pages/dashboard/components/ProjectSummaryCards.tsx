import React from 'react';
import { BarChart3, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface ProjectSummary {
  id: string;
  title: string;
  value: string | number;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<any>;
  color: string;
}

const ProjectSummaryCards: React.FC = () => {
  const summaryData: ProjectSummary[] = [
    {
      id: 'active-projects',
      title: 'Active Projects',
      value: 12,
      change: '+2 from last month',
      changeType: 'positive',
      icon: BarChart3,
      color: 'bg-orange-50 text-orange-600'
    },
    {
      id: 'in-progress',
      title: 'In Progress',
      value: 8,
      change: '3 starting this week',
      changeType: 'neutral',
      icon: Clock,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      id: 'completed',
      title: 'Completed This Month',
      value: 4,
      change: '+1 from last month',
      changeType: 'positive',
      icon: CheckCircle,
      color: 'bg-green-50 text-green-600'
    },
    {
      id: 'overdue',
      title: 'Overdue Tasks',
      value: 3,
      change: '-2 from last week',
      changeType: 'positive',
      icon: AlertTriangle,
      color: 'bg-red-50 text-red-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {summaryData.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${item.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{item.value}</p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">{item.title}</h3>
              <p className={`text-xs ${
                item.changeType === 'positive' ? 'text-green-600' :
                item.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {item.change}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProjectSummaryCards;