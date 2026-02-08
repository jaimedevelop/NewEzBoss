import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarHubCardProps {
    upcomingPayments: Array<{
        id: string;
        name: string;
        amount: number;
        dueDate: Date;
    }>;
}

const CalendarHubCard: React.FC<CalendarHubCardProps> = ({ upcomingPayments }) => {
    const navigate = useNavigate();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
        }).format(date);
    };

    const getDayOfWeek = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
    };

    // Get current week dates
    const getCurrentWeek = () => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek);

        const week = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            week.push(date);
        }
        return week;
    };

    const currentWeek = getCurrentWeek();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-50 rounded-lg">
                        <CalendarIcon size={24} className="text-orange-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Financial Calendar</h3>
                </div>
            </div>

            {/* Mini Calendar - Current Week */}
            <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">This Week</p>
                <div className="grid grid-cols-7 gap-1">
                    {currentWeek.map((date, index) => {
                        const isToday = date.getTime() === today.getTime();
                        return (
                            <div
                                key={index}
                                className={`text-center p-2 rounded-lg ${isToday
                                        ? 'bg-orange-500 text-white font-bold'
                                        : 'bg-gray-50 text-gray-700'
                                    }`}
                            >
                                <div className="text-xs">{getDayOfWeek(date)}</div>
                                <div className="text-sm font-semibold">{date.getDate()}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Upcoming Payments */}
            <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">Next 3 Upcoming Payments</p>
                {upcomingPayments.length > 0 ? (
                    <div className="space-y-2">
                        {upcomingPayments.slice(0, 3).map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {payment.name}
                                    </p>
                                    <p className="text-xs text-gray-500">{formatDate(payment.dueDate)}</p>
                                </div>
                                <p className="text-sm font-semibold text-red-600 ml-4">
                                    {formatCurrency(payment.amount)}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 italic">No upcoming payments</p>
                )}
            </div>

            {/* View All Link */}
            <button
                onClick={() => navigate('/finances/calendar')}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-orange-50 hover:bg-orange-100 text-orange-600 font-semibold rounded-xl transition-colors"
            >
                <span>View Full Calendar</span>
                <ArrowRight size={18} />
            </button>
        </div>
    );
};

export default CalendarHubCard;
