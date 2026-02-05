import React from 'react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { Payment, FinanceCategory } from '../../../../services/finances';
import { Timestamp } from 'firebase/firestore';

interface UpcomingPaymentsProps {
    payments: Payment[];
    categories: FinanceCategory[];
}

const UpcomingPayments: React.FC<UpcomingPaymentsProps> = ({ payments, categories }) => {
    const sortedPayments = [...payments]
        .filter(p => {
            const dueDate = p.dueDate instanceof Timestamp ? p.dueDate.toDate() : new Date(p.dueDate);
            return dueDate >= new Date() || p.status === 'pending';
        })
        .sort((a, b) => {
            const dateA = a.dueDate instanceof Timestamp ? a.dueDate.toDate() : new Date(a.dueDate);
            const dateB = b.dueDate instanceof Timestamp ? b.dueDate.toDate() : new Date(b.dueDate);
            return dateA.getTime() - dateB.getTime();
        });

    const formatDate = (date: any) => {
        const d = date instanceof Timestamp ? date.toDate() : new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const getStatusStyle = (status: string, dueDate: any) => {
        const d = dueDate instanceof Timestamp ? dueDate.toDate() : new Date(dueDate);
        const isOverdue = d < new Date() && status === 'pending';

        if (isOverdue) return 'bg-red-100 text-red-600';
        if (status === 'paid') return 'bg-emerald-100 text-emerald-600';
        return 'bg-blue-100 text-blue-600';
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Clock size={20} className="text-orange-500" />
                    Upcoming Payments
                </h3>
                <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                    {sortedPayments.length} Total
                </span>
            </div>

            <div className="space-y-4">
                {sortedPayments.length === 0 ? (
                    <div className="text-center py-10">
                        <CalendarIcon size={40} className="mx-auto text-gray-200 mb-2" />
                        <p className="text-gray-400 text-sm">No upcoming payments</p>
                    </div>
                ) : (
                    sortedPayments.map((payment) => {
                        const category = categories.find(c => c.id === payment.categoryId);
                        return (
                            <div
                                key={payment.id}
                                className="group flex items-center justify-between p-4 rounded-2xl border border-gray-50 hover:border-orange-100 hover:bg-orange-50/30 transition-all cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getStatusStyle(payment.status, payment.dueDate)}`}>
                                        <div className="text-center">
                                            <p className="text-[10px] font-bold uppercase leading-none mb-1">
                                                {formatDate(payment.dueDate).split(' ')[0]}
                                            </p>
                                            <p className="text-sm font-black leading-none">
                                                {formatDate(payment.dueDate).split(' ')[1]}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 group-hover:text-orange-700 transition-colors">{payment.title}</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-bold">
                                                {category?.name || 'Uncategorized'}
                                            </span>
                                            {payment.isRecurring && (
                                                <span className="text-[10px] text-orange-500 font-bold flex items-center gap-1">
                                                    <Clock size={10} /> {payment.recurringDetails?.frequency}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-3">
                                    <div>
                                        <p className="font-black text-gray-900">{formatCurrency(payment.amount)}</p>
                                        <p className={`text-[10px] font-bold uppercase ${payment.status === 'paid' ? 'text-emerald-500' : 'text-orange-500'
                                            }`}>
                                            {payment.status}
                                        </p>
                                    </div>
                                    <ChevronRight size={18} className="text-gray-300 group-hover:text-orange-400 transition-colors" />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default UpcomingPayments;
