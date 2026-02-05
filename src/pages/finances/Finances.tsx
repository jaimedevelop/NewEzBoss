import React, { useState } from 'react';
import FinancesHeader from './FinancesHeader';
import FinancesTabDisplay from './FinancesTabDisplay';

export type FinanceTabType = 'bank' | 'budget' | 'calendar';

const Finances: React.FC = () => {
    const [activeTab, setActiveTab] = useState<FinanceTabType>('bank');

    const tabs: { id: FinanceTabType; label: string }[] = [
        { id: 'bank', label: 'Bank' },
        { id: 'budget', label: 'Budget' },
        { id: 'calendar', label: 'Calendar' },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <FinancesHeader />

            {/* Tab Bar */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200
                                ${activeTab === tab.id
                                    ? 'border-orange-500 text-orange-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <FinancesTabDisplay activeTab={activeTab} />
        </div>
    );
};

export default Finances;
