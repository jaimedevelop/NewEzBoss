import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface CashFlowProjectionProps {
    // Placeholder for now - will be populated with real data
}

const CashFlowProjection: React.FC<CashFlowProjectionProps> = () => {
    // Placeholder data for 30-day projection
    const generatePlaceholderData = () => {
        const data = [];
        let balance = 45000;

        for (let i = 0; i < 30; i++) {
            // Simulate some variance
            const change = Math.random() * 2000 - 1000;
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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Simple SVG line chart
    const maxBalance = Math.max(...data.map(d => d.balance));
    const minBalance = Math.min(...data.map(d => d.balance));
    const range = maxBalance - minBalance || 1;

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((d.balance - minBalance) / range) * 80; // Leave 10% padding top/bottom
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">30-Day Cash Flow Projection</h3>
                <div className={`flex items-center space-x-2 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {trend === 'up' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                    <span className="text-sm font-semibold">
                        {trend === 'up' ? '+' : ''}{formatCurrency(endBalance - startBalance)}
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div className="relative h-48 bg-gray-50 rounded-xl p-4">
                <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="0" y1="25" x2="100" y2="25" stroke="#e5e7eb" strokeWidth="0.5" />
                    <line x1="0" y1="50" x2="100" y2="50" stroke="#e5e7eb" strokeWidth="0.5" />
                    <line x1="0" y1="75" x2="100" y2="75" stroke="#e5e7eb" strokeWidth="0.5" />

                    {/* Area under curve */}
                    <polygon
                        points={`0,100 ${points} 100,100`}
                        fill={trend === 'up' ? '#10b98120' : '#ef444420'}
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
            <div className="flex items-center justify-between mt-4 text-sm">
                <div>
                    <span className="text-gray-600">Starting: </span>
                    <span className="font-semibold text-gray-900">{formatCurrency(startBalance)}</span>
                </div>
                <div>
                    <span className="text-gray-600">Projected: </span>
                    <span className={`font-semibold ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(endBalance)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default CashFlowProjection;
