import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface FinancesAlertBannerProps {
    message: string;
    severity: 'warning' | 'critical';
    onDismiss?: () => void;
}

const FinancesAlertBanner: React.FC<FinancesAlertBannerProps> = ({ message, severity, onDismiss }) => {
    const config = severity === 'critical'
        ? {
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            textColor: 'text-red-800',
            iconColor: 'text-red-600'
        }
        : {
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-200',
            textColor: 'text-yellow-800',
            iconColor: 'text-yellow-600'
        };

    return (
        <div className={`${config.bgColor} border ${config.borderColor} rounded-2xl p-4 shadow-sm`}>
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <AlertTriangle className={`h-6 w-6 ${config.iconColor}`} />
                </div>
                <div className="ml-3 flex-1">
                    <p className={`text-sm font-medium ${config.textColor}`}>
                        {message}
                    </p>
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className={`flex-shrink-0 ml-3 ${config.textColor} hover:opacity-70 transition-opacity`}
                    >
                        <X size={20} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default FinancesAlertBanner;
