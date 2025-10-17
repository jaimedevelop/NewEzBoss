// src/pages/labor/components/creationModal/HourlyRateTab.tsx
import React from 'react';
import { Plus, Trash2, User, Award, DollarSign } from 'lucide-react';
import { FormField } from '../../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../../mainComponents/forms/InputField';
import { SelectField } from '../../../../../mainComponents/forms/SelectField';
import { useLaborCreation } from '../../../../../contexts/LaborCreationContext';

interface HourlyRateTabProps {
  disabled?: boolean;
}

const HourlyRateTab: React.FC<HourlyRateTabProps> = ({ disabled = false }) => {
  const { 
    state, 
    updateHourlyRateEntry, 
    addHourlyRateEntry, 
    removeHourlyRateEntry
  } = useLaborCreation();
  
  const { formData } = state;

  const skillLevelOptions = [
    { value: 'apprentice', label: 'Apprentice' },
    { value: 'journeyman', label: 'Journeyman' },
    { value: 'master', label: 'Master' },
    { value: 'specialist', label: 'Specialist' }
  ];

  // Calculate statistics from hourly rates
  const hourlyRateStats = React.useMemo(() => {
    if (!formData.hourlyRates || formData.hourlyRates.length === 0) {
      return { lowest: null, highest: null, average: 0, bySkillLevel: {} };
    }

    const validRates = formData.hourlyRates.filter(r => r.name && r.hourlyRate);
    if (validRates.length === 0) {
      return { lowest: null, highest: null, average: 0, bySkillLevel: {} };
    }

    const numericRates = validRates.map(r => parseFloat(r.hourlyRate));
    const lowestIdx = numericRates.indexOf(Math.min(...numericRates));
    const highestIdx = numericRates.indexOf(Math.max(...numericRates));
    
    // Group by skill level
    const bySkillLevel = validRates.reduce((acc, rate) => {
      const level = rate.skillLevel || 'unspecified';
      if (!acc[level]) {
        acc[level] = { count: 0, total: 0, average: 0 };
      }
      acc[level].count += 1;
      acc[level].total += parseFloat(rate.hourlyRate);
      acc[level].average = acc[level].total / acc[level].count;
      return acc;
    }, {} as Record<string, { count: number; total: number; average: number }>);

    return {
      lowest: validRates[lowestIdx] ? {
        name: validRates[lowestIdx].name,
        rate: numericRates[lowestIdx],
        skillLevel: validRates[lowestIdx].skillLevel
      } : null,
      highest: validRates[highestIdx] ? {
        name: validRates[highestIdx].name,
        rate: numericRates[highestIdx],
        skillLevel: validRates[highestIdx].skillLevel
      } : null,
      average: numericRates.reduce((a, b) => a + b, 0) / numericRates.length,
      bySkillLevel
    };
  }, [formData.hourlyRates]);

  const handleRemoveEmployee = (id: string) => {
    if (disabled) return;
    removeHourlyRateEntry(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Hourly Rate Pricing</h3>
        {!disabled && (
          <button
            type="button"
            onClick={addHourlyRateEntry}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </button>
        )}
      </div>

      {/* Employee Entries */}
      <div className="space-y-3">
        {formData.hourlyRates && formData.hourlyRates.map((entry) => (
          <div key={entry.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
              <FormField label="Employee Name">
                <div className="relative">
                  <InputField
                    type="text"
                    value={entry.name}
                    onChange={(e) => !disabled && updateHourlyRateEntry(entry.id, 'name', e.target.value)}
                    placeholder="e.g., John Smith"
                    disabled={disabled}
                  />
                  <User className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </FormField>
              
              <FormField label="Skill Level">
                <div className="relative">
                  <SelectField
                    value={entry.skillLevel || ''}
                    onChange={(e) => !disabled && updateHourlyRateEntry(entry.id, 'skillLevel', e.target.value)}
                    options={skillLevelOptions}
                    disabled={disabled}
                  />
                  <Award className="absolute right-10 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </FormField>
              
              <FormField label="Hourly Rate ($/hr)">
                <div className="relative">
                  <InputField
                    type="number"
                    min="0"
                    step="0.01"
                    value={entry.hourlyRate}
                    onChange={(e) => !disabled && updateHourlyRateEntry(entry.id, 'hourlyRate', e.target.value)}
                    placeholder="0.00"
                    disabled={disabled}
                  />
                  <DollarSign className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </FormField>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemoveEmployee(entry.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}

        {(!formData.hourlyRates || formData.hourlyRates.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <div className="text-sm">No employees added yet</div>
            {!disabled && (
              <div className="text-xs mt-1">Click "Add Employee" to add hourly rate options</div>
            )}
          </div>
        )}
      </div>

      {/* Rate Comparison Summary */}
      {formData.hourlyRates && formData.hourlyRates.length > 0 && hourlyRateStats.lowest && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Rate Analysis</h4>
          
          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-600 rounded-full mr-2"></div>
              <div>
                <span className="text-gray-500">Lowest:</span>
                <div className="font-medium text-green-600">
                  ${hourlyRateStats.lowest.rate.toFixed(2)}/hr
                </div>
                <div className="text-xs text-gray-400">
                  {hourlyRateStats.lowest.name}
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-600 rounded-full mr-2"></div>
              <div>
                <span className="text-gray-500">Highest:</span>
                <div className="font-medium text-red-600">
                  ${hourlyRateStats.highest.rate.toFixed(2)}/hr
                </div>
                <div className="text-xs text-gray-400">
                  {hourlyRateStats.highest.name}
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-600 rounded-full mr-2"></div>
              <div>
                <span className="text-gray-500">Average:</span>
                <div className="font-medium text-blue-600">
                  ${hourlyRateStats.average.toFixed(2)}/hr
                </div>
                <div className="text-xs text-gray-400">
                  Across {formData.hourlyRates.filter(r => r.name && r.hourlyRate).length} employees
                </div>
              </div>
            </div>
          </div>

          {/* By Skill Level */}
          {Object.keys(hourlyRateStats.bySkillLevel).length > 0 && (
            <div className="border-t border-gray-200 pt-3">
              <h5 className="text-xs font-medium text-gray-700 mb-2">Average by Skill Level</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(hourlyRateStats.bySkillLevel).map(([level, data]) => (
                  <div key={level} className="bg-white p-2 rounded border border-gray-200">
                    <div className="text-xs text-gray-500 capitalize">{level}</div>
                    <div className="text-sm font-medium text-gray-900">
                      ${data.average.toFixed(2)}/hr
                    </div>
                    <div className="text-xs text-gray-400">
                      {data.count} employee{data.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HourlyRateTab;