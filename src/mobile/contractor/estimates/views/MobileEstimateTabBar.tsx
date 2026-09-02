import React from 'react';
import { FileText, CreditCard, Calendar, History } from 'lucide-react';

export type ContractorEstimateTab = 'estimate' | 'payments' | 'timeline' | 'history';

export const CONTRACTOR_ESTIMATE_TABS: { id: ContractorEstimateTab; label: string; icon: React.ReactNode }[] = [
  { id: 'estimate', label: 'Estimate', icon: <FileText className="w-5 h-5" /> },
  { id: 'payments', label: 'Payments', icon: <CreditCard className="w-5 h-5" /> },
  { id: 'timeline', label: 'Timeline', icon: <Calendar className="w-5 h-5" /> },
  { id: 'history', label: 'History', icon: <History className="w-5 h-5" /> },
];

interface MobileEstimateTabBarProps {
  activeTab: ContractorEstimateTab;
  onChange: (tab: ContractorEstimateTab) => void;
}

const MobileEstimateTabBar: React.FC<MobileEstimateTabBarProps> = ({ activeTab, onChange }) => (
  <div className="sticky top-14 z-20 bg-white border-b border-gray-200 overflow-x-auto">
    <div className="flex min-w-max">
      {CONTRACTOR_ESTIMATE_TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex flex-col items-center justify-center gap-1 flex-1 min-w-[80px] px-3 py-2.5 text-[11px] font-medium border-b-2 transition-colors ${
            activeTab === tab.id
              ? 'border-orange-600 text-orange-600'
              : 'border-transparent text-gray-400 active:text-gray-600'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  </div>
);

export default MobileEstimateTabBar;
