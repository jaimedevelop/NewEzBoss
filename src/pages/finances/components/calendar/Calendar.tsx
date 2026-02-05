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
import CalendarView from './CalendarView';
import UpcomingPayments from './UpcomingPayments';
import CalendarFilters from './CalendarFilters';
import AddPaymentModal from './AddPaymentModal';

const Calendar: React.FC = () => {
    const { currentUser } = useAuthContext();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [categories, setCategories] = useState<FinanceCategory[]>([]);
    const [showPayments, setShowPayments] = useState(true);
    const [showEvents, setShowEvents] = useState(true);
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
        <div className="p-6 bg-gray-50/50 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left Column: Calendar and Filters */}
                    <div className="flex-1 space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 p-4 rounded-3xl border border-gray-100 backdrop-blur-sm">
                            <CalendarFilters
                                showPayments={showPayments}
                                setShowPayments={setShowPayments}
                                showEvents={showEvents}
                                setShowEvents={setShowEvents}
                            />
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white font-bold rounded-2xl hover:bg-orange-700 transition-all shadow-lg shadow-orange-600/20 active:scale-95 whitespace-nowrap"
                            >
                                <Plus size={20} />
                                Add Payment
                            </button>
                        </div>

                        <CalendarView
                            payments={payments}
                            events={events}
                            showPayments={showPayments}
                            showEvents={showEvents}
                        />
                    </div>

                    {/* Right Column: Upcoming Payments */}
                    <div className="w-full lg:w-96">
                        <UpcomingPayments
                            payments={payments}
                            categories={categories}
                        />
                    </div>
                </div>
            </div>

            <AddPaymentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};

export default Calendar;
