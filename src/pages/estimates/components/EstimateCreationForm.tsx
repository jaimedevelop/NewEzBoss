import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, FileText, Camera, Upload, X, UserPlus, User, ExternalLink, ShoppingCart, FolderOpen } from 'lucide-react';
import { FormField } from '../../../mainComponents/forms/FormField';
import { InputField } from '../../../mainComponents/forms/InputField';
import { SelectField } from '../../../mainComponents/forms/SelectField';
import { Alert } from '../../../mainComponents//ui/Alert';
import { LoadingButton } from '../../../mainComponents//ui/LoadingButton';
import { 
  createEstimate, 
  createChangeOrder,
  generateEstimateNumber as generateEstimateNumberFromDB,
  generateChangeOrderNumber,
  getEstimate,
  updateEstimate,
  type Estimate
} from '../../../services/estimates';
// import { getProjects } from '../../../services/projects';
import { uploadEstimateImages, deleteEstimateImage, uploadEstimateDocuments, deleteEstimateDocument, type Document } from '../../../firebase/storage';
import ClientSelectModal from './estimateDashboard/ClientSelectModal';
import { type Client } from '../../../services/clients';
import PaymentScheduleModal from './PaymentScheduleModal';
import { PaymentSchedule } from '../../../services/estimates/PaymentScheduleModal.types';
import { InventoryPickerModal } from './estimateDashboard/InventoryPickerModal';
import { CollectionImportModal } from './estimateDashboard/CollectionImportModal';
import { convertCollectionToLineItems } from '../../../services/estimates/estimates.inventory';

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Picture {
  id: string;
  file: File | null;
  url: string;
  description: string;
}

interface DocumentWithFile extends Document {
  file?: File;
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
  documents: DocumentWithFile[];
  subtotal: number;
  discount: number;
  tax: number;
  depositType: 'none' | 'percentage' | 'amount';
  depositValue: number;
  paymentSchedule: PaymentSchedule | null;
  total: number;
  validUntil: string;
  notes: string;
}

interface EstimateCreationFormProps {
  onEstimateCreated?: (estimateId: string) => void;
}

