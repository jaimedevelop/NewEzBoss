// src/pages/employees/components/EmployeesCreationModal.tsx

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuthContext } from '../../../contexts/AuthContext';
import {
  createEmployee,
  updateEmployee,
  validateEmployeeData,
  type Employee,
} from '../../../services/employees';
import { InputField } from '../../../mainComponents/forms/InputField';
import { FormField } from '../../../mainComponents/forms/FormField';

interface EmployeesCreationModalProps {
  employee: Employee | null;
  onClose: () => void;
  onSave: () => void;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const EmployeesCreationModal: React.FC<EmployeesCreationModalProps> = ({
  employee,
  onClose,
  onSave,
}) => {
  const { currentUser } = useAuthContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneMobile: '',
    phoneOther: '',
    employeeRole: '',
    hireDate: '',
    hourlyRate: '',
    isActive: true,
    notes: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    address: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
  });

  // Load existing employee data for editing
  useEffect(() => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        phoneMobile: employee.phoneMobile || '',
        phoneOther: employee.phoneOther || '',
        employeeRole: employee.employeeRole || '',
        hireDate: employee.hireDate || '',
        hourlyRate: employee.hourlyRate?.toString() || '',
        isActive: employee.isActive ?? true,
        notes: employee.notes || '',
        emergencyContactName: employee.emergencyContactName || '',
        emergencyContactPhone: employee.emergencyContactPhone || '',
        address: employee.address || '',
        address2: employee.address2 || '',
        city: employee.city || '',
        state: employee.state || '',
        zipCode: employee.zipCode || '',
      });
    }
  }, [employee]);

  const handleChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      setError('You must be logged in to create an employee');
      return;
    }

    // Prepare data for validation
    const dataToValidate = {
      ...formData,
      hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
    };

    // Validate
    const validation = validateEmployeeData(dataToValidate);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let result;
      if (employee?.id) {
        // Update existing employee
        result = await updateEmployee(employee.id, {
          ...dataToValidate,
          hourlyRate: dataToValidate.hourlyRate,
        });
      } else {
        // Create new employee
        result = await createEmployee(
          {
            ...dataToValidate,
            hourlyRate: dataToValidate.hourlyRate,
          } as any,
          currentUser.uid
        );
      }

      if (result.success) {
        onSave();
      } else {
        setError(result.error || 'Failed to save employee');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {employee ? 'Edit Employee' : 'Add New Employee'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name *">
                <InputField
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="John Smith"
                  required
                />
              </FormField>

              <FormField label="Email *">
                <InputField
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="john@example.com"
                  required
                />
              </FormField>

              <FormField label="Mobile Phone *">
                <InputField
                  id="phoneMobile"
                  type="tel"
                  value={formData.phoneMobile}
                  onChange={(e) => handleChange('phoneMobile', e.target.value)}
                  placeholder="(555) 123-4567"
                  required
                />
              </FormField>

              <FormField label="Other Phone">
                <InputField
                  id="phoneOther"
                  type="tel"
                  value={formData.phoneOther}
                  onChange={(e) => handleChange('phoneOther', e.target.value)}
                  placeholder="(555) 987-6543"
                />
              </FormField>

              <FormField label="Employee Role *">
                <InputField
                  id="employeeRole"
                  value={formData.employeeRole}
                  onChange={(e) => handleChange('employeeRole', e.target.value)}
                  placeholder="Foreman, Laborer, etc."
                  required
                />
              </FormField>

              <FormField label="Hire Date *">
                <InputField
                  id="hireDate"
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => handleChange('hireDate', e.target.value)}
                  required
                />
              </FormField>

              <FormField label="Hourly Rate">
                <InputField
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourlyRate}
                  onChange={(e) => handleChange('hourlyRate', e.target.value)}
                  placeholder="25.00"
                />
              </FormField>

              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => handleChange('isActive', e.target.checked)}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Active Employee
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-4">
              <FormField label="Notes">
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Additional notes about this employee..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={3}
                />
              </FormField>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Contact Name">
                <InputField
                  id="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                  placeholder="Jane Smith"
                />
              </FormField>

              <FormField label="Contact Phone">
                <InputField
                  id="emergencyContactPhone"
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </FormField>
            </div>
          </div>

          {/* Address */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Home Address</h3>
            <div className="space-y-4">
              <FormField label="Address *">
                <InputField
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="123 Main St"
                  required
                />
              </FormField>

              <FormField label="Address 2">
                <InputField
                  id="address2"
                  value={formData.address2}
                  onChange={(e) => handleChange('address2', e.target.value)}
                  placeholder="Apt, Suite, Unit, Building, Floor, etc."
                />
              </FormField>

              <div className="grid grid-cols-3 gap-4">
                <FormField label="City *">
                  <InputField
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    placeholder="Tampa"
                    required
                  />
                </FormField>

                <FormField label="State *">
                  <select
                    id="state"
                    value={formData.state}
                    onChange={(e) => handleChange('state', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select State</option>
                    {US_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Zip Code *">
                  <InputField
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) => handleChange('zipCode', e.target.value)}
                    placeholder="33601"
                    required
                  />
                </FormField>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : employee ? 'Update Employee' : 'Create Employee'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeesCreationModal;
