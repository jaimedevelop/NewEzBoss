// src/pages/estimates/components/PaymentScheduleModal.tsx

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Calendar } from 'lucide-react';
import { FormField } from '../../../mainComponents/forms/FormField';
import { InputField } from '../../../mainComponents/forms/InputField';
import { SelectField } from '../../../mainComponents/forms/SelectField';
import { PaymentSchedule, PaymentScheduleEntry, PaymentScheduleMode } from '../../../services/estimates/PaymentScheduleModal.types';

interface PaymentScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (schedule: PaymentSchedule | null) => void;
  estimateTotal: number;
  initialSchedule?: PaymentSchedule | null;
}

export const PaymentScheduleModal: React.FC<PaymentScheduleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  estimateTotal,
  initialSchedule
}) => {
  const [mode, setMode] = useState<PaymentScheduleMode>('percentage');
  const [entries, setEntries] = useState<PaymentScheduleEntry[]>([]);

  // Initialize from props
  useEffect(() => {
    if (isOpen) {
      if (initialSchedule && initialSchedule.entries.length > 0) {
        setMode(initialSchedule.mode);
        setEntries(initialSchedule.entries);
      } else {
        // Start with one empty entry
        setMode('percentage');
        setEntries([{
          id: '1',
          description: '',
          value: 0,
          dueDate: ''
        }]);
      }
    }
  }, [isOpen, initialSchedule]);

  // Calculate remaining amount
  const calculateRemaining = (): number => {
    const total = entries.reduce((sum, entry) => sum + (entry.value || 0), 0);
    if (mode === 'percentage') {
      return 100 - total;
    } else {
      return estimateTotal - total;
    }
  };

  const remaining = calculateRemaining();
  const canClose = Math.abs(remaining) < 0.01; // Allow for floating point precision

  // Add new payment entry
  const addEntry = () => {
    const newId = (Math.max(0, ...entries.map(e => parseInt(e.id) || 0)) + 1).toString();

    // Calculate suggested value based on what's remaining
    const currentTotal = entries.reduce((sum, entry) => sum + (entry.value || 0), 0);
    let suggestedValue = 0;
    if (entries.length > 0) {
      if (mode === 'percentage') {
        suggestedValue = Math.max(0, 100 - currentTotal);
      } else {
        suggestedValue = Math.max(0, estimateTotal - currentTotal);
      }
    }

    setEntries([...entries, {
      id: newId,
      description: '',
      value: suggestedValue,
      dueDate: ''
    }]);
  };

  // Remove payment entry
  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  // Update entry field
  const updateEntry = (id: string, field: keyof PaymentScheduleEntry, value: string | number) => {
    setEntries(entries.map(entry => {
      if (entry.id === id) {
        // For value field, ensure it's always a number
        if (field === 'value') {
          const numValue = typeof value === 'string' ? (value === '' ? 0 : parseFloat(value) || 0) : value;
          return { ...entry, value: numValue };
        }
        return { ...entry, [field]: value };
      }
      return entry;
    }));
  };

  // Handle save
  const handleSave = () => {
    if (!canClose) {
      return;
    }

    const schedule: PaymentSchedule = {
      mode,
      entries: entries.filter(e => e.description.trim() && e.value > 0)
    };

    onSave(schedule.entries.length > 0 ? schedule : null);
    onClose();
  };

  // Handle clear
  const handleClear = () => {
    onSave(null);
    onClose();
  };

  // Handle mode change
  const handleModeChange = (newMode: PaymentScheduleMode) => {
    setMode(newMode);
    // Reset values when changing mode
    setEntries(entries.map(entry => ({ ...entry, value: 0 })));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-orange-600 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Payment Schedule</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full transition-colors hover:bg-orange-700"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Mode Selector */}
          <div className="mb-6">
            <FormField label="Payment Type">
              <SelectField
                value={mode}
                onChange={(e) => handleModeChange(e.target.value as PaymentScheduleMode)}
                options={[
                  { value: 'percentage', label: 'Percentage (%)' },
                  { value: 'sum', label: 'Dollar Amount ($)' }
                ]}
              />
            </FormField>
          </div>

          {/* Remaining Display */}
          <div className={`mb-6 p-4 rounded-lg border-2 ${canClose
            ? 'bg-green-50 border-green-500'
            : 'bg-orange-50 border-orange-500'
            }`}>
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Remaining:</span>
              <span className={`text-2xl font-bold ${canClose ? 'text-green-600' : 'text-orange-600'
                }`}>
                {mode === 'percentage'
                  ? `${remaining.toFixed(2)}%`
                  : `$${remaining.toFixed(2)}`
                }
              </span>
            </div>
            {!canClose && (
              <p className="text-sm text-orange-700 mt-2">
                You must allocate the full {mode === 'percentage' ? '100%' : `$${estimateTotal.toFixed(2)}`} before saving.
              </p>
            )}
          </div>

          {/* Payment Entries */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium text-gray-900">Payments</h3>
              <button
                type="button"
                onClick={addEntry}
                className="inline-flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Payment
              </button>
            </div>

            {entries.map((entry, index) => (
              <div key={entry.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-gray-700">Payment {index + 1}</h4>
                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <FormField label="Description">
                      {(() => {
                        const presets = ["Deposit", "Partial Payment", "Final Payment"];
                        const currentDropdownValue = presets.includes(entry.description)
                          ? entry.description
                          : (entry.description === '' ? '' : 'other');

                        return (
                          <>
                            <SelectField
                              value={currentDropdownValue}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'other') {
                                  updateEntry(entry.id, 'description', ' '); // Use space as temporary "other" marker
                                } else {
                                  updateEntry(entry.id, 'description', val);
                                }
                              }}
                              options={[
                                { value: '', label: 'Select description...' },
                                ...presets.map(p => ({ value: p, label: p })),
                                { value: 'other', label: 'Other (Enter Manually)' }
                              ]}
                            />
                            {(currentDropdownValue === 'other' || entry.description === ' ') && (
                              <div className="mt-2">
                                <InputField
                                  value={entry.description === ' ' ? '' : entry.description}
                                  onChange={(e) => updateEntry(entry.id, 'description', e.target.value)}
                                  placeholder="Enter custom description"
                                  autoFocus
                                />
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </FormField>
                  </div>

                  <FormField label={mode === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}>
                    {(() => {
                      // Calculate suggested value for placeholder (remaining after previous entries)
                      let suggestedValue = 0;
                      if (index > 0) {
                        const totalBefore = entries.slice(0, index).reduce((sum, e) => sum + (e.value || 0), 0);
                        if (mode === 'percentage') {
                          suggestedValue = Math.max(0, 100 - totalBefore);
                        } else {
                          suggestedValue = Math.max(0, estimateTotal - totalBefore);
                        }
                      }

                      return (
                        <InputField
                          type="number"
                          value={entry.value === 0 ? '' : entry.value.toString()}
                          onChange={(e) => updateEntry(entry.id, 'value', e.target.value)}
                          min="0"
                          max={mode === 'percentage' ? '100' : undefined}
                          step="0.01"
                          placeholder={suggestedValue > 0 ? suggestedValue.toFixed(2) : "0.00"}
                        />
                      );
                    })()}
                  </FormField>
                </div>

                <div className="mt-3">
                  <FormField label="Due Date (Optional)">
                    <div className="relative">
                      <InputField
                        type="date"
                        value={entry.dueDate || ''}
                        onChange={(e) => updateEntry(entry.id, 'dueDate', e.target.value)}
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClear}
            disabled={!entries.some(e => e.description.trim() || e.value > 0)}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            title="Clears all payments"
          >
            Clear Schedule
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canClose}
              className={`px-4 py-2 bg-orange-600 text-white rounded-lg font-medium transition-colors ${canClose
                ? 'hover:bg-orange-700'
                : 'opacity-50 cursor-not-allowed'
                }`}
            >
              Save Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentScheduleModal;