export const EstimateCreationForm: React.FC<EstimateCreationFormProps> = ({ onEstimateCreated }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Determine mode from URL params
  const mode = (searchParams.get('mode') as 'estimate' | 'change-order') || 'estimate';
  const parentEstimateId = searchParams.get('parent') || undefined;
  const isChangeOrder = mode === 'change-order';
  
  // Debug logging
  console.log('EstimateCreationForm initialized with:', {
    mode,
    parentEstimateId,
    isChangeOrder,
    searchParams: Object.fromEntries(searchParams.entries())
  });
  
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const alertRef = React.useRef<HTMLDivElement>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showPaymentScheduleModal, setShowPaymentScheduleModal] = useState(false);
  const [estimateCreated, setEstimateCreated] = useState(false);
  const [createdEstimateId, setCreatedEstimateId] = useState<string | null>(null);
  const [parentEstimate, setParentEstimate] = useState<Estimate | null>(null);
  const [loadingParent, setLoadingParent] = useState(false);
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);
  const [showCollectionImport, setShowCollectionImport] = useState(false);
  
  const [formData, setFormData] = useState<EstimateFormData>({
    estimateNumber: '',
    projectId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    projectDescription: '',
    lineItems: [{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }],
    pictures: [],
    documents: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    depositType: 'none',
    depositValue: 0,
    paymentSchedule: null,
    total: 0,
    validUntil: '',
    notes: ''
  });

  useEffect(() => {
    console.log('useEffect triggered with:', { isChangeOrder, parentEstimateId });
    
    if (isChangeOrder && parentEstimateId) {
      console.log('Calling loadParentEstimate...');
      loadParentEstimate();
    } else {
      console.log('Calling generateEstimateNumber...');
      generateEstimateNumber();
    }
    // loadProjects(); // Commented out until projects feature is implemented
    setDefaultValidUntil();
  }, [isChangeOrder, parentEstimateId]);

  useEffect(() => {
    if (alert && alertRef.current) {
      alertRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      alertRef.current.focus();
    }
  }, [alert]);

  const loadParentEstimate = async () => {
    if (!parentEstimateId) {
      console.error('No parent estimate ID provided');
      setAlert({ type: 'error', message: 'No parent estimate ID provided.' });
      navigate('/estimates');
      return;
    }
    
    console.log('Loading parent estimate with ID:', parentEstimateId);
    setLoadingParent(true);
    try {
      const parent = await getEstimate(parentEstimateId);
      console.log('Parent estimate loaded:', parent);
      
      if (!parent) {
        console.error('Parent estimate not found for ID:', parentEstimateId);
        setAlert({ type: 'error', message: `Parent estimate not found (ID: ${parentEstimateId}).` });
        navigate('/estimates');
        return;
      }
      
      setParentEstimate(parent);
      
      // Generate change order number
      const changeOrderNumber = await generateChangeOrderNumber(parent.estimateNumber);
      console.log('Generated change order number:', changeOrderNumber);
      
      // Pre-populate form with parent data
      setFormData(prev => ({
        ...prev,
        estimateNumber: changeOrderNumber,
        customerName: parent.customerName,
        customerEmail: parent.customerEmail,
        customerPhone: parent.customerPhone || '',
        tax: parent.tax,
        discount: parent.discount
      }));
      
      // Set selected client if we have customer data
      if (parent.customerId) {
        // Note: In a real implementation, you'd fetch the full client data
        setSelectedClient({
          id: parent.customerId,
          name: parent.customerName,
          email: parent.customerEmail,
          phoneMobile: parent.customerPhone
        } as Client);
      }
    } catch (error) {
      console.error('Error loading parent estimate:', error);
      setAlert({ type: 'error', message: `Failed to load parent estimate: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setLoadingParent(false);
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

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setFormData(prev => ({
      ...prev,
      customerName: client.name,
      customerEmail: client.email || '',
      customerPhone: client.phoneMobile || client.phoneOther || ''
    }));
  };

  const addPicture = () => {
    const newId = (formData.pictures.length + 1).toString();
    setFormData(prev => ({
      ...prev,
      pictures: [...prev.pictures, { id: newId, file: null, url: '', description: '' }]
    }));
  };

  const removePicture = async (id: string) => {
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
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setAlert({ type: 'error', message: 'Please select a valid image file.' });
        return;
      }
      
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setAlert({ type: 'error', message: 'Image file size must be less than 5MB.' });
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
          setAlert({ type: 'error', message: 'Please select a valid image file.' });
          return;
        }
        
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
          setAlert({ type: 'error', message: 'Image file size must be less than 5MB.' });
          return;
        }
        
        updatePicture(id, 'file', file);
      }
    };
    
    input.click();
  };

  const addDocument = () => {
    const newId = (formData.documents.length + 1).toString();
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, { id: newId, url: '', description: '', fileName: '' }]
    }));
  };

  const removeDocument = async (id: string) => {
    const documentToRemove = formData.documents.find(d => d.id === id);
    
    if (documentToRemove && documentToRemove.url.startsWith('https://firebasestorage.googleapis.com')) {
      try {
        await deleteEstimateDocument(documentToRemove.url);
      } catch (error) {
        console.error('Failed to delete document from storage:', error);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter(document => document.id !== id)
    }));
  };

  const updateDocument = (id: string, field: keyof DocumentWithFile, value: string | File) => {
    setFormData(prev => {
      const updatedDocuments = prev.documents.map(document => {
        if (document.id === id) {
          const updatedDocument = { ...document, [field]: value };
          
          if (field === 'file' && value instanceof File) {
            updatedDocument.url = URL.createObjectURL(value);
            updatedDocument.fileName = value.name;
          }
          
          return updatedDocument;
        }
        return document;
      });
      return { ...prev, documents: updatedDocuments };
    });
  };

  const handleDocumentSelect = (id: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024; // 10MB for documents
      if (file.size > maxSize) {
        setAlert({ type: 'error', message: 'Document file size must be less than 10MB.' });
        return;
      }
      
      updateDocument(id, 'file', file);
    }
  };

  const addLineItem = () => {
    const newId = (formData.lineItems.length + 1).toString();
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { id: newId, description: '', quantity: 1, unitPrice: 0, total: 0 }]
    }));
  };

  const removeLineItem = (id: string) => {
    if (formData.lineItems.length > 1) {
      setFormData(prev => ({
        ...prev,
        lineItems: prev.lineItems.filter(item => item.id !== id)
      }));
      calculateTotals();
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
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
    setFormData(prev => ({ ...prev, discount: value }));
    setTimeout(calculateTotals, 0);
  };

  const handleTaxChange = (value: number) => {
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
      documents: [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      depositType: 'none',
      depositValue: 0,
      paymentSchedule: null,
      total: 0,
      validUntil: '',
      notes: ''
    });
    setSelectedClient(null);
    generateEstimateNumber();
    setDefaultValidUntil();
  };

  const saveEstimate = async (status: 'draft' | 'sent' = 'draft') => {
    console.log('=== SAVE ESTIMATE DEBUG ===');
    console.log('Status:', status);
    console.log('Customer Name:', formData.customerName);
    console.log('Customer Email:', formData.customerEmail);
    console.log('Line Items:', formData.lineItems);
    console.log('Loading state:', loading);
    console.log('Selected Client:', selectedClient);
    
    setLoading(true);
    try {
      if (!formData.customerName.trim()) {
        console.log('ERROR: Customer name is empty');
        setAlert({ type: 'error', message: 'Customer name is required.' });
        setLoading(false);
        return;
      }

      if (formData.lineItems.length === 0 || !formData.lineItems.some(item => item.description.trim())) {
        console.log('ERROR: No valid line items');
        setAlert({ type: 'error', message: 'At least one line item with description is required.' });
        setLoading(false);
        return;
      }
      
      console.log('Validation passed, proceeding with save...');

      // Step 1: Create estimate data WITHOUT pictures and documents
      const estimateData: any = {
        customerName: formData.customerName.trim(),
        customerEmail: formData.customerEmail.trim(),
        customerPhone: formData.customerPhone.trim(),
        projectDescription: formData.projectDescription.trim(),
        lineItems: formData.lineItems.filter(item => item.description.trim()),
        pictures: [], // Will be updated after upload
        documents: [], // Will be updated after upload
        subtotal: formData.subtotal,
        discount: formData.discount,
        tax: formData.tax,
        taxRate: formData.tax, // Tax rate as percentage
        depositType: formData.depositType,
        depositValue: formData.depositValue,
        paymentSchedule: formData.paymentSchedule,
        total: formData.total,
        validUntil: formData.validUntil,
        notes: formData.notes.trim(),
        status,
        estimateState: status === 'draft' ? 'draft' as const : 'estimate' as const
      };

      // Only include projectId if it has a value (Firebase doesn't accept undefined)
      if (formData.projectId) {
        estimateData.projectId = formData.projectId;
      }
      
      // Step 2: Create the estimate to get the actual estimate ID
      let estimateId: string;
      
      if (isChangeOrder && parentEstimateId) {
        // Create as Change Order
        estimateId = await createChangeOrder(parentEstimateId, estimateData);
      } else {
        // Create as regular Estimate
        estimateId = await createEstimate(estimateData);
      }
      
      console.log('Estimate created with ID:', estimateId);

      // Step 3: Upload pictures and documents using the actual estimate ID
      let uploadedPictures = [];
      if (formData.pictures.length > 0) {
        console.log('Uploading pictures with estimate ID:', estimateId);
        uploadedPictures = await uploadEstimateImages(formData.pictures, estimateId);
        console.log('Pictures uploaded:', uploadedPictures);
      }

      let uploadedDocuments = [];
      if (formData.documents.length > 0) {
        console.log('Uploading documents with estimate ID:', estimateId);
        uploadedDocuments = await uploadEstimateDocuments(formData.documents, estimateId);
        console.log('Documents uploaded:', uploadedDocuments);
      }

      // Step 4: Update the estimate with the uploaded file URLs
      if (uploadedPictures.length > 0 || uploadedDocuments.length > 0) {
        console.log('Updating estimate with file URLs...');
        await updateEstimate(estimateId, {
          pictures: uploadedPictures,
          documents: uploadedDocuments
        });
        console.log('Estimate updated with file URLs');
      }
      
      const entityType = isChangeOrder ? 'Change order' : 'Estimate';
      setAlert({ 
        type: 'success', 
        message: `${entityType} ${formData.estimateNumber} ${status === 'draft' ? 'saved as draft' : 'created'} successfully!` 
      });
      
      // Mark estimate as created and store the ID
      setEstimateCreated(true);
      setCreatedEstimateId(estimateId);
      
      // Notify parent component
      if (onEstimateCreated) {
        onEstimateCreated(estimateId);
      }
      
      if (status === 'sent') {
        setTimeout(() => {
          resetForm();
        }, 2000);
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

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-sm border">
      <div className="flex items-center gap-3 mb-6">
        <FileText className={`w-6 h-6 ${isChangeOrder ? 'text-orange-600' : 'text-orange-600'}`} />
        <h1 className="text-2xl font-semibold text-gray-900">
          {isChangeOrder ? 'Create Change Order' : 'Create New Estimate'}
        </h1>
      </div>

      {/* Parent Estimate Info Box (Change Orders Only) */}
      {isChangeOrder && parentEstimate && (
        <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="w-4 h-4 text-orange-600" />
                <h3 className="text-sm font-semibold text-orange-900">Parent Estimate</h3>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-orange-800">
                  <span className="font-medium">Number:</span> {parentEstimate.estimateNumber}
                </p>
                <p className="text-sm text-orange-800">
                  <span className="font-medium">Customer:</span> {parentEstimate.customerName}
                </p>
                <p className="text-sm text-orange-800">
                  <span className="font-medium">Total:</span> ${parentEstimate.total.toFixed(2)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/estimates/${parentEstimateId}`)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-orange-700 bg-white border border-orange-300 rounded-lg hover:bg-orange-50 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View Parent
            </button>
          </div>
        </div>
      )}

      {/* Loading Parent State */}
      {loadingParent && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">Loading parent estimate...</p>
        </div>
      )}

      {alert && (
        <div ref={alertRef} tabIndex={-1} className="mb-6">
          <Alert type={alert.type} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        </div>
      )}

      <form onSubmit={(e) => { 
        e.preventDefault(); 
        console.log('Form submitted - Create Estimate clicked');
        saveEstimate('draft'); 
      }} className="space-y-6">
        {/* Estimate Number and Project Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label={isChangeOrder ? 'Change Order Number' : 'Estimate Number'} required>
            <InputField
              value={formData.estimateNumber}
              disabled
              className={isChangeOrder ? 'bg-orange-50' : 'bg-gray-50'}
            />
          </FormField>

          {!isChangeOrder && (
            <FormField label="Project" required>
              <SelectField
                value={formData.projectId}
                onChange={(e) => handleProjectSelection(e.target.value)}
                options={projectOptions}
                placeholder="Select a project or create independent estimate"
              />
            </FormField>
          )}
        </div>

        {/* Customer Information */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
          
          {isChangeOrder ? (
            /* Change Order - Customer info is read-only from parent */
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Customer Name</p>
                  <p className="text-sm font-medium text-gray-900">{formData.customerName}</p>
                </div>
                {formData.customerEmail && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="text-sm text-gray-900">{formData.customerEmail}</p>
                  </div>
                )}
                {formData.customerPhone && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Phone</p>
                    <p className="text-sm text-gray-900">{formData.customerPhone}</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Customer information inherited from parent estimate
              </p>
            </div>
          ) : (
            /* Regular Estimate - Customer selection */
            <>
          {!selectedClient ? (
            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <User className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-600 mb-4">No client selected</p>
              <button
                type="button"
                onClick={() => setShowClientModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                Add Client
              </button>
            </div>
          ) : (
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{selectedClient.name}</h4>
                    {selectedClient.companyName && (
                      <p className="text-sm text-gray-600">{selectedClient.companyName}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClient(null);
                    setFormData(prev => ({
                      ...prev,
                      customerName: '',
                      customerEmail: '',
                      customerPhone: ''
                    }));
                  }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedClient.email && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="text-sm text-gray-900">{selectedClient.email}</p>
                  </div>
                )}
                {selectedClient.phoneMobile && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Mobile Phone</p>
                    <p className="text-sm text-gray-900">{selectedClient.phoneMobile}</p>
                  </div>
                )}
                {selectedClient.billingAddress && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Billing Address</p>
                    <p className="text-sm text-gray-900">
                      {selectedClient.billingAddress}
                      {selectedClient.billingAddress2 && `, ${selectedClient.billingAddress2}`}
                      <br />
                      {selectedClient.billingCity}, {selectedClient.billingState} {selectedClient.billingZipCode}
                    </p>
                  </div>
                )}
              </div>
              
              <button
                type="button"
                onClick={() => setShowClientModal(true)}
                className="mt-4 text-sm text-orange-600 hover:text-orange-800 font-medium"
              >
                Change Client
              </button>
            </div>
          )}
          </>
          )}
        </div>

        {/* Project Description */}
        <div className="border-t pt-6">
          <FormField label="Project Description">
            <textarea
              value={formData.projectDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, projectDescription: e.target.value }))}
              placeholder="Describe the work to be performed..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </FormField>
        </div>

        {/* Pictures */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Pictures</h3>
            <button
              type="button"
              onClick={addPicture}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Picture
            </button>
          </div>

          {formData.pictures.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No pictures added yet</p>
              <p className="text-sm">Click "Add Picture" to get started</p>
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
                          <button
                            type="button"
                            onClick={() => updatePicture(picture.id, 'url', '')}
                            className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
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
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <FormField label="Description">
                        <textarea
                          value={picture.description}
                          onChange={(e) => updatePicture(picture.id, 'description', e.target.value)}
                          placeholder="Describe what this picture shows..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </FormField>
                    </div>

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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Documents</h3>
            <button
              type="button"
              onClick={addDocument}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Document
            </button>
          </div>

          {formData.documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No documents added yet</p>
              <p className="text-sm">Click "Add Document" to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {formData.documents.map((document) => (
                <div key={document.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <div className="space-y-2">
                      {document.url ? (
                        <div className="relative">
                          <a
                            href={document.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100"
                          >
                            <FileText className="w-5 h-5 text-orange-600" />
                            <span className="text-sm text-gray-700 truncate">{document.fileName || 'Document'}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => updateDocument(document.id, 'url', '')}
                            className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer">
                          <Upload className="w-4 h-4" />
                          Upload Document
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                            onChange={(e) => handleDocumentSelect(document.id, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <FormField label="Description">
                        <textarea
                          value={document.description}
                          onChange={(e) => updateDocument(document.id, 'description', e.target.value)}
                          placeholder="Describe this document..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </FormField>
                    </div>

                    <div className="md:col-span-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeDocument(document.id)}
                        className="flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove Document
                      </button>
                    </div>
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
            <button
              type="button"
              onClick={addLineItem}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="pb-3 pl-3">Description</th>
                  <th className="pb-3 pl-3 text-right w-24">Qty</th>
                  <th className="pb-3 pl-3 text-right w-32">Unit Price</th>
                  <th className="pb-3 pl-3 text-right w-32">Total</th>
                  <th className="pb-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {formData.lineItems.map((item) => (
                  <tr key={item.id} className="text-sm">
                    <td className="py-3 pl-3">
                      <InputField
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        placeholder="Description of work/materials"
                      />
                    </td>
                    <td className="py-2 pl-3">
                      <InputField
                        type="number"
                        value={item.quantity.toString()}
                        onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className="text-right w-full"
                      />
                    </td>
                    <td className="py-2 pl-3">
                      <InputField
                        type="number"
                        value={item.unitPrice.toString()}
                        onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="text-right w-full"
                      />
                    </td>
                    <td className="py-3 pl-3 text-right font-medium text-gray-900">
                      ${item.total.toFixed(2)}
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        disabled={formData.lineItems.length === 1}
                        className="p-2 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={addLineItem}
              className="py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-orange-500 hover:text-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Line Item
            </button>
            
            <button
              type="button"
              onClick={() => setShowInventoryPicker(true)}
              className="py-2 border-2 border-dashed border-green-300 rounded-lg text-sm text-green-700 hover:border-green-500 hover:text-green-800 hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Add From Inventory
            </button>
            
            <button
              type="button"
              onClick={() => setShowCollectionImport(true)}
              className="py-2 border-2 border-dashed border-indigo-300 rounded-lg text-sm text-indigo-700 hover:border-indigo-500 hover:text-indigo-800 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              Import Collection
            </button>
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
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-3">
                <div className="flex justify-between items-center gap-4">
                  <label className="text-gray-600">Payment Schedule:</label>
                  <button
                    type="button"
                    onClick={() => setShowPaymentScheduleModal(true)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                  >
                    {formData.paymentSchedule?.entries?.length ? 'Edit Schedule' : 'Set Schedule'}
                  </button>
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
          <FormField label="Valid Until" required>
            <InputField
              type="date"
              value={formData.validUntil}
              onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
            />
          </FormField>

          <FormField label="Notes">
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes for this estimate..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </FormField>
        </div>

        {/* Actions */}
        <div className="border-t pt-6 flex justify-end items-center">
          {/* Action Buttons */}
          <div className="flex gap-3">
            <LoadingButton
              type="submit"
              loading={loading}
              disabled={estimateCreated}
            >
              Create Estimate
            </LoadingButton>
          </div>
        </div>
      </form>
      <ClientSelectModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSelectClient={handleSelectClient}
      />
      <PaymentScheduleModal
        isOpen={showPaymentScheduleModal}
        onClose={() => setShowPaymentScheduleModal(false)}
        onSave={(schedule) => setFormData(prev => ({ ...prev, paymentSchedule: schedule }))}
        estimateTotal={formData.total}
        initialSchedule={formData.paymentSchedule}
      />
      <InventoryPickerModal
        isOpen={showInventoryPicker}
        onClose={() => setShowInventoryPicker(false)}
        onAddItems={(items) => {
          if (items.length === 0) return;
          // ✅ FIX: Preserve all fields from converted line items, including type and productId
          const newLineItems = items.map((item, index) => ({
            id: (formData.lineItems.length + index + 1).toString(),
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            type: item.type,
            productId: item.itemId, // Map itemId to productId for PO generation
            itemId: item.itemId,
            notes: item.notes || ''
          }));
          setFormData(prev => ({
            ...prev,
            lineItems: [...prev.lineItems, ...newLineItems]
          }));
          setTimeout(calculateTotals, 0);
        }}
      />
      <CollectionImportModal
        isOpen={showCollectionImport}
        onClose={() => setShowCollectionImport(false)}
        onImport={(items) => {
          if (items.length === 0) return;
          // ✅ FIX: Preserve all fields from converted line items, including type and productId
          const newLineItems = items.map((item, index) => ({
            id: (formData.lineItems.length + index + 1).toString(),
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            type: item.type,
            productId: item.itemId, // Map itemId to productId for PO generation
            itemId: item.itemId,
            notes: item.notes || ''
          }));
          setFormData(prev => ({
            ...prev,
            lineItems: [...prev.lineItems, ...newLineItems]
          }));
          setTimeout(calculateTotals, 0);
        }}
      />
    </div>
  );
};