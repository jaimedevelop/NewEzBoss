import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, UserPlus, User,
  ExternalLink, ShoppingCart, FolderOpen
} from 'lucide-react';
import { FormField } from '../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../mainComponents/forms/InputField';
import { SelectField } from '../../../../mainComponents/forms/SelectField';
import { Alert } from '../../../../mainComponents/ui/Alert';
import { LoadingButton } from '../../../../mainComponents/ui/LoadingButton';
import {
  createEstimateRow,
  createChangeOrder,
  generateChangeOrderNumber,
  getNextEstimateNumber,
  getEstimate,
  updateEstimate,
  type Estimate
} from '../../../../services/estimates';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { subscribeToBankAccounts, type BankAccount } from '../../../../services/finances/bank';
import { uploadEstimateImages, uploadEstimateDocuments, type Document } from '../../../../services/estimates/estimates.files';
import ClientSelectModal from '../../../../pages/estimates/components/estimateDashboard/estimateTab/ClientSelectModal';
import { type Client } from '../../../../services/clients';
import PaymentScheduleModal from '../../../../pages/estimates/components/PaymentScheduleModal';
import { PictureUploadGrid } from '../../../../components/common/PictureUploadGrid';
import { DocumentUploadList } from '../../../../components/common/DocumentUploadList';
import { PaymentSchedule } from '../../../../services/estimates/PaymentScheduleModal.types';
import { InventoryPickerModal } from '../../../../pages/estimates/components/estimateDashboard/estimateTab/InventoryPickerModal';
import { CollectionImportModal } from '../../../../pages/estimates/components/estimateDashboard/estimateTab/CollectionImportModal';
import ClientsCreationModal from '../../../../pages/people/clients/components/ClientsCreationModal';

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  total: number;
  type?: string;
  productId?: string;
  itemId?: string;
  notes?: string;
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

interface EstimateFormData {
  estimateNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceAddress: string;
  serviceAddress2: string;
  serviceCity: string;
  serviceState: string;
  serviceZipCode: string;
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
  accountId: string;
}

const MobileEstimateCreationForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const mode = (searchParams.get('mode') as 'estimate' | 'change-order') || 'estimate';
  const parentEstimateId = searchParams.get('parent') || undefined;
  const isChangeOrder = mode === 'change-order';

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showPaymentScheduleModal, setShowPaymentScheduleModal] = useState(false);
  const [estimateCreated, setEstimateCreated] = useState(false);
  const [parentEstimate, setParentEstimate] = useState<Estimate | null>(null);
  const [loadingParent, setLoadingParent] = useState(false);
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);
  const [showCollectionImport, setShowCollectionImport] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const { currentUser, userProfile } = useAuthContext();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingEstimateNumber, setLoadingEstimateNumber] = useState(false);
  const estimateNumberEditedRef = React.useRef(false);

  const [formData, setFormData] = useState<EstimateFormData>({
    estimateNumber: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    serviceAddress: '',
    serviceAddress2: '',
    serviceCity: '',
    serviceState: '',
    serviceZipCode: '',
    projectDescription: '',
    lineItems: [{ id: '1', description: '', quantity: '1', unitPrice: '', total: 0 }],
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
    notes: '',
    accountId: ''
  });

  useEffect(() => {
    if (isChangeOrder && parentEstimateId) {
      loadParentEstimate();
    } else {
      previewEstimateNumber();
    }
    setDefaultValidUntil();

    if (currentUser?.uid) {
      const unsubscribe = subscribeToBankAccounts(currentUser.uid, (accounts) => {
        setBankAccounts(accounts);
      });
      return () => unsubscribe();
    }
  }, [isChangeOrder, parentEstimateId, currentUser?.uid]);

  useEffect(() => {
    if (!isChangeOrder && userProfile?.defaultTaxRate !== undefined) {
      setFormData(prev => ({ ...prev, tax: userProfile.defaultTaxRate as number }));
    }
  }, [isChangeOrder, userProfile?.defaultTaxRate]);

  const loadParentEstimate = async () => {
    if (!parentEstimateId) {
      setAlert({ type: 'error', message: 'No parent estimate ID provided.' });
      navigate('/estimates');
      return;
    }

    setLoadingParent(true);
    try {
      const parent = await getEstimate(parentEstimateId);
      if (!parent) {
        setAlert({ type: 'error', message: `Parent estimate not found.` });
        navigate('/estimates');
        return;
      }

      setParentEstimate(parent);
      const changeOrderNumber = await generateChangeOrderNumber(parentEstimateId, parent.estimateNumber);

      setFormData(prev => ({
        ...prev,
        estimateNumber: changeOrderNumber,
        customerName: parent.customerName,
        customerEmail: parent.customerEmail,
        customerPhone: parent.customerPhone || '',
        tax: parent.tax,
        discount: parent.discount,
        accountId: parent.accountId || ''
      }));

      if (parent.customerId) {
        setSelectedClient({
          id: parent.customerId,
          name: parent.customerName,
          email: parent.customerEmail,
          phoneMobile: parent.customerPhone
        } as Client);
      }
    } catch (error) {
      console.error('Error loading parent estimate:', error);
      setAlert({ type: 'error', message: `Failed to load parent estimate.` });
    } finally {
      setLoadingParent(false);
    }
  };

  const previewEstimateNumber = async () => {
    setLoadingEstimateNumber(true);
    try {
      const estimateNumber = await getNextEstimateNumber();
      if (!estimateNumberEditedRef.current) {
        setFormData(prev => ({ ...prev, estimateNumber }));
      }
    } catch (error) {
      console.error('Error previewing estimate number:', error);
    } finally {
      setLoadingEstimateNumber(false);
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

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setFormData(prev => ({
      ...prev,
      customerName: client.name || '',
      customerEmail: client.email || '',
      customerPhone: client.phoneMobile || client.phoneOther || '',
      serviceAddress: client.serviceAddress || client.billingAddress || '',
      serviceAddress2: client.serviceAddress2 || client.billingAddress2 || '',
      serviceCity: client.serviceCity || client.billingCity || '',
      serviceState: client.serviceState || client.billingState || '',
      serviceZipCode: client.serviceZipCode || client.billingZipCode || ''
    }));
  };

  const handleEditClientSave = (updatedClient: Client) => {
    setSelectedClient(updatedClient);
    setFormData(prev => ({
      ...prev,
      customerName: updatedClient.name || '',
      customerEmail: updatedClient.email || '',
      serviceAddress: updatedClient.serviceAddress || updatedClient.billingAddress || '',
      serviceAddress2: updatedClient.serviceAddress2 || updatedClient.billingAddress2 || '',
      serviceCity: updatedClient.serviceCity || updatedClient.billingCity || '',
      serviceState: updatedClient.serviceState || updatedClient.billingState || '',
      serviceZipCode: updatedClient.serviceZipCode || updatedClient.billingZipCode || '',
      customerPhone: updatedClient.phoneMobile || updatedClient.phoneOther || ''
    }));
    setShowEditClientModal(false);
    setAlert({ type: 'success', message: 'Client updated successfully!' });
  };

  const addPictureFile = (file: File) => {
    const newId = (formData.pictures.length + 1).toString() + '-' + Date.now();
    setFormData(prev => ({
      ...prev,
      pictures: [...prev.pictures, { id: newId, file, url: URL.createObjectURL(file), description: '' }]
    }));
  };

  const removePicture = (id: string) => {
    setFormData(prev => ({
      ...prev,
      pictures: prev.pictures.filter(picture => picture.id !== id)
    }));
  };

  const updatePicture = (id: string, field: keyof Picture, value: string | File | null) => {
    setFormData(prev => ({
      ...prev,
      pictures: prev.pictures.map(picture => {
        if (picture.id !== id) return picture;
        const updated = { ...picture, [field]: value };
        if (field === 'file' && value instanceof File) {
          updated.url = URL.createObjectURL(value);
        }
        return updated;
      })
    }));
  };

  const addDocumentFile = (file: File) => {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setAlert({ type: 'error', message: 'Document file size must be less than 10MB.' });
      return;
    }
    const newId = (formData.documents.length + 1).toString() + '-' + Date.now();
    setFormData(prev => ({
      ...prev,
      documents: [...prev.documents, {
        id: newId,
        file,
        url: URL.createObjectURL(file),
        description: '',
        fileName: file.name
      }]
    }));
  };

  const removeDocument = (id: string) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter(document => document.id !== id)
    }));
  };

  const updateDocument = (id: string, field: keyof DocumentWithFile, value: string | File) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.map(document => {
        if (document.id !== id) return document;
        const updated = { ...document, [field]: value };
        if (field === 'file' && value instanceof File) {
          updated.url = URL.createObjectURL(value);
          updated.fileName = value.name;
        }
        return updated;
      })
    }));
  };

  const addLineItem = () => {
    const newId = (formData.lineItems.length + 1).toString();
    setFormData(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { id: newId, description: '', quantity: '1', unitPrice: '', total: 0 }]
    }));
  };

  const removeLineItem = (id: string) => {
    if (formData.lineItems.length > 1) {
      setFormData(prev => ({
        ...prev,
        lineItems: prev.lineItems.filter(item => item.id !== id)
      }));
      setTimeout(calculateTotals, 0);
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = parseFloat(updated.quantity as string) || 0;
          const price = parseFloat(updated.unitPrice as string) || 0;
          updated.total = qty * price;
        }
        return updated;
      })
    }));
    setTimeout(calculateTotals, 0);
  };

  const calculateTotals = () => {
    setFormData(prev => {
      const subtotal = prev.lineItems.reduce((sum, item) => sum + item.total, 0);
      const discountAmount = (subtotal * prev.discount) / 100;
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = (taxableAmount * prev.tax) / 100;
      const total = taxableAmount + taxAmount;
      return { ...prev, subtotal, total };
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

      const estimateData: any = {
        estimateNumber: !isChangeOrder ? formData.estimateNumber.trim() : undefined,
        customerName: formData.customerName.trim(),
        customerEmail: formData.customerEmail.trim(),
        customerPhone: formData.customerPhone.trim(),
        serviceAddress: formData.serviceAddress.trim(),
        serviceAddress2: formData.serviceAddress2.trim(),
        serviceCity: formData.serviceCity.trim(),
        serviceState: formData.serviceState.trim(),
        serviceZipCode: formData.serviceZipCode.trim(),
        projectDescription: formData.projectDescription.trim(),
        lineItems: formData.lineItems
          .filter(item => item.description.trim())
          .map(item => ({
            ...item,
            quantity: parseFloat(item.quantity) || 0,
            unitPrice: parseFloat(item.unitPrice) || 0
          })),
        pictures: [],
        documents: [],
        subtotal: formData.subtotal,
        discount: formData.discount,
        tax: formData.tax,
        taxRate: formData.tax,
        depositType: formData.depositType,
        depositValue: formData.depositValue,
        paymentSchedule: formData.paymentSchedule,
        total: formData.total,
        validUntil: formData.validUntil,
        notes: formData.notes.trim(),
        status,
        estimateState: status === 'draft' ? 'draft' as const : 'estimate' as const,
        accountId: formData.accountId || undefined
      };

      let estimateId: string;
      let estimateNumber = formData.estimateNumber;

      if (isChangeOrder && parentEstimateId) {
        estimateId = await createChangeOrder(parentEstimateId, estimateData);
      } else {
        const row = await createEstimateRow(estimateData);
        estimateId = String(row.id);
        estimateNumber = row.estimateNumber;
        setFormData(prev => ({ ...prev, estimateNumber: row.estimateNumber }));
      }

      const [uploadedPictures, uploadedDocuments] = await Promise.all([
        formData.pictures.length > 0
          ? uploadEstimateImages(formData.pictures, estimateId)
          : Promise.resolve([] as any[]),
        formData.documents.length > 0
          ? uploadEstimateDocuments(formData.documents, estimateId)
          : Promise.resolve([] as any[]),
      ]);

      if (uploadedPictures.length > 0 || uploadedDocuments.length > 0) {
        await updateEstimate(estimateId, {
          pictures: uploadedPictures,
          documents: uploadedDocuments
        });
      }

      const entityType = isChangeOrder ? 'Change order' : 'Estimate';
      setEstimateCreated(true);

      navigate(`/estimates/${estimateId}`, {
        state: {
          success: true,
          message: `${entityType} ${estimateNumber} ${status === 'draft' ? 'saved as draft' : 'created'} successfully!`
        }
      });
    } catch (error) {
      const message = error instanceof Error && error.message
        ? error.message
        : 'Failed to save estimate. Please try again.';
      setAlert({ type: 'error', message });
      console.error('Error saving estimate:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <header className="bg-white border-b border-gray-200 flex-shrink-0 z-20 px-4 h-14 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 text-gray-500 active:bg-gray-100 rounded-full"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 truncate">
          {isChangeOrder ? 'New Change Order' : 'New Estimate'}
        </h1>
      </header>

      <div className="flex-1 p-4 space-y-5 pb-28 overflow-y-auto overscroll-contain">
        {isChangeOrder && parentEstimate && (
          <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-semibold text-orange-900">Parent Estimate</h3>
            </div>
            <p className="text-sm text-orange-800">{parentEstimate.estimateNumber} · {parentEstimate.customerName}</p>
            <p className="text-sm text-orange-800">${parentEstimate.total.toFixed(2)}</p>
          </div>
        )}

        {loadingParent && (
          <div className="p-4 bg-gray-100 rounded-xl text-sm text-gray-600">Loading parent estimate...</div>
        )}

        {alert && (
          <Alert type={alert.type} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <FormField label={isChangeOrder ? 'Change Order Number' : 'Estimate Number'} required>
            <InputField
              value={formData.estimateNumber}
              onChange={isChangeOrder ? undefined : (e) => {
                estimateNumberEditedRef.current = true;
                setFormData(prev => ({ ...prev, estimateNumber: e.target.value }));
              }}
              disabled={isChangeOrder}
              placeholder={loadingEstimateNumber ? 'Loading...' : undefined}
              className={isChangeOrder ? 'bg-orange-50' : ''}
            />
          </FormField>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer</h3>

          {isChangeOrder ? (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-1">
              <p className="text-sm font-medium text-gray-900">{formData.customerName}</p>
              {formData.customerEmail && <p className="text-xs text-gray-600">{formData.customerEmail}</p>}
              {formData.customerPhone && <p className="text-xs text-gray-600">{formData.customerPhone}</p>}
              <p className="text-xs text-gray-500 pt-1">Inherited from parent estimate</p>
            </div>
          ) : !selectedClient ? (
            <button
              type="button"
              onClick={() => setShowClientModal(true)}
              className="w-full flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-gray-300 rounded-lg active:bg-gray-50"
            >
              <User className="w-10 h-10 text-gray-400" />
              <span className="text-sm text-gray-600">No client selected</span>
              <span className="inline-flex items-center gap-1.5 mt-1 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium">
                <UserPlus className="w-4 h-4" />
                Add Client
              </span>
            </button>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">{selectedClient.name}</h4>
                    {selectedClient.companyName && (
                      <p className="text-xs text-gray-600 truncate">{selectedClient.companyName}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClient(null);
                    setFormData(prev => ({ ...prev, customerName: '', customerEmail: '', customerPhone: '' }));
                  }}
                  className="text-xs text-red-600 flex-shrink-0"
                >
                  Remove
                </button>
              </div>

              <div className="space-y-1 text-sm">
                {selectedClient.email && <p className="text-gray-700">{selectedClient.email}</p>}
                {selectedClient.phoneMobile && <p className="text-gray-700">{selectedClient.phoneMobile}</p>}
                {selectedClient.billingAddress && (
                  <p className="text-gray-700 pt-1 border-t border-gray-200 mt-2">
                    {selectedClient.billingAddress}
                    {selectedClient.billingAddress2 && `, ${selectedClient.billingAddress2}`}
                    <br />
                    {selectedClient.billingCity}, {selectedClient.billingState} {selectedClient.billingZipCode}
                  </p>
                )}
              </div>

              <div className="mt-3 flex items-center gap-3">
                <button type="button" onClick={() => setShowClientModal(true)} className="text-xs text-orange-600 font-medium">
                  Change Client
                </button>
                <span className="text-gray-300">|</span>
                <button type="button" onClick={() => setShowEditClientModal(true)} className="text-xs text-orange-600 font-medium">
                  Edit Client
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Service Address</h3>
          <FormField label="Street Address">
            <InputField
              value={formData.serviceAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, serviceAddress: e.target.value }))}
              placeholder="Street Address"
            />
          </FormField>
          <FormField label="Suite / Apt">
            <InputField
              value={formData.serviceAddress2}
              onChange={(e) => setFormData(prev => ({ ...prev, serviceAddress2: e.target.value }))}
              placeholder="Suite, Unit, etc. (Optional)"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="City">
              <InputField
                value={formData.serviceCity}
                onChange={(e) => setFormData(prev => ({ ...prev, serviceCity: e.target.value }))}
                placeholder="City"
              />
            </FormField>
            <FormField label="State">
              <InputField
                value={formData.serviceState}
                onChange={(e) => setFormData(prev => ({ ...prev, serviceState: e.target.value }))}
                placeholder="State"
              />
            </FormField>
          </div>
          <FormField label="Zip Code">
            <InputField
              value={formData.serviceZipCode}
              onChange={(e) => setFormData(prev => ({ ...prev, serviceZipCode: e.target.value }))}
              placeholder="Zip Code"
            />
          </FormField>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
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

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <PictureUploadGrid
            pictures={formData.pictures}
            isEditing={true}
            onAdd={addPictureFile}
            onRemove={removePicture}
            onUpdateDescription={(id, description) => updatePicture(id, 'description', description)}
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <DocumentUploadList
            documents={formData.documents}
            isEditing={true}
            onAdd={addDocumentFile}
            onRemove={removeDocument}
            onUpdateDescription={(id, description) => updateDocument(id, 'description', description)}
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Line Items</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowInventoryPicker(true)}
                className="flex items-center gap-1 px-2 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-md"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Inventory
              </button>
              <button
                type="button"
                onClick={() => setShowCollectionImport(true)}
                className="flex items-center gap-1 px-2 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-md"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Collection
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {formData.lineItems.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                <textarea
                  value={item.description}
                  onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                  placeholder="Description of work/materials"
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 mb-2"
                />
                <div className="grid grid-cols-3 gap-2 items-end">
                  <FormField label="Qty">
                    <InputField
                      type="text"
                      inputMode="numeric"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d+$/.test(val)) updateLineItem(item.id, 'quantity', val);
                      }}
                      placeholder="0"
                    />
                  </FormField>
                  <FormField label="Price">
                    <InputField
                      type="text"
                      inputMode="decimal"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) updateLineItem(item.id, 'unitPrice', val);
                      }}
                      placeholder="0.00"
                    />
                  </FormField>
                  <div className="flex items-center justify-between h-[42px]">
                    <span className="text-sm font-semibold text-gray-900">${item.total.toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      disabled={formData.lineItems.length === 1}
                      className="p-2 text-red-600 disabled:text-gray-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addLineItem}
            className="mt-3 flex items-center gap-1.5 px-3 py-2 text-sm bg-orange-600 text-white rounded-md active:bg-orange-700"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Totals</h3>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">${formData.subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center gap-3">
            <label className="text-sm text-gray-600">Discount (%)</label>
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

          <div className="flex justify-between items-center gap-3">
            <label className="text-sm text-gray-600">Tax (%)</label>
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

          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between items-center gap-3">
              <label className="text-sm text-gray-600">Deposit</label>
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
              <div className="flex justify-between items-center gap-3">
                <label className="text-sm text-gray-600">
                  {formData.depositType === 'percentage' ? 'Deposit (%)' : 'Amount ($)'}
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

          <div className="border-t pt-3 flex justify-between items-center">
            <label className="text-sm text-gray-600">Payment Schedule</label>
            <button
              type="button"
              onClick={() => setShowPaymentScheduleModal(true)}
              className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-xs font-medium active:bg-orange-700"
            >
              {formData.paymentSchedule?.entries?.length ? 'Edit Schedule' : 'Set Schedule'}
            </button>
          </div>

          <div className="border-t pt-3 flex justify-between items-center text-base font-semibold">
            <span>Total</span>
            <span>${formData.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
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
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <LoadingButton
          type="button"
          loading={loading}
          loadingText="Saving..."
          disabled={estimateCreated}
          onClick={() => saveEstimate('draft')}
          className="w-full"
        >
          {isChangeOrder ? 'Create Change Order' : 'Create Estimate'}
        </LoadingButton>
      </div>

      <ClientSelectModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSelectClient={handleSelectClient}
      />
      {showEditClientModal && selectedClient && (
        <ClientsCreationModal
          client={selectedClient}
          onClose={() => setShowEditClientModal(false)}
          onSave={(updatedClient) => updatedClient && handleEditClientSave(updatedClient)}
        />
      )}
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
          const newLineItems = items.map((item, index) => ({
            id: (formData.lineItems.length + index + 1).toString(),
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
            total: item.quantity * item.unitPrice,
            type: item.type,
            productId: item.itemId,
            itemId: item.itemId,
            notes: item.notes || ''
          }));
          setFormData(prev => ({ ...prev, lineItems: [...prev.lineItems, ...newLineItems] }));
          setTimeout(calculateTotals, 0);
        }}
      />
      <CollectionImportModal
        isOpen={showCollectionImport}
        onClose={() => setShowCollectionImport(false)}
        onImport={(items) => {
          if (items.length === 0) return;
          const newLineItems = items.map((item, index) => ({
            id: (formData.lineItems.length + index + 1).toString(),
            description: item.description,
            quantity: item.quantity.toString(),
            unitPrice: item.unitPrice.toString(),
            total: item.quantity * item.unitPrice,
            type: item.type,
            productId: item.itemId,
            itemId: item.itemId,
            notes: item.notes || ''
          }));
          setFormData(prev => ({ ...prev, lineItems: [...prev.lineItems, ...newLineItems] }));
          setTimeout(calculateTotals, 0);
        }}
      />
    </div>
  );
};

export default MobileEstimateCreationForm;
