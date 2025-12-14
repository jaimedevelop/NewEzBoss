import React from 'react';
import { Calendar, Send, Eye, Check, X, Clock } from 'lucide-react';

interface TimelineSectionProps {
  estimate: {
    createdAt: string;
    sentDate?: string;
    viewedDate?: string;
    acceptedDate?: string;
    rejectedDate?: string;
    validUntil?: string;
    status: string;
  };
}

const TimelineSection: React.FC<TimelineSectionProps> = ({ estimate }) => {
  const events = [
    {
      label: 'Created',
      date: estimate.createdAt,
      icon: Calendar,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      completed: true
    },
    {
      label: 'Sent to Customer',
      date: estimate.sentDate,
      icon: Send,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      completed: !!estimate.sentDate
    },
    {
      label: 'Viewed by Customer',
      date: estimate.viewedDate,
      icon: Eye,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      completed: !!estimate.viewedDate
    },
    estimate.status === 'accepted'
      ? {
          label: 'Accepted',
          date: estimate.acceptedDate,
          icon: Check,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          completed: !!estimate.acceptedDate
        }
      : estimate.status === 'rejected'
      ? {
          label: 'Rejected',
          date: estimate.rejectedDate,
          icon: X,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          completed: !!estimate.rejectedDate
        }
      : {
          label: 'Awaiting Response',
          date: undefined,
          icon: Clock,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          completed: false
        }
  ];

  const validityEvent = estimate.validUntil
    ? {
        label: 'Valid Until',
        date: estimate.validUntil,
        icon: Clock,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        isExpiry: true
      }
    : null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Timeline</h2>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Key dates and milestones for this estimate
        </p>
      </div>

      <div className="p-6">
        {/* Timeline */}
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

          {/* Events */}
          <div className="space-y-6">
            {events.map((event, index) => (
              <div key={index} className="relative flex gap-4">
                {/* Icon */}
                <div className={`relative z-10 flex-shrink-0 w-8 h-8 ${event.bgColor} rounded-full flex items-center justify-center ${
                  !event.completed ? 'opacity-50' : ''
                }`}>
                  <event.icon className={`w-4 h-4 ${event.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm font-medium ${
                      event.completed ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {event.label}
                    </p>
                    {event.date && (
                      <p className="text-xs text-gray-500">
                        {new Date(event.date).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                  {!event.completed && !event.date && (
                    <p className="text-xs text-gray-500 mt-1">
                      Pending customer action
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* Validity Date */}
            {validityEvent && (
              <div className="relative flex gap-4 pt-4 border-t border-gray-200">
                <div className={`relative z-10 flex-shrink-0 w-8 h-8 ${validityEvent.bgColor} rounded-full flex items-center justify-center`}>
                  <validityEvent.icon className={`w-4 h-4 ${validityEvent.color}`} />
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {validityEvent.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(validityEvent.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {(() => {
                      const daysUntil = Math.floor(
                        (new Date(validityEvent.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      );
                      if (daysUntil < 0) return 'Expired';
                      if (daysUntil === 0) return 'Expires today';
                      if (daysUntil === 1) return 'Expires tomorrow';
                      return `${daysUntil} days remaining`;
                    })()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Time Active</p>
            <p className="text-sm font-semibold text-gray-900">
              {estimate.sentDate
                ? `${Math.floor((Date.now() - new Date(estimate.sentDate).getTime()) / (1000 * 60 * 60 * 24))} days`
                : 'Not sent yet'
              }
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Response Time</p>
            <p className="text-sm font-semibold text-gray-900">
              {estimate.viewedDate && estimate.sentDate
                ? `${Math.floor((new Date(estimate.viewedDate).getTime() - new Date(estimate.sentDate).getTime()) / (1000 * 60 * 60))} hours`
                : estimate.acceptedDate && estimate.sentDate
                ? `${Math.floor((new Date(estimate.acceptedDate).getTime() - new Date(estimate.sentDate).getTime()) / (1000 * 60 * 60 * 24))} days`
                : 'Pending'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineSection;