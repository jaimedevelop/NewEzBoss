// src/pages/clients/components/ClientsCreationModal.tsx

import React, { useState, useEffect } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import {
  createClient,
  updateClient,
  validateClientData,
  formatPhoneNumber,
  type Client,
} from '../../../../services/clients';
import { InputField } from '../../../../mainComponents/forms/InputField';
import { Dropdown } from '../../../../mainComponents/forms/Dropdown';
import { FormField } from '../../../../mainComponents/forms/FormField';
import ModalPortal from '../../../../mainComponents/ui/ModalPortal';
import { localPhoneDigits } from '../../../../utils/phoneNumber';

interface ClientsCreationModalProps {
  client: Client | null;
  isDuplicate?: boolean;
  readOnly?: boolean;
  /** When false, service-address fields are returned to the caller but not persisted on the client. */
  persistServiceAddress?: boolean;
  snapshotOnly?: boolean;
  onClose: () => void;
  /** Returns an estimate editor to its client picker without closing the workflow. */
  onChangeClient?: () => void;
  onSave: (client?: Client) => void | Promise<void>;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// Normalize country codes before enforcing the ten local digits. Do not use
// maxLength: the browser would truncate formatted pastes before normalization.
const formatPhoneInput = (value: string) =>
  formatPhoneNumber(localPhoneDigits(value).slice(0, 10));

const ClientsCreationModal: React.FC<ClientsCreationModalProps> = ({
  client,
  isDuplicate = false,
  readOnly = false,
  persistServiceAddress = true,
  snapshotOnly = false,
  onClose,
  onChangeClient,
  onSave,
}) => {
  const { currentUser } = useAuthContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    billTo: 'person' as 'person' | 'company',
    contactName: '',
    invoiceEmail: '',
    additionalContacts: [] as NonNullable<Client['additionalContacts']>,
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
        billTo: client.billTo || 'person',
        contactName: client.contactName || '',
        invoiceEmail: client.invoiceEmail || '',
        additionalContacts: (client.additionalContacts || []).map(contact => ({ ...contact, phone: formatPhoneNumber(contact.phone) })),
        name: isDuplicate ? `${client.name || ''} (Copy)` : (client.name || ''),
        email: client.email || '',
        phoneMobile: formatPhoneNumber(client.phoneMobile || ''),
        phoneOther: formatPhoneNumber(client.phoneOther || ''),
        companyName: isDuplicate && client.billTo === 'company' ? `${client.companyName || ''} (Copy)` : client.companyName || '',
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
    setFormData(prev => ({
      ...prev,
      ...(field === 'billTo' && value === 'company' && prev.billTo === 'person'
        ? { contactName: prev.contactName || prev.name } : {}),
      ...(field === 'billTo' && value === 'person' && prev.billTo === 'company'
        ? { name: prev.contactName || prev.name } : {}),
      [field]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      setError('You must be logged in to create a client');
      return;
    }

    const clientForm = {
      ...formData,
      name: formData.billTo === 'company' ? formData.companyName.trim() : formData.name,
      additionalContacts: formData.additionalContacts.filter(contact => contact.name.trim() || contact.phone.trim() || contact.email.trim()),
    };
    // Validate
    const validation = validateClientData(clientForm);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let result;
      if (snapshotOnly) {
        await onSave({ ...client, ...clientForm } as Client);
        return;
      }
      if (client?.id && !isDuplicate) {
        // An estimate can have a different service address from the client's
        // default address. In that context, leave those fields on the estimate.
        const clientData = persistServiceAddress
          ? clientForm
          : {
              billTo: clientForm.billTo,
              contactName: clientForm.contactName,
              invoiceEmail: clientForm.invoiceEmail,
              additionalContacts: clientForm.additionalContacts,
              name: clientForm.name,
              email: formData.email,
              phoneMobile: formData.phoneMobile,
              phoneOther: formData.phoneOther,
              companyName: formData.companyName,
              clientType: formData.clientType,
              notes: formData.notes,
              billingAddress: formData.billingAddress,
              billingAddress2: formData.billingAddress2,
              billingCity: formData.billingCity,
              billingState: formData.billingState,
              billingZipCode: formData.billingZipCode,
            };
        result = await updateClient(client.id, clientData);
      } else {
        // Create new client (or duplicate)
        result = await createClient(clientForm, currentUser.uid);
      }

      if (result.success) {
        // Pass back the updated/created client data
        const savedClient = {
          ...client,
          ...clientForm,
          id: result.data || client?.id
        } as Client;
        // Estimate callers may need a second save to attach the client to the
        // estimate. Keep the form in its loading state until that completes.
        await onSave(savedClient);
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
    <ModalPortal>
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
          <fieldset disabled={readOnly || isSubmitting}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="mb-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
              <div className="flex items-center gap-2 shrink-0" role="group" aria-label="Bill to">
                <span className="text-sm font-medium text-gray-700">Bill to</span>
                <Dropdown
                  value={formData.billTo}
                  onChange={value => {
                    if (value === 'person' || value === 'company') handleChange('billTo', value);
                  }}
                  options={[{ value: 'person', label: 'Person' }, { value: 'company', label: 'Company' }]}
                  disabled={readOnly || isSubmitting}
                  className="w-36"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {formData.billTo === 'company' && <FormField label="Company Name" htmlFor="billingCompanyName">
                <InputField id="billingCompanyName" value={formData.companyName}
                  onChange={e => handleChange('companyName', e.target.value)} placeholder="ABC Corporation" />
              </FormField>}
              <FormField label={formData.billTo === 'company' ? 'Contact Name' : 'Name'} htmlFor="name">
                <InputField
                  id="name"
                  value={formData.billTo === 'company' ? formData.contactName : formData.name}
                  onChange={(e) => handleChange(formData.billTo === 'company' ? 'contactName' : 'name', e.target.value)}
                  placeholder="John Smith"
                />
              </FormField>

              <FormField label={formData.billTo === 'company' ? 'Contact Email' : 'Email'} htmlFor="email" optional>
                <InputField
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="john@example.com"
                />
              </FormField>

              <FormField label={formData.billTo === 'company' ? 'Contact Number' : 'Mobile Phone'} htmlFor="phoneMobile">
                <InputField
                  id="phoneMobile"
                  type="tel"
                  value={formData.phoneMobile}
                  onChange={(e) => handleChange('phoneMobile', formatPhoneInput(e.target.value))}
                  placeholder="(555)-123-4567"
                />
              </FormField>

              {formData.billTo === 'person' && <FormField label="Other Phone" htmlFor="phoneOther">
                <InputField
                  id="phoneOther"
                  type="tel"
                  value={formData.phoneOther}
                  onChange={(e) => handleChange('phoneOther', formatPhoneInput(e.target.value))}
                  placeholder="(555)-987-6543"
                />
              </FormField>}
              {formData.billTo === 'person' && <FormField label="Company Name" htmlFor="companyName">
                <InputField
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="ABC Corporation"
                />
              </FormField>}
              {formData.billTo === 'company' && <FormField label="Invoice Email" htmlFor="invoiceEmail" optional>
                <InputField id="invoiceEmail" type="email" value={formData.invoiceEmail}
                  onChange={e => handleChange('invoiceEmail', e.target.value)} placeholder="accounts@example.com" />
                <p className="text-xs text-gray-500 mt-1">Leave blank to use the contact email.</p>
              </FormField>}
              <FormField label="Client Type" htmlFor="clientType">
                <select
                  id="clientType"
                  value={formData.clientType.trim().toLowerCase()}
                  onChange={(e) => handleChange('clientType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="" disabled>Select Client Type</option>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                </select>
              </FormField>
            </div>

          </div>

          {formData.billTo === 'company' && <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Extra Contacts</h3>
              <button type="button" className="text-orange-600 font-medium" onClick={() => setFormData(prev => ({ ...prev,
                additionalContacts: [...prev.additionalContacts, { name: '', phone: '', email: '' }],
              }))}>+ Add Contact</button>
            </div>
            {formData.additionalContacts.map((contact, index) => <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Contact {index + 2}</span>
                <div className="flex gap-3">
                  <button type="button" className="text-orange-600 text-sm" onClick={() => setFormData(prev => ({ ...prev,
                    contactName: contact.name, phoneMobile: contact.phone, email: contact.email,
                    additionalContacts: prev.additionalContacts.map((item, i) => i === index ? { name: prev.contactName, phone: prev.phoneMobile, email: prev.email } : item),
                  }))}>Use as Main Contact</button>
                  <button type="button" className="text-red-600 text-sm" onClick={() => setFormData(prev => ({ ...prev,
                    additionalContacts: prev.additionalContacts.filter((_, i) => i !== index),
                  }))}>Remove</button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['name', 'phone', 'email'] as const).map(field => <FormField key={field}
                  label={field === 'name' ? 'Contact Name' : field === 'phone' ? 'Contact Number' : 'Contact Email'} htmlFor={`contact-${index}-${field}`}>
                  <InputField id={`contact-${index}-${field}`} type={field === 'phone' ? 'tel' : field === 'email' ? 'email' : 'text'}
                    value={contact[field]} onChange={e => {
                      const value = field === 'phone' ? formatPhoneInput(e.target.value) : e.target.value;
                      setFormData(prev => ({ ...prev, additionalContacts: prev.additionalContacts.map((item, i) => i === index ? { ...item, [field]: value } : item) }));
                      setError('');
                    }} />
                </FormField>)}
              </div>
            </div>)}
          </div>}

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

          <div className="mb-6">
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
          </fieldset>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          {!readOnly && onChangeClient ? (
            <button
              type="button"
              onClick={onChangeClient}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-2 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Change Client
            </button>
          ) : <span />}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {!readOnly && <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : isDuplicate ? 'Create Duplicate' : client ? 'Update Client' : 'Create Client'}
              </button>}
          </div>
        </div>
      </div>
      </div>
    </ModalPortal>
  );
};

export default ClientsCreationModal;
