import React from 'react';
import Bank from './components/bank/Bank';
import Budget from './components/budget/Budget';
import Calendar from './components/calendar/Calendar';

interface FinancesTabDisplayProps {
    activeTab: 'bank' | 'budget' | 'calendar';
}

const FinancesTabDisplay: React.FC<FinancesTabDisplayProps> = ({ activeTab }) => {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm min-h-[500px]">
            {activeTab === 'bank' && <Bank />}
            {activeTab === 'budget' && <Budget />}
            {activeTab === 'calendar' && <Calendar />}
        </div>
    );
};

export default FinancesTabDisplay;
