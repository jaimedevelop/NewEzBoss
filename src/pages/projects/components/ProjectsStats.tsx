import React from 'react';
import { BarChart3, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

interface ProjectStats {
  totalProjects: number;
  inProgress: number;
  completed: number;
  overdue: number;
  totalValue: number;
}

interface ProjectsStatsProps {
  stats: ProjectStats;
}

const ProjectsStats: React.FC<ProjectsStatsProps> = ({ stats }) => {
  const statItems = [
    {
      title: 'Total Projects',
      value: stats.totalProjects,
      icon: BarChart3,
      color: 'bg-orange-50 text-orange-600',
      change: '+2 this month'
    },
    {
      title: 'In Progress',
      value: stats.inProgress,
      icon: Clock,
      color: 'bg-blue-50 text-blue-600',
      change: '3 starting soon'
    },
    {
      title: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'bg-green-50 text-green-600',
      change: '+1 this week'
    },
    {
      title: 'Total Value',
      value: `$${(stats.totalValue / 1000000).toFixed(1)}M`,
      icon: AlertTriangle,
      color: 'bg-purple-50 text-purple-600',
      change: '+15% growth'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
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
              <p className="text-xs text-green-600">{item.change}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProjectsStats;