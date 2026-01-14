// src/pages/clients/components/ClientsCreationModal.tsx

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import {
  createClient,
  updateClient,
  validateClientData,
  type Client,
} from '../../../../services/clients';
import { InputField } from '../../../../mainComponents/forms/InputField';
import { FormField } from '../../../../mainComponents/forms/FormField';

interface ClientsCreationModalProps {
  client: Client | null;
  isDuplicate?: boolean;
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

const ClientsCreationModal: React.FC<ClientsCreationModalProps> = ({
  client,
  isDuplicate = false,
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
    companyName: '',
    clientType: '',
    notes: '',
    billingAddress: '',
    billingAddress2: '',
    billingCity: '',
    billingState: '',
    billingZipCode: '',
    billingEqualToService: true,
    serviceAddress: '',
    serviceAddress2: '',
    serviceCity: '',
    serviceState: '',
    serviceZipCode: '',
  });

  // Load existing client data for editing or duplicating
  useEffect(() => {
    if (client) {
      setFormData({
        name: isDuplicate ? `${client.name || ''} (Copy)` : (client.name || ''),
        email: client.email || '',
        phoneMobile: client.phoneMobile || '',
        phoneOther: client.phoneOther || '',
        companyName: client.companyName || '',
        clientType: client.clientType || '',
        notes: client.notes || '',
        billingAddress: client.billingAddress || '',
        billingAddress2: client.billingAddress2 || '',
        billingCity: client.billingCity || '',
        billingState: client.billingState || '',
        billingZipCode: client.billingZipCode || '',
        billingEqualToService: client.billingEqualToService ?? true,
        serviceAddress: client.serviceAddress || '',
        serviceAddress2: client.serviceAddress2 || '',
        serviceCity: client.serviceCity || '',
        serviceState: client.serviceState || '',
        serviceZipCode: client.serviceZipCode || '',
      });
    }
  }, [client, isDuplicate]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      setError('You must be logged in to create a client');
      return;
    }

    // Validate
    const validation = validateClientData(formData);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let result;
      if (client?.id && !isDuplicate) {
        // Update existing client
        result = await updateClient(client.id, formData);
      } else {
        // Create new client (or duplicate)
        result = await createClient(formData, currentUser.uid);
      }

      if (result.success) {
        onSave();
      } else {
        setError(result.error || 'Failed to save client');
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
            {isDuplicate ? 'Duplicate Client' : client ? 'Edit Client' : 'Add New Client'}
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
              <FormField label="Name" htmlFor="name">
                <InputField
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="John Smith"
                />
              </FormField>

              <FormField label="Email" htmlFor="email">
                <InputField
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="john@example.com"
                />
              </FormField>

              <FormField label="Mobile Phone" htmlFor="phoneMobile">
                <InputField
                  id="phoneMobile"
                  type="tel"
                  value={formData.phoneMobile}
                  onChange={(e) => handleChange('phoneMobile', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </FormField>

              <FormField label="Other Phone" htmlFor="phoneOther">
                <InputField
                  id="phoneOther"
                  type="tel"
                  value={formData.phoneOther}
                  onChange={(e) => handleChange('phoneOther', e.target.value)}
                  placeholder="(555) 987-6543"
                />
              </FormField>

              <FormField label="Company Name" htmlFor="companyName">
                <InputField
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="ABC Corporation"
                />
              </FormField>

              <FormField label="Client Type" htmlFor="clientType">
                <InputField
                  id="clientType"
                  value={formData.clientType}
                  onChange={(e) => handleChange('clientType', e.target.value)}
                  placeholder="Residential, Commercial, etc."
                />
              </FormField>
            </div>

            <div className="mt-4">
              <FormField label="Notes" htmlFor="notes">
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Additional notes about this client..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={3}
                />
              </FormField>
            </div>
          </div>

          {/* Billing Address */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Address</h3>
            <div className="space-y-4">
              <FormField label="Address" htmlFor="billingAddress">
                <InputField
                  id="billingAddress"
                  value={formData.billingAddress}
                  onChange={(e) => handleChange('billingAddress', e.target.value)}
                  placeholder="123 Main St"
                />
              </FormField>

              <FormField label="Address 2" htmlFor="billingAddress2">
                <InputField
                  id="billingAddress2"
                  value={formData.billingAddress2}
                  onChange={(e) => handleChange('billingAddress2', e.target.value)}
                  placeholder="Apt, Suite, Unit, Building, Floor, etc."
                />
              </FormField>

              <div className="grid grid-cols-3 gap-4">
                <FormField label="City" htmlFor="billingCity">
                  <InputField
                    id="billingCity"
                    value={formData.billingCity}
                    onChange={(e) => handleChange('billingCity', e.target.value)}
                    placeholder="Tampa"
                  />
                </FormField>

                <FormField label="State" htmlFor="billingState">
                  <select
                    id="billingState"
                    value={formData.billingState}
                    onChange={(e) => handleChange('billingState', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select State</option>
                    {US_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Zip Code" htmlFor="billingZipCode">
                  <InputField
                    id="billingZipCode"
                    value={formData.billingZipCode}
                    onChange={(e) => handleChange('billingZipCode', e.target.value)}
                    placeholder="33601"
                  />
                </FormField>
              </div>
            </div>
          </div>

          {/* Service Address Toggle */}
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!formData.billingEqualToService}
                onChange={(e) => handleChange('billingEqualToService', !e.target.checked)}
                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Service address is different from billing address
              </span>
            </label>
          </div>

          {/* Service Address (conditional) */}
          {!formData.billingEqualToService && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Address</h3>
              <div className="space-y-4">
                <FormField label="Address" htmlFor="serviceAddress">
                  <InputField
                    id="serviceAddress"
                    value={formData.serviceAddress}
                    onChange={(e) => handleChange('serviceAddress', e.target.value)}
                    placeholder="456 Oak Ave"
                  />
                </FormField>

                <FormField label="Address 2" htmlFor="serviceAddress2">
                  <InputField
                    id="serviceAddress2"
                    value={formData.serviceAddress2}
                    onChange={(e) => handleChange('serviceAddress2', e.target.value)}
                    placeholder="Apt, Suite, Unit, Building, Floor, etc."
                  />
                </FormField>

                <div className="grid grid-cols-3 gap-4">
                  <FormField label="City" htmlFor="serviceCity">
                    <InputField
                      id="serviceCity"
                      value={formData.serviceCity}
                      onChange={(e) => handleChange('serviceCity', e.target.value)}
                      placeholder="Tampa"
                    />
                  </FormField>

                  <FormField label="State" htmlFor="serviceState">
                    <select
                      id="serviceState"
                      value={formData.serviceState}
                      onChange={(e) => handleChange('serviceState', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                      <option value="">Select State</option>
                      {US_STATES.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Zip Code" htmlFor="serviceZipCode">
                    <InputField
                      id="serviceZipCode"
                      value={formData.serviceZipCode}
                      onChange={(e) => handleChange('serviceZipCode', e.target.value)}
                      placeholder="33601"
                    />
                  </FormField>
                </div>
              </div>
            </div>
          )}
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
            {isSubmitting ? 'Saving...' : isDuplicate ? 'Create Duplicate' : client ? 'Update Client' : 'Create Client'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientsCreationModal;