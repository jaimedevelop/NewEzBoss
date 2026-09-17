// src/pages/estimates/components/PaymentScheduleModal.tsx

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Calendar } from 'lucide-react';
import { FormField } from '../../../mainComponents/forms/FormField';
import { InputField } from '../../../mainComponents/forms/InputField';
import { SelectField } from '../../../mainComponents/forms/SelectField';
import ModalPortal from '../../../mainComponents/ui/ModalPortal';
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
          let numValue = typeof value === 'string' ? (value === '' ? 0 : parseFloat(value) || 0) : value;
          
          // Enforce non-negative values and upper bounds
          numValue = Math.max(0, numValue);
          if (mode === 'percentage') {
            numValue = Math.min(100, numValue);
          } else {
            numValue = Math.min(estimateTotal, numValue);
          }

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
    <ModalPortal>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-orange-600 text-white px-5 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Payment Schedule</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full transition-colors hover:bg-orange-700"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Mode Selector */}
          <div className="mb-4 max-w-xs">
            <FormField label="Payment Type" className="[&>label]:mb-1 [&>label]:text-xs">
              <SelectField
                className="py-1.5 text-sm"
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
          <div className={`mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border px-3 py-2 text-sm ${canClose
            ? 'bg-green-50 border-green-300'
            : 'bg-orange-50 border-orange-300'
            }`}>
            <span className="font-medium text-gray-700">Remaining</span>
            <span className={`font-bold ${canClose ? 'text-green-700' : 'text-orange-700'}`}>
              {mode === 'percentage'
                ? `${remaining.toFixed(2)}%`
                : `$${remaining.toFixed(2)}`
              }
            </span>
            {!canClose && (
              <p className="text-xs text-orange-700 sm:ml-2">
                Allocate the full {mode === 'percentage' ? '100%' : `$${estimateTotal.toFixed(2)}`} to save.
              </p>
            )}
          </div>

          {/* Payment Entries */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-gray-900">Payments</h3>
              <button
                type="button"
                onClick={addEntry}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Payment
              </button>
            </div>

            {entries.map((entry, index) => (
              <div key={entry.id} className="border border-gray-200 rounded-md px-3 py-2 bg-gray-50">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-end">
                  <div className="sm:col-span-5">
                    <FormField label={`Payment ${index + 1} description`} className="[&>label]:mb-1 [&>label]:text-xs">
                      {(() => {
                        const presets = ["Deposit", "Partial Payment", "Final Payment", "Retention"];
                        const currentDropdownValue = presets.includes(entry.description)
                          ? entry.description
                          : (entry.description === '' ? '' : 'other');

                        return (
                          <>
                            <SelectField
                              className="py-1.5 text-sm"
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
                              <div className="mt-1">
                                <InputField
                                  className="py-1.5 text-sm"
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

                  <FormField label={mode === 'percentage' ? 'Percent' : 'Amount'} className="sm:col-span-3 [&>label]:mb-1 [&>label]:text-xs">
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
                          className="py-1.5 text-sm"
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
                  <FormField label="Due date" className="sm:col-span-3 [&>label]:mb-1 [&>label]:text-xs">
                    <div className="relative">
                      <InputField
                        className="py-1.5 pr-8 text-sm"
                        type="date"
                        value={entry.dueDate || ''}
                        onChange={(e) => updateEntry(entry.id, 'dueDate', e.target.value)}
                      />
                      <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </FormField>
                  <div className="flex justify-end sm:col-span-1 sm:pb-0.5">
                    {entries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        className="rounded p-1.5 text-red-600 hover:bg-red-50 hover:text-red-800"
                        title={`Remove payment ${index + 1}`}
                        aria-label={`Remove payment ${index + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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
    </ModalPortal>
  );
};

export default PaymentScheduleModal;
