import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, AlertCircle } from 'lucide-react';

interface PricingCalculatorProps {
    lifestyleRequirement: number;
    businessExpenses?: number;
    taxRate?: number;
}

const PricingCalculator: React.FC<PricingCalculatorProps> = ({
    lifestyleRequirement,
    businessExpenses = 0,
    taxRate = 0.30 // Default 30% tax rate
}) => {
    const [jobsPerMonth, setJobsPerMonth] = useState<number>(10);
    const [actualAveragePrice, setActualAveragePrice] = useState<number>(0);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    // Calculate required revenue
    const totalMonthlyNeed = lifestyleRequirement + businessExpenses;
    const revenueAfterTax = totalMonthlyNeed / (1 - taxRate);

    // Calculate per-job pricing
    const minimumPricePerJob = jobsPerMonth > 0 ? revenueAfterTax / jobsPerMonth : 0;
    const recommendedPricePerJob = minimumPricePerJob * 1.2; // 20% buffer

    // Compare to actual
    const actualMonthlyRevenue = actualAveragePrice * jobsPerMonth;
    const actualAfterTax = actualMonthlyRevenue * (1 - taxRate);
    const shortfall = totalMonthlyNeed - actualAfterTax;
    const isOnTrack = shortfall <= 0;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-green-50 rounded-lg">
                    <Calculator size={24} className="text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Business Pricing Calculator</h3>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Average Jobs Per Month
                    </label>
                    <input
                        type="number"
                        value={jobsPerMonth}
                        onChange={(e) => setJobsPerMonth(Number(e.target.value))}
                        min="1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Actual Average Job Price
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">$</span>
                        <input
                            type="number"
                            value={actualAveragePrice}
                            onChange={(e) => setActualAveragePrice(Number(e.target.value))}
                            min="0"
                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold"
                        />
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Minimum Price */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-yellow-800 mb-1">Minimum Price Per Job</p>
                    <p className="text-2xl font-bold text-yellow-900">{formatCurrency(minimumPricePerJob)}</p>
                    <p className="text-xs text-yellow-700 mt-1">To break even</p>
                </div>

                {/* Recommended Price */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-green-800 mb-1">Recommended Price Per Job</p>
                    <p className="text-2xl font-bold text-green-900">{formatCurrency(recommendedPricePerJob)}</p>
                    <p className="text-xs text-green-700 mt-1">With 20% buffer</p>
                </div>

                {/* Your Current Price */}
                <div className={`${isOnTrack ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'} border rounded-xl p-4`}>
                    <p className={`text-sm font-medium ${isOnTrack ? 'text-blue-800' : 'text-red-800'} mb-1`}>
                        Your Current Average
                    </p>
                    <p className={`text-2xl font-bold ${isOnTrack ? 'text-blue-900' : 'text-red-900'}`}>
                        {formatCurrency(actualAveragePrice)}
                    </p>
                    <p className={`text-xs ${isOnTrack ? 'text-blue-700' : 'text-red-700'} mt-1`}>
                        {isOnTrack ? 'On track!' : 'Below target'}
                    </p>
                </div>
            </div>

            {/* Analysis */}
            <div className={`${isOnTrack ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-xl p-4`}>
                <div className="flex items-start space-x-3">
                    {isOnTrack ? (
                        <TrendingUp className="text-green-600 flex-shrink-0 mt-1" size={20} />
                    ) : (
                        <AlertCircle className="text-red-600 flex-shrink-0 mt-1" size={20} />
                    )}
                    <div className="flex-1">
                        <p className={`text-sm font-semibold ${isOnTrack ? 'text-green-900' : 'text-red-900'} mb-1`}>
                            {isOnTrack ? 'Great! You\'re on track' : 'Pricing Adjustment Needed'}
                        </p>
                        <p className={`text-sm ${isOnTrack ? 'text-green-800' : 'text-red-800'}`}>
                            {isOnTrack ? (
                                `At ${jobsPerMonth} jobs per month at ${formatCurrency(actualAveragePrice)} each, you'll generate ${formatCurrency(actualAfterTax)} after taxes, exceeding your ${formatCurrency(totalMonthlyNeed)} requirement by ${formatCurrency(Math.abs(shortfall))}.`
                            ) : (
                                `At ${jobsPerMonth} jobs per month at ${formatCurrency(actualAveragePrice)} each, you'll only generate ${formatCurrency(actualAfterTax)} after taxes. You need ${formatCurrency(totalMonthlyNeed)}, leaving a shortfall of ${formatCurrency(Math.abs(shortfall))}. Consider raising prices to at least ${formatCurrency(minimumPricePerJob)} per job.`
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Breakdown */}
            <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Monthly Breakdown</h4>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Lifestyle Requirement:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(lifestyleRequirement)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Business Expenses:</span>
                        <span className="font-semibold text-gray-900">{formatCurrency(businessExpenses)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Tax Rate:</span>
                        <span className="font-semibold text-gray-900">{(taxRate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200">
                        <span className="text-gray-900 font-semibold">Required Revenue (Pre-Tax):</span>
                        <span className="font-bold text-gray-900">{formatCurrency(revenueAfterTax)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PricingCalculator;
