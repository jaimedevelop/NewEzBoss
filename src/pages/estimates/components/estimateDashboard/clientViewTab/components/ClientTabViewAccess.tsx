import React from 'react';
import { CheckSquare, Lock } from 'lucide-react';
import type { ClientViewSettings, ClientViewTabId } from '../../../../../../services/estimates/estimates.types';
import { isClientViewTabVisible } from '../../../../../../services/estimates/estimates.types';

interface ClientTabViewAccessProps {
  settings: ClientViewSettings;
  onChange: (settings: ClientViewSettings) => void;
  locked: boolean;
}

const TAB_OPTIONS: { id: ClientViewTabId; label: string; field: keyof ClientViewSettings }[] = [
  { id: 'estimate', label: 'Estimate', field: 'showEstimateTab' },
  { id: 'payments', label: 'Payments', field: 'showPaymentsTab' },
  { id: 'timeline', label: 'Timeline', field: 'showTimelineTab' },
  { id: 'messages', label: 'Messages', field: 'showMessagesTab' },
  { id: 'history', label: 'History', field: 'showHistoryTab' },
];

export const ClientTabViewAccess: React.FC<ClientTabViewAccessProps> = ({ settings, onChange, locked }) => (
  <section className="mt-8 pt-6 border-t border-gray-100">
    <div className="flex items-start gap-2 mb-4">
      {locked ? <Lock className="w-4 h-4 text-gray-400 mt-0.5" /> : <CheckSquare className="w-4 h-4 text-orange-600 mt-0.5" />}
      <div>
        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Client Tab View Access</h4>
        <p className="mt-1 text-xs leading-5 text-gray-500">
          {locked
            ? 'Tab access is locked because this estimate has already been sent.'
            : 'Choose the dashboard tabs this client can access when viewing this estimate.'}
        </p>
      </div>
    </div>
    <div className="space-y-2">
      {TAB_OPTIONS.map(({ id, label, field }) => (
        <label key={id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${locked ? 'cursor-not-allowed text-gray-400 bg-gray-50' : 'cursor-pointer text-gray-700 hover:bg-orange-50/50'}`}>
          <input
            type="checkbox"
            checked={isClientViewTabVisible(settings, id)}
            disabled={locked}
            onChange={(event) => onChange({ ...settings, [field]: event.target.checked })}
            className="h-4 w-4 rounded border-gray-300 accent-orange-600 focus:ring-orange-500 disabled:opacity-60"
          />
          <span className="font-medium">{label}</span>
        </label>
      ))}
    </div>
  </section>
);
