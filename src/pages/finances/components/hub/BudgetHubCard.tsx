import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, PieChart } from 'lucide-react';

interface BudgetHubCardProps {
    income: number;
    lifestyleRequirement: number;
    currentMonthProgress: number;
    currentMonthGoal: number;
}

const BudgetHubCard: React.FC<BudgetHubCardProps> = ({
    income,
    lifestyleRequirement,
    currentMonthProgress,
    currentMonthGoal
}) => {
    const navigate = useNavigate();

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const progressPercentage = (currentMonthProgress / currentMonthGoal) * 100;
    const isOnTrack = progressPercentage >= 50; // Simplified logic

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                        <PieChart size={24} className="text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Budget & Pricing</h3>
                </div>
            </div>

            {/* Income vs Lifestyle */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Income</span>
                    <span className="text-sm font-semibold text-green-600">{formatCurrency(income)}</span>
                </div>
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-600">Lifestyle Requirement</span>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(lifestyleRequirement)}</span>
                </div>

                {/* Visual Bar */}
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`absolute top-0 left-0 h-full rounded-full transition-all ${income >= lifestyleRequirement ? 'bg-green-500' : 'bg-yellow-500'
                            }`}
                        style={{ width: `${Math.min((income / lifestyleRequirement) * 100, 100)}%` }}
                    />
                </div>
            </div>

            {/* Current Month Status */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Current Month Progress</span>
                    <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(currentMonthProgress)} / {formatCurrency(currentMonthGoal)}
                    </span>
                </div>
                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={`absolute top-0 left-0 h-full rounded-full transition-all ${isOnTrack ? 'bg-blue-500' : 'bg-red-500'
                            }`}
                        style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                </div>
                <p className="text-xs text-gray-500 mt-1">{progressPercentage.toFixed(0)}% of monthly goal</p>
            </div>

            {/* View All Link */}
            <button
                onClick={() => navigate('/finances/budget')}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-purple-50 hover:bg-purple-100 text-purple-600 font-semibold rounded-xl transition-colors"
            >
                <span>Manage Budget</span>
                <ArrowRight size={18} />
            </button>
        </div>
    );
};

export default BudgetHubCard;
