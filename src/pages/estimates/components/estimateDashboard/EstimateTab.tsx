// src/pages/estimates/components/estimateDashboard/EstimateTab.tsx

import React, { useState, useEffect } from 'react';
import { Edit, Save, X, Camera, Upload, Trash2, User, UserPlus, AlertCircle } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { updateEstimate, formatCurrency, type Estimate } from '../../../../services/estimates';
import { type Client } from '../../../../services/clients';
import { uploadEstimateImages, deleteEstimateImage } from '../../../../firebase/storage';
import { FormField } from '../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../mainComponents/forms/InputField';
import { SelectField } from '../../../../mainComponents/forms/SelectField';
import ClientSelectModal from './ClientSelectModal';
import LineItemsSection from './LineItemsSection';

interface Picture {
  id: string;
  file: File | null;
  url: string;
  description: string;
}

interface EstimateTabProps {
  estimate: Estimate;
  onUpdate: () => void;
  onImportCollection: () => void;
}

const EstimateTab: React.FC<EstimateTabProps> = ({ estimate, onUpdate, onImportCollection }) => {
  const { currentUser } = useAuthContext();
  
  // Note: currentUser is available for future use (e.g., audit logging)
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Client modal state
  const [showClientModal, setShowClientModal] = useState(false);
  
  // Form state
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    projectDescription: '',
    pictures: [] as Picture[],
    discount: 0,
    discountType: 'percentage' as 'percentage' | 'amount',
    taxRate: 0,
    depositType: 'none' as 'none' | 'percentage' | 'amount',
    depositValue: 0,
    requestSchedule: false,
    validUntil: '',
    notes: ''
  });
  
  // Populate form when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setEditForm({
        customerName: estimate.customerName || '',
        customerEmail: estimate.customerEmail || '',
        customerPhone: estimate.customerPhone || '',
        projectDescription: (estimate as any).projectDescription || '',
        pictures: ((estimate as any).pictures || []).map((pic: any, idx: number) => ({
          id: idx.toString(),
          file: null,
          url: pic.url || '',
          description: pic.description || ''
        })),
        discount: estimate.discount || 0,
        discountType: (estimate.discountType === 'fixed' ? 'amount' : estimate.discountType) || 'percentage',
        taxRate: estimate.taxRate || 0,
        depositType: (estimate as any).depositType || 'none',
        depositValue: (estimate as any).depositValue || 0,
        requestSchedule: (estimate as any).requestSchedule || false,
        validUntil: estimate.validUntil || '',
        notes: estimate.notes || ''
      });
      setHasUnsavedChanges(false);
    }
  }, [isEditing, estimate]);
  
  // Track changes
  const handleFormChange = <K extends keyof typeof editForm>(field: K, value: typeof editForm[K]) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };
  
  // Picture management
  const addPicture = () => {
    const newId = editForm.pictures.length.toString();
    handleFormChange('pictures', [...editForm.pictures, { id: newId, file: null, url: '', description: '' }]);
  };
  
  const removePicture = async (id: string) => {
    const pictureToRemove = editForm.pictures.find(p => p.id === id);
    
    if (pictureToRemove && pictureToRemove.url.startsWith('https://firebasestorage.googleapis.com')) {
      try {
        await deleteEstimateImage(pictureToRemove.url);
      } catch (error) {
        console.error('Failed to delete image from storage:', error);
      }
    }
    
    handleFormChange('pictures', editForm.pictures.filter(p => p.id !== id));
  };
  
  const updatePicture = (id: string, field: keyof Picture, value: string | File | null) => {
    const updatedPictures = editForm.pictures.map(picture => {
      if (picture.id === id) {
        const updatedPicture = { ...picture, [field]: value };
        
        if (field === 'file' && value instanceof File) {
          updatedPicture.url = URL.createObjectURL(value);
        }
        
        return updatedPicture;
      }
      return picture;
    });
    handleFormChange('pictures', updatedPictures);
  };
  
  const handleFileSelect = (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        return;
      }
      
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setError('Image file size must be less than 5MB.');
        return;
      }
      
      updatePicture(id, 'file', file);
    }
  };
  
  const openCamera = (id: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          setError('Please select a valid image file.');
          return;
        }
        
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          setError('Image file size must be less than 5MB.');
          return;
        }
        
        updatePicture(id, 'file', file);
      }
    };
    
    input.click();
  };
  
  // Client selection
  const handleSelectClient = (client: Client) => {
    handleFormChange('customerName', client.name);
    handleFormChange('customerEmail', client.email || '');
    handleFormChange('customerPhone', client.phoneMobile || client.phoneOther || '');
    setShowClientModal(false);
  };
  
  // Edit mode controls
  const handleStartEdit = () => {
    setIsEditing(true);
    setError(null);
  };
  
  const handleCancelEdit = () => {
    if (hasUnsavedChanges) {
      setShowExitWarning(true);
    } else {
      setIsEditing(false);
    }
  };
  
  const handleConfirmExit = () => {
    setIsEditing(false);
    setShowExitWarning(false);
    setHasUnsavedChanges(false);
    setError(null);
  };
  
  const handleSaveEdit = async () => {
    if (!estimate.id) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Upload new pictures
      let uploadedPictures: any[] = [];
      if (editForm.pictures.length > 0) {
        uploadedPictures = await uploadEstimateImages(editForm.pictures, estimate.id);
      }
      
      // Prepare update data
      const updateData = {
        customerName: editForm.customerName,
        customerEmail: editForm.customerEmail,
        customerPhone: editForm.customerPhone,
        projectDescription: editForm.projectDescription,
        pictures: uploadedPictures,
        discount: editForm.discount,
        discountType: editForm.discountType,
        taxRate: editForm.taxRate,
        depositType: editForm.depositType,
        depositValue: editForm.depositValue,
        requestSchedule: editForm.requestSchedule,
        validUntil: editForm.validUntil,
        notes: editForm.notes
      };
      
      const result = await updateEstimate(estimate.id, updateData);
      
      if (result.success) {
        setIsEditing(false);
        setHasUnsavedChanges(false);
        onUpdate();
      } else {
        const errorMsg = typeof result.error === 'string' ? result.error : result.error?.message || 'Failed to update estimate';
        setError(errorMsg);
      }
    } catch (err) {
      console.error('Error saving estimate:', err);
      setError('Failed to update estimate');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header with Edit Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Estimate Details</h2>
          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              Edit Estimate
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}
        </div>
        
        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}
        
        {/* Estimate Number (Read-only) */}
        <div className="mb-4">
          <FormField label="Estimate Number">
            <InputField
              value={estimate.estimateNumber || 'N/A'}
              disabled
              className="bg-gray-50"
            />
          </FormField>
        </div>
        
        {/* Customer Information */}
        <div className="border-t pt-4">
          <h3 className="text-md font-medium text-gray-900 mb-4">Customer Information</h3>
          
          {!isEditing ? (
            // Read-only view
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              {estimate.customerName ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{estimate.customerName}</h4>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {estimate.customerEmail && (
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-gray-900">{estimate.customerEmail}</p>
                      </div>
                    )}
                    {estimate.customerPhone && (
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="text-gray-900">{estimate.customerPhone}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-4">No customer information</p>
              )}
            </div>
          ) : (
            // Edit mode
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setShowClientModal(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Select Client
                </button>
              </div>
              
              <FormField label="Customer Name" required>
                <InputField
                  value={editForm.customerName}
                  onChange={(e) => handleFormChange('customerName', e.target.value)}
                  placeholder="Enter customer name"
                />
              </FormField>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Email">
                  <InputField
                    type="email"
                    value={editForm.customerEmail}
                    onChange={(e) => handleFormChange('customerEmail', e.target.value)}
                    placeholder="customer@example.com"
                  />
                </FormField>
                
                <FormField label="Phone">
                  <InputField
                    type="tel"
                    value={editForm.customerPhone}
                    onChange={(e) => handleFormChange('customerPhone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </FormField>
              </div>
            </div>
          )}
        </div>
        
        {/* Project Description */}
        <div className="border-t pt-4 mt-4">
          <FormField label="Project Description">
            {!isEditing ? (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                {(estimate as any).projectDescription || 'No description provided'}
              </div>
            ) : (
              <textarea
                value={editForm.projectDescription}
                onChange={(e) => handleFormChange('projectDescription', e.target.value)}
                placeholder="Describe the work to be performed..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            )}
          </FormField>
        </div>
        
        {/* Pictures */}
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-medium text-gray-900">Pictures</h3>
            {isEditing && (
              <button
                type="button"
                onClick={addPicture}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                + Add Picture
              </button>
            )}
          </div>
          
          {editForm.pictures.length === 0 ? (
            <div className="text-center py-6 text-gray-500 bg-gray-50 border border-gray-200 rounded-lg">
              <Camera className="w-10 h-10 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No pictures added</p>
            </div>
          ) : (
            <div className="space-y-4">
              {editForm.pictures.map((picture) => (
                <div key={picture.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <div className="space-y-2">
                      {picture.url ? (
                        <div className="relative">
                          <img
                            src={picture.url}
                            alt="Preview"
                            className="w-full h-32 object-cover rounded-md border"
                          />
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => updatePicture(picture.id, 'url', '')}
                              className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ) : isEditing ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openCamera(picture.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            <Camera className="w-4 h-4" />
                            Camera
                          </button>
                          <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                            <Upload className="w-4 h-4" />
                            Upload
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileSelect(picture.id, e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      ) : null}
                    </div>
                    
                    <div className="md:col-span-2">
                      <FormField label="Description">
                        {!isEditing ? (
                          <div className="p-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                            {picture.description || 'No description'}
                          </div>
                        ) : (
                          <textarea
                            value={picture.description}
                            onChange={(e) => updatePicture(picture.id, 'description', e.target.value)}
                            placeholder="Describe what this picture shows..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                        )}
                      </FormField>
                    </div>
                    
                    {isEditing && (
                      <div className="md:col-span-3 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removePicture(picture.id)}
                          className="flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove Picture
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Totals & Calculations */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-md font-medium text-gray-900 mb-4">Pricing</h3>
          
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Discount (%)">
                {!isEditing ? (
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                    {estimate.discount || 0}%
                  </div>
                ) : (
                  <InputField
                    type="number"
                    value={editForm.discount.toString()}
                    onChange={(e) => handleFormChange('discount', parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                )}
              </FormField>
              
              <FormField label="Tax Rate (%)">
                {!isEditing ? (
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                    {estimate.taxRate || 0}%
                  </div>
                ) : (
                  <InputField
                    type="number"
                    value={editForm.taxRate.toString()}
                    onChange={(e) => handleFormChange('taxRate', parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                )}
              </FormField>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Deposit Type">
                {!isEditing ? (
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700 capitalize">
                    {(estimate as any).depositType || 'None'}
                  </div>
                ) : (
                  <SelectField
                    value={editForm.depositType}
                    onChange={(e) => handleFormChange('depositType', e.target.value as any)}
                    options={[
                      { value: 'none', label: 'No Deposit' },
                      { value: 'percentage', label: 'Percentage' },
                      { value: 'amount', label: 'Amount' }
                    ]}
                  />
                )}
              </FormField>
              
              {(editForm.depositType !== 'none' || (estimate as any).depositType !== 'none') && (
                <FormField label={editForm.depositType === 'percentage' ? 'Deposit (%)' : 'Deposit Amount ($)'}>
                  {!isEditing ? (
                    <div className="p-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                      {(estimate as any).depositType === 'percentage' ? `${(estimate as any).depositValue}%` : formatCurrency((estimate as any).depositValue || 0)}
                    </div>
                  ) : (
                    <InputField
                      type="number"
                      value={editForm.depositValue.toString()}
                      onChange={(e) => handleFormChange('depositValue', parseFloat(e.target.value) || 0)}
                      min="0"
                      max={editForm.depositType === 'percentage' ? "100" : undefined}
                      step="0.01"
                    />
                  )}
                </FormField>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isEditing ? editForm.requestSchedule : (estimate as any).requestSchedule}
                onChange={(e) => isEditing && handleFormChange('requestSchedule', e.target.checked)}
                disabled={!isEditing}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <label className="text-sm text-gray-700">Request Payment Schedule</label>
            </div>
          </div>
        </div>
        
        {/* Valid Until & Notes */}
        <div className="border-t pt-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormField label="Valid Until">
              {!isEditing ? (
                <div className="p-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                  {estimate.validUntil ? new Date(estimate.validUntil).toLocaleDateString() : 'Not set'}
                </div>
              ) : (
                <InputField
                  type="date"
                  value={editForm.validUntil}
                  onChange={(e) => handleFormChange('validUntil', e.target.value)}
                />
              )}
            </FormField>
          </div>
          
          <FormField label="Notes">
            {!isEditing ? (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                {estimate.notes || 'No notes'}
              </div>
            ) : (
              <textarea
                value={editForm.notes}
                onChange={(e) => handleFormChange('notes', e.target.value)}
                placeholder="Additional notes for this estimate..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            )}
          </FormField>
        </div>
      </div>
      
      {/* Line Items Section */}
      <LineItemsSection
        estimate={estimate}
        onUpdate={onUpdate}
        onImportCollection={onImportCollection}
        isParentEditing={isEditing}
      />
      
      {/* Exit Warning Modal */}
      {showExitWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Unsaved Changes
                </h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                You have unsaved changes. If you exit now, your changes will be lost. Are you sure you want to continue?
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitWarning(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  No, Continue Editing
                </button>
                <button
                  onClick={handleConfirmExit}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Yes, Lose Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Client Select Modal */}
      <ClientSelectModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSelectClient={handleSelectClient}
      />
    </div>
  );
};

export default EstimateTab;
