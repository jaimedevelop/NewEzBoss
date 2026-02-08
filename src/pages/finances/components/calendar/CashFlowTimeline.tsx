import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface CashFlowTimelineProps {
    // Placeholder for now - will be populated with real data
}

const CashFlowTimeline: React.FC<CashFlowTimelineProps> = () => {
    // Generate placeholder data for 60-day projection
    const generatePlaceholderData = () => {
        const data = [];
        let balance = 45000;

        for (let i = 0; i < 60; i++) {
            // Simulate some variance with occasional large payments/income
            let change = Math.random() * 1000 - 500;

            // Add some scheduled payments (every 15 days)
            if (i % 15 === 0) {
                change -= 2000; // Large payment
            }

            // Add some income (every 7 days)
            if (i % 7 === 0) {
                change += 1500; // Income
            }

            balance += change;
            data.push({
                day: i + 1,
                balance: Math.max(balance, 0),
                date: new Date(Date.now() + i * 24 * 60 * 60 * 1000)
            });
        }
        return data;
    };

    const data = generatePlaceholderData();
    const startBalance = data[0].balance;
    const endBalance = data[data.length - 1].balance;
    const trend = endBalance > startBalance ? 'up' : 'down';
    const minBalance = Math.min(...data.map(d => d.balance));
    const criticalThreshold = 10000; // Warning threshold

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

    // Simple SVG line chart
    const maxBalance = Math.max(...data.map(d => d.balance));
    const range = maxBalance - minBalance || 1;

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((d.balance - minBalance) / range) * 80; // Leave 10% padding
        return `${x},${y}`;
    }).join(' ');

    // Calculate threshold line position
    const thresholdY = 100 - ((criticalThreshold - minBalance) / range) * 80;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">60-Day Cash Flow Timeline</h3>
                <div className={`flex items-center space-x-2 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {trend === 'up' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    <span className="text-sm font-semibold">
                        {trend === 'up' ? '+' : ''}{formatCurrency(endBalance - startBalance)}
                    </span>
                </div>
            </div>

            {/* Warning if balance goes below threshold */}
            {minBalance < criticalThreshold && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                        ⚠️ Warning: Your projected balance drops below {formatCurrency(criticalThreshold)} during this period
                    </p>
                </div>
            )}

            {/* Chart */}
            <div className="relative h-64 bg-gray-50 rounded-xl p-4">
                <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="0" y1="20" x2="100" y2="20" stroke="#e5e7eb" strokeWidth="0.5" />
                    <line x1="0" y1="40" x2="100" y2="40" stroke="#e5e7eb" strokeWidth="0.5" />
                    <line x1="0" y1="60" x2="100" y2="60" stroke="#e5e7eb" strokeWidth="0.5" />
                    <line x1="0" y1="80" x2="100" y2="80" stroke="#e5e7eb" strokeWidth="0.5" />

                    {/* Critical threshold line */}
                    {minBalance < criticalThreshold && (
                        <line
                            x1="0"
                            y1={thresholdY}
                            x2="100"
                            y2={thresholdY}
                            stroke="#f59e0b"
                            strokeWidth="1"
                            strokeDasharray="4,4"
                        />
                    )}

                    {/* Area under curve with color zones */}
                    <defs>
                        <linearGradient id="balanceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
                        </linearGradient>
                    </defs>

                    <polygon
                        points={`0,100 ${points} 100,100`}
                        fill="url(#balanceGradient)"
                        stroke="none"
                    />

                    {/* Line */}
                    <polyline
                        points={points}
                        fill="none"
                        stroke={trend === 'up' ? '#10b981' : '#ef4444'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-4 mt-6 text-sm">
                <div>
                    <span className="text-gray-600">Starting: </span>
                    <span className="font-semibold text-gray-900">{formatCurrency(startBalance)}</span>
                </div>
                <div>
                    <span className="text-gray-600">Lowest: </span>
                    <span className={`font-semibold ${minBalance < criticalThreshold ? 'text-yellow-600' : 'text-gray-900'}`}>
                        {formatCurrency(minBalance)}
                    </span>
                </div>
                <div>
                    <span className="text-gray-600">Projected: </span>
                    <span className={`font-semibold ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(endBalance)}
                    </span>
                </div>
            </div>

            {/* Date Range */}
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                <span>{formatDate(data[0].date)}</span>
                <span>60-day projection</span>
                <span>{formatDate(data[data.length - 1].date)}</span>
            </div>
        </div>
    );
};

export default CashFlowTimeline;
