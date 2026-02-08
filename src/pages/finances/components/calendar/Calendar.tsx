import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import {
    Payment,
    CalendarEvent,
    FinanceCategory,
    subscribeToPayments,
    subscribeToCalendarEvents,
    subscribeToFinanceCategories
} from '../../../../services/finances';
import PageHeader from '../shared/PageHeader';
import CalendarView from './CalendarView';
import UpcomingPayments from './UpcomingPayments';
import CalendarFilters from './CalendarFilters';
import AddPaymentModal from './AddPaymentModal';
import CashFlowTimeline from './CashFlowTimeline';

const Calendar: React.FC = () => {
    const { currentUser } = useAuthContext();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [categories, setCategories] = useState<FinanceCategory[]>([]);
    const [showPayments, setShowPayments] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (!currentUser?.uid) return;

        const unsubPayments = subscribeToPayments(currentUser.uid, setPayments);
        const unsubEvents = subscribeToCalendarEvents(currentUser.uid, setEvents);
        const unsubCategories = subscribeToFinanceCategories(currentUser.uid, setCategories);

        return () => {
            unsubPayments();
            unsubEvents();
            unsubCategories();
        };
    }, [currentUser]);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Page Header */}
            <PageHeader
                title="Financial Calendar"
                description="View upcoming payments and track your financial timeline."
                breadcrumbs={[
                    { label: 'Financial Health', path: '/finances' },
                    { label: 'Financial Calendar', path: '/finances/calendar' }
                ]}
                actions={
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
                    >
                        <Plus size={18} />
                        <span>Add Payment</span>
                    </button>
                }
            />

            <div className="max-w-[1600px] mx-auto p-8 space-y-8">
                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Calendar and Filters */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Filters */}
                        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                            <CalendarFilters
                                showPayments={showPayments}
                                setShowPayments={setShowPayments}
                            />
                        </div>

                        {/* Calendar View */}
                        <CalendarView
                            payments={payments}
                            events={events}
                            showPayments={showPayments}
                            showEvents={true}
                        />
                    </div>

                    {/* Right Column: Upcoming Items */}
                    <div className="lg:col-span-1">
                        <UpcomingPayments
                            payments={payments}
                            categories={categories}
                        />
                    </div>
                </div>

                {/* Cash Flow Timeline */}
                <CashFlowTimeline />
            </div>

            <AddPaymentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};

export default Calendar;
