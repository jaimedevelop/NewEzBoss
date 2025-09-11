import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Plus, Trash2, Download, CreditCard } from 'lucide-react';
import { Estimate, LineItem } from './EstimatesTable';

interface EstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (estimate: Omit<Estimate, 'id'> | Estimate) => void;
  estimate?: Estimate | null;
  mode: 'create' | 'edit' | 'view';
  onConvertToInvoice?: (estimate: Estimate) => void;
  onDownloadPDF?: (estimate: Estimate) => void;
}

interface FormData {
  estimateNumber: string;
  client: string;
  clientEmail: string;
  clientPhone: string;
  projectName: string;
  description: string;
  status: 'Draft' | 'Pending' | 'Under Review' | 'Approved' | 'Rejected' | 'Expired';
  createdDate: string;
  validUntil: string;
  taxRate: string;
  notes: string;
}

interface FormErrors {
  [key: string]: string;
}

const EstimateModal: React.FC<EstimateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  estimate,
  mode,
  onConvertToInvoice,
  onDownloadPDF
}) => {
  const [formData, setFormData] = useState<FormData>({
    estimateNumber: '',
    client: '',
    clientEmail: '',
    clientPhone: '',
    projectName: '',
    description: '',
    status: 'Draft',
    createdDate: '',
    validUntil: '',
    taxRate: '8.5',
    notes: ''
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isReadOnly = mode === 'view';

  useEffect(() => {
    if (estimate && (mode === 'edit' || mode === 'view')) {
      setFormData({
        estimateNumber: estimate.estimateNumber,
        client: estimate.client,
        clientEmail: estimate.clientEmail,
        clientPhone: estimate.clientPhone,
        projectName: estimate.projectName,
        description: estimate.description,
        status: estimate.status,
        createdDate: estimate.createdDate,
        validUntil: estimate.validUntil,
        taxRate: (estimate.taxRate * 100).toString(),
        notes: estimate.notes || ''
      });
      setLineItems([...estimate.lineItems]);
    } else {
      // Reset form for create mode
      const today = new Date().toISOString().split('T')[0];
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      
      setFormData({
        estimateNumber: `EST-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        client: '',
        clientEmail: '',
        clientPhone: '',
        projectName: '',
        description: '',
        status: 'Draft',
        createdDate: today,
        validUntil: validUntil.toISOString().split('T')[0],
        taxRate: '8.5',
        notes: ''
      });
      setLineItems([{
        id: 1,
        description: '',
        quantity: 1,
        unitPrice: 0,
        total: 0
      }]);
    }
    setErrors({});
  }, [estimate, mode, isOpen]);

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const taxRate = Number(formData.taxRate) / 100;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    return { subtotal, taxRate, taxAmount, total };
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required field validation
    if (!formData.client.trim()) newErrors.client = 'Client name is required';
    if (!formData.clientEmail.trim()) {
      newErrors.clientEmail = 'Client email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.clientEmail)) {
      newErrors.clientEmail = 'Please enter a valid email address';
    }
    if (!formData.clientPhone.trim()) newErrors.clientPhone = 'Client phone is required';
    if (!formData.projectName.trim()) newErrors.projectName = 'Project name is required';
    if (!formData.validUntil) newErrors.validUntil = 'Valid until date is required';

    // Tax rate validation
    if (!formData.taxRate.trim()) {
      newErrors.taxRate = 'Tax rate is required';
    } else if (isNaN(Number(formData.taxRate)) || Number(formData.taxRate) < 0) {
      newErrors.taxRate = 'Please enter a valid tax rate';
    }

    // Line items validation
    if (lineItems.length === 0) {
      newErrors.lineItems = 'At least one line item is required';
    } else {
      const hasValidItems = lineItems.some(item => 
        item.description.trim() && item.quantity > 0 && item.unitPrice > 0
      );
      if (!hasValidItems) {
        newErrors.lineItems = 'At least one complete line item is required';
      }
    }

    // Date validation
    if (formData.createdDate && formData.validUntil) {
      const createdDate = new Date(formData.createdDate);
      const validUntil = new Date(formData.validUntil);
      if (validUntil <= createdDate) {
        newErrors.validUntil = 'Valid until date must be after created date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { subtotal, taxRate, taxAmount, total } = calculateTotals();
      
      const estimateData = {
        ...formData,
        taxRate,
        subtotal,
        taxAmount,
        total,
        lineItems: lineItems.filter(item => 
          item.description.trim() && item.quantity > 0 && item.unitPrice > 0
        ),
        ...(mode === 'edit' && estimate ? { id: estimate.id } : {})
      };

      await onSave(estimateData);
      onClose();
    } catch (error) {
      console.error('Error saving estimate:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate total for this line item
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    setLineItems(updatedItems);
    
    // Clear line items error
    if (errors.lineItems) {
      setErrors(prev => ({ ...prev, lineItems: '' }));
    }
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: Math.max(...lineItems.map(item => item.id), 0) + 1,
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900">
              {mode === 'create' ? 'Create New Estimate' : 
               mode === 'edit' ? 'Edit Estimate' : 'View Estimate'}
            </h2>
            <div className="flex items-center space-x-3">
              {mode === 'view' && estimate && (
                <>
                  {onDownloadPDF && (
                    <button
                      onClick={() => onDownloadPDF(estimate)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download PDF</span>
                    </button>
                  )}
                  {estimate.status === 'Approved' && onConvertToInvoice && (
                    <button
                      onClick={() => onConvertToInvoice(estimate)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Convert to Invoice</span>
                    </button>
                  )}
                </>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimate Number *
                </label>
                <input
                  type="text"
                  value={formData.estimateNumber}
                  onChange={(e) => handleInputChange('estimateNumber', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                    isReadOnly ? 'bg-gray-50' : 'border-gray-300'
                  }`}
                  placeholder="EST-2025-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as any)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                    isReadOnly ? 'bg-gray-50' : 'border-gray-300'
                  }`}
                >
                  <option value="Draft">Draft</option>
                  <option value="Pending">Pending</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={formData.client}
                  onChange={(e) => handleInputChange('client', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                    errors.client ? 'border-red-300' : 'border-gray-300'
                  } ${isReadOnly ? 'bg-gray-50' : ''}`}
                  placeholder="Enter client name"
                />
                {errors.client && (
                  <div className="flex items-center mt-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.client}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Email *
                </label>
                <input
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                    errors.clientEmail ? 'border-red-300' : 'border-gray-300'
                  } ${isReadOnly ? 'bg-gray-50' : ''}`}
                  placeholder="client@example.com"
                />
                {errors.clientEmail && (
                  <div className="flex items-center mt-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.clientEmail}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Phone *
                </label>
                <input
                  type="tel"
                  value={formData.clientPhone}
                  onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                    errors.clientPhone ? 'border-red-300' : 'border-gray-300'
                  } ${isReadOnly ? 'bg-gray-50' : ''}`}
                  placeholder="+1 (555) 123-4567"
                />
                {errors.clientPhone && (
                  <div className="flex items-center mt-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.clientPhone}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => handleInputChange('projectName', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                    errors.projectName ? 'border-red-300' : 'border-gray-300'
                  } ${isReadOnly ? 'bg-gray-50' : ''}`}
                  placeholder="Enter project name"
                />
                {errors.projectName && (
                  <div className="flex items-center mt-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.projectName}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Created Date
                </label>
                <input
                  type="date"
                  value={formData.createdDate}
                  onChange={(e) => handleInputChange('createdDate', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                    isReadOnly ? 'bg-gray-50' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid Until *
                </label>
                <input
                  type="date"
                  value={formData.validUntil}
                  onChange={(e) => handleInputChange('validUntil', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                    errors.validUntil ? 'border-red-300' : 'border-gray-300'
                  } ${isReadOnly ? 'bg-gray-50' : ''}`}
                />
                {errors.validUntil && (
                  <div className="flex items-center mt-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors.validUntil}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  disabled={isReadOnly}
                  rows={3}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                    isReadOnly ? 'bg-gray-50' : ''
                  }`}
                  placeholder="Describe the project scope and requirements"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Item</span>
                  </button>
                )}
              </div>

              {errors.lineItems && (
                <div className="flex items-center mb-4 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.lineItems}
                </div>
              )}

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      {!isReadOnly && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {lineItems.map((item, index) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                            disabled={isReadOnly}
                            className={`w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                              isReadOnly ? 'bg-gray-50' : ''
                            }`}
                            placeholder="Item description"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(index, 'quantity', Number(e.target.value))}
                            disabled={isReadOnly}
                            className={`w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                              isReadOnly ? 'bg-gray-50' : ''
                            }`}
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleLineItemChange(index, 'unitPrice', Number(e.target.value))}
                            disabled={isReadOnly}
                            className={`w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                              isReadOnly ? 'bg-gray-50' : ''
                            }`}
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            ${item.total.toFixed(2)}
                          </div>
                        </td>
                        {!isReadOnly && (
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => removeLineItem(index)}
                              disabled={lineItems.length === 1}
                              className="text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="mb-8">
              <div className="flex justify-end">
                <div className="w-80 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Subtotal:</span>
                    <span className="text-sm font-medium text-gray-900">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Tax Rate (%):</span>
                      {!isReadOnly && (
                        <input
                          type="number"
                          value={formData.taxRate}
                          onChange={(e) => handleInputChange('taxRate', e.target.value)}
                          className={`w-20 px-2 py-1 border rounded focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm ${
                            errors.taxRate ? 'border-red-300' : 'border-gray-300'
                          }`}
                          min="0"
                          step="0.1"
                        />
                      )}
                      {isReadOnly && (
                        <span className="text-sm font-medium text-gray-900">{formData.taxRate}%</span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900">${taxAmount.toFixed(2)}</span>
                  </div>
                  {errors.taxRate && (
                    <div className="flex items-center text-sm text-red-600">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {errors.taxRate}
                    </div>
                  )}
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total:</span>
                      <span className="text-lg font-bold text-gray-900">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                disabled={isReadOnly}
                rows={3}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                  isReadOnly ? 'bg-gray-50' : ''
                }`}
                placeholder="Additional notes or terms and conditions"
              />
            </div>

            {/* Form Actions */}
            {!isReadOnly && (
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Estimate' : 'Update Estimate'}</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default EstimateModal;