import React from 'react';
import { TrendingUp, DollarSign, Target } from 'lucide-react';

interface RealityCheckSectionProps {
    lifestyleCosts: number;
    businessMustGenerate: number;
    currentMonthProgress: number;
    currentMonthGoal: number;
}

const RealityCheckSection: React.FC<RealityCheckSectionProps> = ({
    lifestyleCosts,
    businessMustGenerate,
    currentMonthProgress,
    currentMonthGoal
}) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const progressPercentage = (currentMonthProgress / currentMonthGoal) * 100;

    return (
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
            <h2 className="text-2xl font-bold mb-6">The Reality Check</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Lifestyle Costs */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <DollarSign size={24} />
                        </div>
                        <h3 className="text-lg font-semibold">Your Lifestyle Costs</h3>
                    </div>
                    <p className="text-4xl font-bold">{formatCurrency(lifestyleCosts)}</p>
                    <p className="text-sm text-purple-100 mt-2">Per month (from actual spending)</p>
                </div>

                {/* Business Must Generate */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <TrendingUp size={24} />
                        </div>
                        <h3 className="text-lg font-semibold">Business Must Generate</h3>
                    </div>
                    <p className="text-4xl font-bold">{formatCurrency(businessMustGenerate)}</p>
                    <p className="text-sm text-purple-100 mt-2">Includes taxes, buffer, business expenses</p>
                </div>

                {/* Current Month Progress */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Target size={24} />
                        </div>
                        <h3 className="text-lg font-semibold">Current Month</h3>
                    </div>
                    <p className="text-4xl font-bold">{formatCurrency(currentMonthProgress)}</p>
                    <p className="text-sm text-purple-100 mt-2">of {formatCurrency(currentMonthGoal)} goal</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Monthly Progress</span>
                    <span className="text-sm font-semibold">{progressPercentage.toFixed(0)}%</span>
                </div>
                <div className="relative h-4 bg-white/20 rounded-full overflow-hidden">
                    <div
                        className="absolute top-0 left-0 h-full bg-white rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                </div>
                <div className="flex items-center justify-between mt-2 text-sm">
                    <span className="text-purple-100">
                        {progressPercentage < 50 ? 'Behind pace' : progressPercentage < 75 ? 'On track' : 'Ahead of pace'}
                    </span>
                    <span className="text-purple-100">
                        {formatCurrency(currentMonthGoal - currentMonthProgress)} remaining
                    </span>
                </div>
            </div>
        </div>
    );
};

export default RealityCheckSection;
