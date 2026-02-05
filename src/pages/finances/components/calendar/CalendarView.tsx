import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Payment, CalendarEvent } from '../../../../services/finances';
import { Timestamp } from 'firebase/firestore';

interface CalendarViewProps {
    payments: Payment[];
    events: CalendarEvent[];
    showPayments: boolean;
    showEvents: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({
    payments,
    events,
    showPayments,
    showEvents
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const days = [];
    const totalDays = daysInMonth(year, month);
    const startOffset = firstDayOfMonth(year, month);

    // Padding for start of month
    for (let i = 0; i < startOffset; i++) {
        days.push(null);
    }

    // Days of the month
    for (let i = 1; i <= totalDays; i++) {
        days.push(new Date(year, month, i));
    }

    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    const getItemsForDate = (date: Date) => {
        const items = [];

        if (showPayments) {
            const datePayments = payments.filter(p => {
                const d = p.dueDate instanceof Timestamp ? p.dueDate.toDate() : new Date(p.dueDate);
                return d.toDateString() === date.toDateString();
            });
            items.push(...datePayments.map(p => ({ ...p, itemType: 'payment' })));
        }

        if (showEvents) {
            const dateEvents = events.filter(e => {
                const d = e.startDate instanceof Timestamp ? e.startDate.toDate() : new Date(e.startDate);
                return d.toDateString() === date.toDateString();
            });
            items.push(...dateEvents.map(e => ({ ...e, itemType: 'event' })));
        }

        return items;
    };

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900 leading-none">{monthName}</h3>
                        <p className="text-sm font-bold text-gray-400 mt-1">{year}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handlePrevMonth}
                        className="p-2 hover:bg-gray-50 rounded-xl border border-gray-100 text-gray-400 hover:text-gray-900 transition-all"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-4 py-2 hover:bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold text-gray-600 transition-all"
                    >
                        Today
                    </button>
                    <button
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-gray-50 rounded-xl border border-gray-100 text-gray-400 hover:text-gray-900 transition-all"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 border-b border-gray-50">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-[120px]">
                {days.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} className="border-b border-r border-gray-50 bg-gray-50/30" />;

                    const dayItems = getItemsForDate(date);
                    const isToday = date.toDateString() === new Date().toDateString();

                    return (
                        <div key={idx} className={`border-b border-r border-gray-50 p-2 relative group hover:bg-orange-50/10 transition-colors ${isToday ? 'bg-orange-50/20' : ''}`}>
                            <span className={`text-xs font-bold ${isToday ? 'w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center' : 'text-gray-500'
                                }`}>
                                {date.getDate()}
                            </span>

                            <div className="mt-2 space-y-1 overflow-hidden h-20">
                                {dayItems.slice(0, 3).map((item: any, i) => (
                                    <div
                                        key={i}
                                        className={`text-[9px] font-bold px-1.5 py-1 rounded truncate flex items-center gap-1 ${item.itemType === 'payment'
                                                ? 'bg-orange-100 text-orange-700 border-l-2 border-orange-500'
                                                : 'bg-blue-100 text-blue-700 border-l-2 border-blue-500'
                                            }`}
                                    >
                                        <div className={`w-1 h-1 rounded-full ${item.itemType === 'payment' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                                        {item.title}
                                    </div>
                                ))}
                                {dayItems.length > 3 && (
                                    <div className="text-[8px] font-black text-gray-400 text-right pr-1">
                                        +{dayItems.length - 3} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;
