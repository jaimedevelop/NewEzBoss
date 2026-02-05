import React from 'react';
import { Wallet, TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';

interface SummaryCardProps {
    title: string;
    amount: string;
    icon: React.ReactNode;
    colorClass: string;
    iconColor: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, amount, icon, colorClass, iconColor }) => (
    <div className={`p-6 rounded-2xl shadow-sm border border-gray-100 ${colorClass} transition-all hover:scale-[1.02] duration-300`}>
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
            <div className={`p-2 rounded-lg ${iconColor} bg-white shadow-sm`}>
                {icon}
            </div>
        </div>
        <div className="flex flex-col">
            <span className="text-2xl font-bold text-gray-900">{amount}</span>
        </div>
    </div>
);

const BankSummary: React.FC = () => {
    // Placeholder data - would eventually come from props or a hook
    const summaryData = [
        {
            title: 'Total Balance',
            amount: '$45,250.00',
            icon: <Wallet className="w-5 h-5" />,
            colorClass: 'bg-blue-50/50',
            iconColor: 'text-blue-600'
        },
        {
            title: 'Monthly Income',
            amount: '$12,400.00',
            icon: <TrendingUp className="w-5 h-5" />,
            colorClass: 'bg-green-50/50',
            iconColor: 'text-green-600'
        },
        {
            title: 'Monthly Expenses',
            amount: '$8,150.00',
            icon: <TrendingDown className="w-5 h-5" />,
            colorClass: 'bg-red-50/50',
            iconColor: 'text-red-600'
        },
        {
            title: 'Monthly Change',
            amount: '+$4,250.00',
            icon: <RefreshCcw className="w-5 h-5" />,
            colorClass: 'bg-purple-50/50',
            iconColor: 'text-purple-600'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {summaryData.map((card, index) => (
                <SummaryCard key={index} {...card} />
            ))}
        </div>
    );
};

export default BankSummary;
