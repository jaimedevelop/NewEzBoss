import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator, Save, FileText, Camera, Upload, X, Download, CreditCard, Edit as EditIcon } from 'lucide-react';
import { FormField } from '../../../mainComponents/forms/FormField';
import { InputField } from '../../../mainComponents/forms/InputField';
import { SelectField } from '../../../mainComponents/forms/SelectField';
import { LoadingButton } from '../../../mainComponents/ui/LoadingButton';
import { Alert } from '../../../mainComponents/ui/Alert';
import { 
  createEstimate, 
  generateEstimateNumber as generateEstimateNumberFromDB, 
  getEstimateById,
  updateEstimate 
} from '../../../services/estimates';
import { getProjects } from '../../../firebase/database';
import { uploadEstimateImages, deleteEstimateImage } from '../../../firebase/storage';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Picture {
  id: string;
  file?: File | null;
  url: string;
  description: string;
}

interface Project {
  id: string;
  name: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
}

interface EstimateFormData {
  estimateNumber: string;
  projectId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectDescription: string;
  lineItems: LineItem[];
  pictures: Picture[];
  subtotal: number;
  discount: number;
  tax: number;
  depositType: 'none' | 'percentage' | 'amount';
  depositValue: number;
  requestSchedule: boolean;
  total: number;
  validUntil: string;
  notes: string;
}

interface EstimateFormProps {
  mode?: 'create' | 'edit' | 'view';
  estimateId?: string;
  onSave?: () => void;
  onCancel?: () => void;
  onConvertToInvoice?: (estimateData: any) => void;
  onDownloadPDF?: (estimateData: any) => void;
}

export const EstimateForm: React.FC<EstimateFormProps> = ({
  mode = 'create',
  estimateId,
  onSave,
  onCancel,
  onConvertToInvoice,
  onDownloadPDF
}) => {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const alertRef = React.useRef<HTMLDivElement>(null);
  const isReadOnly = mode === 'view';
  const isEditing = mode === 'edit';
  const isCreating = mode === 'create';
  
  const [formData, setFormData] = useState<EstimateFormData>({
    estimateNumber: '',
    projectId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    projectDescription: '',
    lineItems: [{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }],
    pictures: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    depositType: 'none',
    depositValue: 0,
    requestSchedule: false,
    total: 0,
    validUntil: '',
    notes: ''
  });

  // Load data on component mount
  useEffect(() => {
    if (isCreating) {
      generateEstimateNumber();
      setDefaultValidUntil();
    } else if (estimateId) {
      loadEstimateData();
    }
    loadProjects();
  }, [mode, estimateId]);

  // Scroll to alert when it appears
  useEffect(() => {
    if (alert && alertRef.current) {
      alertRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      alertRef.current.focus();
    }
  }, [alert]);

  const loadEstimateData = async () => {
    if (!estimateId) return;
    
    setLoading(true);
    try {
      const estimate = await getEstimateById(estimateId);
      if (estimate) {
        setFormData({
          estimateNumber: estimate.estimateNumber || '',
          projectId: estimate.projectId || '',
          customerName: estimate.customerName || '',
          customerEmail: estimate.customerEmail || '',
          customerPhone: estimate.customerPhone || '',
          projectDescription: estimate.projectDescription || '',
          lineItems: estimate.lineItems || [{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }],
          pictures: estimate.pictures || [],
          subtotal: estimate.subtotal || 0,
          discount: estimate.discount || 0,
          tax: estimate.tax || 0,
          depositType: estimate.depositType || 'none',
          depositValue: estimate.depositValue || 0,
          requestSchedule: estimate.requestSchedule || false,
          total: estimate.total || 0,
          validUntil: estimate.validUntil || '',
          notes: estimate.notes || ''
        });
      } else {
        setAlert({ type: 'error', message: 'Estimate not found.' });
      }
    } catch (error) {
      console.error('Error loading estimate:', error);
      setAlert({ type: 'error', message: 'Failed to load estimate data.' });
    } finally {
      setLoading(false);
    }
  };

  const generateEstimateNumber = async () => {
    try {
      const currentYear = new Date().getFullYear();
      const estimateNumber = await generateEstimateNumberFromDB(currentYear);
      setFormData(prev => ({
        ...prev,
        estimateNumber
      }));
    } catch (error) {
      console.error('Error generating estimate number:', error);
      setAlert({ type: 'error', message: 'Failed to generate estimate number. Please try again.' });
    }
  };

  const loadProjects = async () => {
    try {
      const result = await getProjects();
      if (result.success) {
        setProjects(result.data || []);
      } else {
        console.error('Error loading projects:', result.error);
        setAlert({ type: 'error', message: 'Failed to load projects. Please refresh the page.' });
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      setAlert({ type: 'error', message: 'Failed to load projects. Please refresh the page.' });
    }
  };

  const setDefaultValidUntil = () => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    setFormData(prev => ({
      ...prev,
      validUntil: thirtyDaysFromNow.toISOString().split('T')[0]
    }));
  };

  const [showCreateProjectOption, setShowCreateProjectOption] = useState(false);

  const handleProjectSelection = (projectId: string) => {
    if (isReadOnly) return;
    
    const selectedProject = projects.find(p => p.id === projectId);
    if (selectedProject) {
      setFormData(prev => ({
        ...prev,
        projectId,
        customerName: selectedProject.customer_name,
        customerEmail: selectedProject.customer_email,
        customerPhone: selectedProject.customer_phone
      }));
      setShowCreateProjectOption(false);
    } else {
      setFormData(prev => ({
        ...prev,
        projectId: '',
        customerName: '',
        customerEmail: '',
        customerPhone: ''
      }));
      setShowCreateProjectOption(true);
    }
  };

  const addPicture = () => {
    if (isReadOnly) return;
    
    const newId = (formData.pictures.length + 1).toString();
    setFormData(prev => ({
      ...prev,
      pictures: [...prev.pictures, { id: newId, file: null, url: '', description: '' }]
    }));
  };

  const removePicture = async (id: string) => {
    if (isReadOnly) return;
    
    const pictureToRemove = formData.pictures.find(p => p.id === id);
    
    if (pictureToRemove && pictureToRemove.url.startsWith('https://firebasestorage.googleapis.com')) {
      try {
        await deleteEstimateImage(pictureToRemove.url);
      } catch (error) {
        console.error('Failed to delete image from storage:', error);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      pictures: prev.pictures.filter(picture => picture.id !== id)
    }));
  };

  const updatePicture = (id: string, field: keyof Picture, value: string | File | null) => {
    if (isReadOnly) return;
    
    setFormData(prev => {
      const updatedPictures = prev.pictures.map(picture => {
        if (picture.id === id) {
          const updatedPicture = { ...picture, [field]: value };
          
          if (field === 'file' && value instanceof File) {
            updatedPicture.url = URL.createObjectURL(value);
          }
          
          return updatedPicture;
        }
        return picture;
      });
      return { ...prev, pictures: updatedPictures };
    });
  };

  const handleFileSelect = (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setAlert({ type: 'error', message: 'Please select a valid image file.' });
        return;
      }
      
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setAlert({ type: 'error', message: 'Image file size must be less than 5MB.' });
        return;
      }
      
      updatePicture(id, 'file', file);
    }
  };

  const openCamera = (id: string) => {
    if (isReadOnly) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          setAlert({ type: 'error', message: 'Please select a valid image file.' });
          return;
        }
        
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          setAlert({ type: 'error', message: 'Image file size must be less than 5MB.' });
          return;
        }
        
        updatePicture(id, 'file', file);
      }
    };
    
    input.click();
  };

  const addLineItem = () => {
    if (isReadOnly) return;
    
    const newId = (formData.lineItems.length + 1).toString();
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { id: newId, description: '', quantity: 1, unitPrice: 0, total: 0 }]
    }));
  };

  const removeLineItem = (id: string) => {
    if (isReadOnly || formData.lineItems.length <= 1) return;
    
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== id)
    }));
    calculateTotals();
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    if (isReadOnly) return;
    
    setFormData(prev => {
      const updatedItems = prev.lineItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
          }
          return updatedItem;
        }
        return item;
      });
      return { ...prev, lineItems: updatedItems };
    });
    setTimeout(calculateTotals, 0);
  };

  const calculateTotals = () => {
    setFormData(prev => {
      const subtotal = prev.lineItems.reduce((sum, item) => sum + item.total, 0);
      const discountAmount = (subtotal * prev.discount) / 100;
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = (taxableAmount * prev.tax) / 100;
      const total = taxableAmount + taxAmount;

      return {
        ...prev,
        subtotal,
        total
      };
    });
  };

  const handleDiscountChange = (value: number) => {
    if (isReadOnly) return;
    setFormData(prev => ({ ...prev, discount: value }));
    setTimeout(calculateTotals, 0);
  };

  const handleTaxChange = (value: number) => {
    if (isReadOnly) return;
    setFormData(prev => ({ ...prev, tax: value }));
    setTimeout(calculateTotals, 0);
  };

  const resetForm = () => {
    setFormData({
      estimateNumber: '',
      projectId: '',
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      projectDescription: '',
      lineItems: [{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }],
      pictures: [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      depositType: 'none',
      depositValue: 0,
      requestSchedule: false,
      total: 0,
      validUntil: '',
      notes: ''
    });
    if (isCreating) {
      generateEstimateNumber();
      setDefaultValidUntil();
    }
  };

  const saveEstimate = async (status: 'draft' | 'sent' = 'draft') => {
    setLoading(true);
    try {
      if (!formData.customerName.trim()) {
        setAlert({ type: 'error', message: 'Customer name is required.' });
        setLoading(false);
        return;
      }

      if (formData.lineItems.length === 0 || !formData.lineItems.some(item => item.description.trim())) {
        setAlert({ type: 'error', message: 'At least one line item with description is required.' });
        setLoading(false);
        return;
      }

      let uploadedPictures = [];
      if (formData.pictures.length > 0) {
        if (isCreating) {
          const tempEstimateId = `temp-${Date.now()}`;
          uploadedPictures = await uploadEstimateImages(formData.pictures, tempEstimateId);
        } else if (estimateId) {
          uploadedPictures = await uploadEstimateImages(formData.pictures, estimateId);
        }
      }

      const estimateData = {
        projectId: formData.projectId || null,
        customerName: formData.customerName.trim(),
        customerEmail: formData.customerEmail.trim(),
        customerPhone: formData.customerPhone.trim(),
        projectDescription: formData.projectDescription.trim(),
        lineItems: formData.lineItems.filter(item => item.description.trim()),
        pictures: uploadedPictures,
        subtotal: formData.subtotal,
        discount: formData.discount,
        tax: formData.tax,
        depositType: formData.depositType,
        depositValue: formData.depositValue,
        requestSchedule: formData.requestSchedule,
        total: formData.total,
        validUntil: formData.validUntil,
        notes: formData.notes.trim(),
        status
      };
      
      if (isEditing && estimateId) {
        await updateEstimate(estimateId, estimateData);
        setAlert({ 
          type: 'success', 
          message: `Estimate ${formData.estimateNumber} updated successfully!` 
        });
      } else {
        const newEstimateId = await createEstimate(estimateData);
        setAlert({ 
          type: 'success', 
          message: `Estimate ${formData.estimateNumber} ${status === 'draft' ? 'saved as draft' : 'created'} successfully!` 
        });
      }
      
      if (onSave) {
        setTimeout(() => {
          onSave();
        }, 1500);
      }
      
    } catch (error) {
      setAlert({ type: 'error', message: 'Failed to save estimate. Please try again.' });
      console.error('Error saving estimate:', error);
    } finally {
      setLoading(false);
    }
  };

  const projectOptions = [
    { value: '', label: 'Independent Estimate (No Project)' },
    ...projects.map(project => ({ value: project.id, label: project.name }))
  ];

  const getTitle = () => {
    switch (mode) {
      case 'view': return 'View Estimate';
      case 'edit': return 'Edit Estimate';
      default: return 'Create New Estimate';
    }
  };

  const getActions = () => {
    if (isReadOnly) {
      return (
        <div className="border-t pt-6 flex justify-end gap-3">
          {onConvertToInvoice && (
            <LoadingButton
              type="button"
              variant="secondary"
              onClick={() => onConvertToInvoice(formData)}
              icon={CreditCard}
            >
              Convert to Invoice
            </LoadingButton>
          )}
          
          {onDownloadPDF && (
            <LoadingButton
              type="button"
              variant="secondary"
              onClick={() => onDownloadPDF(formData)}
              icon={Download}
            >
              Download PDF
            </LoadingButton>
          )}
          
          {onCancel && (
            <LoadingButton
              type="button"
              variant="secondary"
              onClick={onCancel}
            >
              Close
            </LoadingButton>
          )}
        </div>
      );
    }

    return (
      <div className="border-t pt-6 flex justify-end gap-3">
        {onCancel && (
          <LoadingButton
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </LoadingButton>
        )}
        
        <LoadingButton
          type="button"
          variant="secondary"
          onClick={() => saveEstimate('draft')}
          loading={loading}
          icon={Save}
        >
          Save as Draft
        </LoadingButton>
        
        <LoadingButton
          type="submit"
          loading={loading}
          icon={isEditing ? EditIcon : Calculator}
        >
          {isEditing ? 'Update Estimate' : 'Create Estimate'}
        </LoadingButton>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm border">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-semibold text-gray-900">{getTitle()}</h1>
        {isReadOnly && formData.estimateNumber && (
          <span className="text-lg text-gray-600">#{formData.estimateNumber}</span>
        )}
      </div>

      {alert && (
        <div ref={alertRef} tabIndex={-1} className="mb-6">
          <Alert type={alert.type} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); saveEstimate('draft'); }} className="space-y-6">
        {/* Estimate Number and Project Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Estimate Number" required>
            <InputField
              value={formData.estimateNumber}
              disabled
              className="bg-gray-50"
            />
          </FormField>

          <FormField label="Project" required={!isReadOnly}>
            <SelectField
              value={formData.projectId}
              onChange={(e) => handleProjectSelection(e.target.value)}
              options={projectOptions}
              placeholder="Select a project or create independent estimate"
              disabled={isReadOnly}
            />
          </FormField>
        </div>

        {/* Customer Information */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
          
          {!isReadOnly && showCreateProjectOption && formData.customerName && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800 mb-2">
                This appears to be a recurring customer. Would you like to create a new project for better organization?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => {
                    setAlert({ type: 'warning', message: 'Project creation will be available in the next update!' });
                  }}
                >
                  Create New Project
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  onClick={() => setShowCreateProjectOption(false)}
                >
                  Continue as Independent
                </button>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Customer Name" required={!isReadOnly}>
              <InputField
                value={formData.customerName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                placeholder="Enter customer name"
                disabled={isReadOnly}
              />
            </FormField>

            <FormField label="Email">
              <InputField
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                placeholder="customer@email.com"
                disabled={isReadOnly}
              />
            </FormField>

            <FormField label="Phone">
              <InputField
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                placeholder="(555) 123-4567"
                disabled={isReadOnly}
              />
            </FormField>
          </div>
        </div>

        {/* Project Description */}
        <div className="border-t pt-6">
          <FormField label="Project Description">
            <textarea
              value={formData.projectDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, projectDescription: e.target.value }))}
              placeholder="Describe the work to be performed..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-600"
              disabled={isReadOnly}
            />
          </FormField>
        </div>

        {/* Pictures */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Pictures</h3>
            {!isReadOnly && (
              <button
                type="button"
                onClick={addPicture}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Picture
              </button>
            )}
          </div>

          {formData.pictures.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No pictures added</p>
              {!isReadOnly && <p className="text-sm">Click "Add Picture" to get started</p>}
            </div>
          ) : (
            <div className="space-y-4">
              {formData.pictures.map((picture) => (
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
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => updatePicture(picture.id, 'url', '')}
                              className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ) : !isReadOnly ? (
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
                        <textarea
                          value={picture.description}
                          onChange={(e) => updatePicture(picture.id, 'description', e.target.value)}
                          placeholder="Describe what this picture shows..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-600"
                          disabled={isReadOnly}
                        />
                      </FormField>
                    </div>

                    {!isReadOnly && (
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

        {/* Line Items */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Line Items</h3>
            {!isReadOnly && (
              <button
                type="button"
                onClick={addLineItem}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            )}
          </div>

          <div className="space-y-3">
            {formData.lineItems.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-3 items-start">
                <div className="col-span-5">
                  <InputField
                    value={item.description}
                    onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                    placeholder="Description of work/materials"
                    disabled={isReadOnly}
                  />
                </div>
                <div className="col-span-2">
                  <InputField
                    type="number"
                    value={item.quantity.toString()}
                    onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    placeholder="Qty"
                    min="0"
                    step="0.01"
                    disabled={isReadOnly}
                  />
                </div>
                <div className="col-span-2">
                  <InputField
                    type="number"
                    value={item.unitPrice.toString()}
                    onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    placeholder="$0.00"
                    min="0"
                    step="0.01"
                    disabled={isReadOnly}
                  />
                </div>
                <div className="col-span-2">
                  <InputField
                    value={`$${item.total.toFixed(2)}`}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                {!isReadOnly && (
                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      disabled={formData.lineItems.length === 1}
                      className="p-2 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="border-t pt-6">
          <div className="flex justify-end">
            <div className="w-full max-w-md space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">${formData.subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center gap-4">
                <label className="text-gray-600">Discount (%):</label>
                <div className="w-24">
                  <InputField
                    type="number"
                    value={formData.discount.toString()}
                    onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.01"
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center gap-4">
                <label className="text-gray-600">Tax (%):</label>
                <div className="w-24">
                  <InputField
                    type="number"
                    value={formData.tax.toString()}
                    onChange={(e) => handleTaxChange(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.01"
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between items-center gap-4 mb-2">
                  <label className="text-gray-600">Request Deposit:</label>
                  <div className="w-32">
                    <SelectField
                      value={formData.depositType}
                      onChange={(e) => setFormData(prev => ({ ...prev, depositType: e.target.value as any }))}
                      options={[
                        { value: 'none', label: 'No Deposit' },
                        { value: 'percentage', label: 'Percentage' },
                        { value: 'amount', label: 'Amount' }
                      ]}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                
                {formData.depositType !== 'none' && (
                  <div className="flex justify-between items-center gap-4">
                    <label className="text-gray-600">
                      {formData.depositType === 'percentage' ? 'Deposit (%)' : 'Deposit Amount ($)'}:
                    </label>
                    <div className="w-24">
                      <InputField
                        type="number"
                        value={formData.depositValue.toString()}
                        onChange={(e) => setFormData(prev => ({ ...prev, depositValue: parseFloat(e.target.value) || 0 }))}
                        min="0"
                        max={formData.depositType === 'percentage' ? "100" : undefined}
                        step="0.01"
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between items-center gap-4">
                  <label className="text-gray-600">Request Payment Schedule:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.requestSchedule}
                      onChange={(e) => setFormData(prev => ({ ...prev, requestSchedule: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={isReadOnly}
                    />
                    <span className="text-sm text-gray-500">(Feature coming soon)</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total:</span>
                  <span>${formData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Valid Until and Notes */}
        <div className="border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Valid Until" required={!isReadOnly}>
            <InputField
              type="date"
              value={formData.validUntil}
              onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
              disabled={isReadOnly}
            />
          </FormField>

          <FormField label="Notes">
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes for this estimate..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-600"
              disabled={isReadOnly}
            />
          </FormField>
        </div>

        {/* Actions */}
        {getActions()}
      </form>
    </div>
  );
};