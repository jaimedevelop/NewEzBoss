import React from 'react';
import { Clock, MapPin, User, Phone, Calendar } from 'lucide-react';

interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  type: 'meeting' | 'site-visit' | 'call' | 'inspection';
  client?: string;
  location?: string;
  phone?: string;
  status: 'upcoming' | 'in-progress' | 'completed';
}

const TodaysSchedule: React.FC = () => {
  const todaysDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const scheduleItems: ScheduleItem[] = [
    {
      id: '1',
      time: '9:00 AM',
      title: 'Site Inspection - Harbor View',
      type: 'site-visit',
      client: 'Coastal Living LLC',
      location: '789 Harbor Dr, Marina, CA',
      status: 'completed'
    },
    {
      id: '2',
      time: '11:30 AM',
      title: 'Client Meeting - New Project Discussion',
      type: 'meeting',
      client: 'Green Valley Homes',
      location: 'Office Conference Room',
      status: 'in-progress'
    },
    {
      id: '3',
      time: '2:00 PM',
      title: 'Supplier Call - Material Pricing',
      type: 'call',
      client: 'BuildMart Supply',
      phone: '+1 (555) 123-4567',
      status: 'upcoming'
    },
    {
      id: '4',
      time: '4:30 PM',
      title: 'Final Inspection - Downtown Office',
      type: 'inspection',
      client: 'Metro Business Center',
      location: '456 Main St, Downtown, CA',
      status: 'upcoming'
    }
  ];

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'meeting':
        return { color: 'bg-blue-50 text-blue-600', icon: User };
      case 'site-visit':
        return { color: 'bg-orange-50 text-orange-600', icon: MapPin };
      case 'call':
        return { color: 'bg-green-50 text-green-600', icon: Phone };
      case 'inspection':
        return { color: 'bg-purple-50 text-purple-600', icon: Calendar };
      default:
        return { color: 'bg-gray-50 text-gray-600', icon: Clock };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'opacity-60';
      case 'in-progress':
        return 'border-l-4 border-orange-500 bg-orange-50';
      case 'upcoming':
        return 'border-l-4 border-blue-500';
      default:
        return '';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Today's Schedule</h2>
            <p className="text-sm text-gray-600">{todaysDate}</p>
          </div>
          <button className="text-orange-600 hover:text-orange-700 text-sm font-medium">
            View Calendar
          </button>
        </div>
      </div>
      <div className="p-6">
        {scheduleItems.length > 0 ? (
          <div className="space-y-4">
            {scheduleItems.map((item) => {
              const typeConfig = getTypeConfig(item.type);
              const TypeIcon = typeConfig.icon;
              
              return (
                <div key={item.id} className={`p-4 rounded-lg transition-all duration-200 ${getStatusColor(item.status)}`}>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{item.title}</h3>
                        <span className="text-sm font-medium text-gray-600">{item.time}</span>
                      </div>
                      {item.client && (
                        <p className="text-sm text-gray-600 mt-1">{item.client}</p>
                      )}
                      <div className="flex items-center mt-2 space-x-4">
                        {item.location && (
                          <div className="flex items-center text-xs text-gray-500">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="truncate">{item.location}</span>
                          </div>
                        )}
                        {item.phone && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Phone className="h-3 w-3 mr-1" />
                            <span>{item.phone}</span>
                          </div>
                        )}
                      </div>
                      {item.status === 'completed' && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Completed
                          </span>
                        </div>
                      )}
                      {item.status === 'in-progress' && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            In Progress
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments today</h3>
            <p className="text-gray-600">Your schedule is clear for today.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodaysSchedule;