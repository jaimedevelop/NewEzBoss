import React, { useState, useEffect } from 'react';
import { Edit, Save, X, User, UserPlus, AlertCircle, Calendar, Send, ShoppingCart, FileEdit, DollarSign, Lock } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { updateEstimate, formatCurrency, type Estimate } from '../../../../services/estimates';
import { prepareEstimateForSending, generatePurchaseOrderForEstimate } from '../../../../services/estimates/estimates.mutations';
import { sendEstimateEmail } from '../../../../services/email';
import { type Client } from '../../../../services/clients';
import { subscribeToBankAccounts, type BankAccount } from '../../../../services/finances/bank';
import { uploadEstimateImages, deleteEstimateImage, uploadEstimateDocuments, deleteEstimateDocument, type Document } from '../../../../services/estimates/estimates.files';
import { FormField } from '../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../mainComponents/forms/InputField';
import { SelectField } from '../../../../mainComponents/forms/SelectField';
import ClientSelectModal from '../../../../pages/estimates/components/estimateDashboard/estimateTab/ClientSelectModal';
import SendEstimateModal from '../../../../pages/estimates/components/estimateDashboard/estimateTab/SendEstimateModal';
import LineItemsSection from '../../../../pages/estimates/components/estimateDashboard/estimateTab/LineItemsSection';
import PaymentScheduleModal from '../../../../pages/estimates/components/PaymentScheduleModal';
import { PaymentSchedule } from '../../../../services/estimates/PaymentScheduleModal.types';
import { PictureUploadGrid } from '../../../../components/common/PictureUploadGrid';
import { DocumentUploadList } from '../../../../components/common/DocumentUploadList';
import { useNavigate } from 'react-router-dom';

interface Picture {
  id: string;
  file: File | null;
  url: string;
  description: string;
}

interface DocumentWithFile extends Document {
  file?: File;
}

interface MobileEstimateTabProps {
  estimate: Estimate;
  onUpdate: () => void;
  onCreateChangeOrder?: () => void;
  onConvertToInvoice?: () => void;
}

const MobileEstimateTab: React.FC<MobileEstimateTabProps> = ({ estimate, onUpdate, onCreateChangeOrder, onConvertToInvoice }) => {
  const { currentUser, userProfile } = useAuthContext();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [isCreatingPO, setIsCreatingPO] = useState(false);

  const formPopulatedRef = React.useRef(false);

  const [showClientModal, setShowClientModal] = useState(false);
  const [showPaymentScheduleModal, setShowPaymentScheduleModal] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const [editForm, setEditForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    serviceAddress: '',
    serviceAddress2: '',
    serviceCity: '',
    serviceState: '',
    serviceZipCode: '',
    projectDescription: '',
    pictures: [] as Picture[],
    documents: [] as DocumentWithFile[],
    discount: 0,
    discountType: 'percentage' as 'percentage' | 'amount',
    taxRate: 0,
    depositType: 'none' as 'none' | 'percentage' | 'amount',
    depositValue: 0,
    paymentSchedule: null as PaymentSchedule | null,
    validUntil: '',
    notes: '',
    accountId: ''
  });

  useEffect(() => {
    if (isEditing && !formPopulatedRef.current) {
      setEditForm({
        customerName: estimate.customerName || '',
        customerEmail: estimate.customerEmail || '',
        customerPhone: estimate.customerPhone || '',
        serviceAddress: estimate.serviceAddress || '',
        serviceAddress2: estimate.serviceAddress2 || '',
        serviceCity: estimate.serviceCity || '',
        serviceState: estimate.serviceState || '',
        serviceZipCode: estimate.serviceZipCode || '',
        projectDescription: (estimate as any).projectDescription || '',
        pictures: ((estimate as any).pictures || []).map((pic: any, idx: number) => ({
          id: idx.toString(),
          file: null,
          url: pic.url || '',
          description: pic.description || ''
        })),
        documents: ((estimate as any).documents || []).map((doc: any, idx: number) => ({
          id: idx.toString(),
          file: null,
          url: doc.url || '',
          description: doc.description || '',
          fileName: doc.fileName || ''
        })),
        discount: estimate.discount || 0,
        discountType: (estimate.discountType === 'fixed' ? 'amount' : estimate.discountType) || 'percentage',
        taxRate: estimate.taxRate || 0,
        depositType: (estimate as any).depositType || 'none',
        depositValue: (estimate as any).depositValue || 0,
        paymentSchedule: (estimate as any).paymentSchedule || null,
        validUntil: estimate.validUntil || '',
        notes: estimate.notes || '',
        accountId: estimate.accountId || ''
      });
      setHasUnsavedChanges(false);
      formPopulatedRef.current = true;
    } else if (!isEditing) {
      formPopulatedRef.current = false;
    }
  }, [isEditing, estimate]);

  useEffect(() => {
    if (currentUser?.uid) {
      const unsubscribe = subscribeToBankAccounts(currentUser.uid, (accounts) => {
        setBankAccounts(accounts);
      });
      return () => unsubscribe();
    }
  }, [currentUser?.uid]);

  const handleFormChange = <K extends keyof typeof editForm>(field: K, value: typeof editForm[K]) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const addPictureFile = (file: File) => {
    const newId = editForm.pictures.length.toString() + '-' + Date.now();
    handleFormChange('pictures', [...editForm.pictures, { id: newId, file, url: URL.createObjectURL(file), description: '' }]);
  };

  const removePicture = async (id: string) => {
    const pictureToRemove = editForm.pictures.find(p => p.id === id);
    if (pictureToRemove && pictureToRemove.url.startsWith('http') && estimate.id) {
      try {
        await deleteEstimateImage(pictureToRemove.url, estimate.id);
      } catch (error) {
        console.error('Failed to delete image from storage:', error);
      }
    }
    handleFormChange('pictures', editForm.pictures.filter(p => p.id !== id));
  };

  const updatePicture = (id: string, field: keyof Picture, value: string | File | null) => {
    const updatedPictures = editForm.pictures.map(picture => {
      if (picture.id !== id) return picture;
      const updated = { ...picture, [field]: value };
      if (field === 'file' && value instanceof File) {
        updated.url = URL.createObjectURL(value);
      }
      return updated;
    });
    handleFormChange('pictures', updatedPictures);
  };

  const addDocumentFile = (file: File) => {
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Document file size must be less than 10MB.');
      return;
    }
    const newId = editForm.documents.length.toString() + '-' + Date.now();
    handleFormChange('documents', [...editForm.documents, {
      id: newId,
      file,
      url: URL.createObjectURL(file),
      description: '',
      fileName: file.name
    }]);
  };

  const removeDocument = async (id: string) => {
    const documentToRemove = editForm.documents.find(d => d.id === id);
    if (documentToRemove && documentToRemove.url.startsWith('http') && estimate.id) {
      try {
        await deleteEstimateDocument(documentToRemove.url, estimate.id);
      } catch (error) {
        console.error('Failed to delete document from storage:', error);
      }
    }
    handleFormChange('documents', editForm.documents.filter(d => d.id !== id));
  };

  const updateDocument = (id: string, field: keyof DocumentWithFile, value: string | File | null) => {
    const updatedDocuments = editForm.documents.map(document => {
      if (document.id !== id) return document;
      const updated = { ...document, [field]: value };
      if (field === 'file' && value instanceof File) {
        updated.url = URL.createObjectURL(value);
        updated.fileName = value.name;
      }
      return updated;
    });
    handleFormChange('documents', updatedDocuments);
  };

  const handleSelectClient = (client: Client) => {
    handleFormChange('customerName', client.name || '');
    handleFormChange('customerEmail', client.email || '');
    handleFormChange('customerPhone', client.phoneMobile || client.phoneOther || '');
    handleFormChange('serviceAddress', client.serviceAddress || client.billingAddress || '');
    handleFormChange('serviceAddress2', client.serviceAddress2 || client.billingAddress2 || '');
    handleFormChange('serviceCity', client.serviceCity || client.billingCity || '');
    handleFormChange('serviceState', client.serviceState || client.billingState || '');
    handleFormChange('serviceZipCode', client.serviceZipCode || client.billingZipCode || '');
    setShowClientModal(false);
  };

  const selectedAccount = React.useMemo(() => {
    return bankAccounts.find(acc => acc.id === estimate.accountId);
  }, [bankAccounts, estimate.accountId]);

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
      let uploadedPictures: any[] = [];
      if (editForm.pictures.length > 0) {
        uploadedPictures = await uploadEstimateImages(editForm.pictures, estimate.id);
      }

      let uploadedDocuments: any[] = [];
      if (editForm.documents.length > 0) {
        uploadedDocuments = await uploadEstimateDocuments(editForm.documents, estimate.id);
      }

      const updateData = {
        customerName: editForm.customerName,
        customerEmail: editForm.customerEmail,
        customerPhone: editForm.customerPhone,
        serviceAddress: editForm.serviceAddress,
        serviceAddress2: editForm.serviceAddress2,
        serviceCity: editForm.serviceCity,
        serviceState: editForm.serviceState,
        serviceZipCode: editForm.serviceZipCode,
        projectDescription: editForm.projectDescription,
        pictures: uploadedPictures,
        documents: uploadedDocuments,
        discount: editForm.discount,
        discountType: editForm.discountType,
        taxRate: editForm.taxRate,
        depositType: editForm.depositType,
        depositValue: editForm.depositValue,
        paymentSchedule: editForm.paymentSchedule,
        validUntil: editForm.validUntil,
        notes: editForm.notes,
        accountId: editForm.accountId || undefined
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

  const handleSendEstimate = async (data: { emailTitle: string; ccEmails: string; message: string }) => {
    try {
      if (!estimate.id) throw new Error('Estimate ID is missing');
      if (!estimate.customerEmail) throw new Error('Missing client email');

      const prepareResult = await prepareEstimateForSending(
        estimate.id,
        estimate.contractorEmail || 'noreply@example.com'
      );

      if (!prepareResult.success || !prepareResult.token) {
        throw new Error(prepareResult.error || 'Failed to prepare estimate');
      }

      await sendEstimateEmail({
        estimate: { ...estimate, emailToken: prepareResult.token },
        recipientEmail: estimate.customerEmail,
        recipientName: estimate.customerName,
        contractorName: userProfile?.company || 'Your Company',
        contractorEmail: estimate.contractorEmail || 'noreply@example.com',
        customSubject: data.emailTitle,
        customMessage: data.message,
        ccEmails: data.ccEmails
      });

      const updates: any = { clientState: 'sent', sentDate: new Date().toISOString() };
      if (estimate.estimateState === 'draft') {
        updates.estimateState = 'estimate';
      }
      await updateEstimate(estimate.id, updates);

      alert('Estimate sent successfully!');
      onUpdate();
    } catch (error) {
      console.error('Error sending estimate:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to send estimate: ${message}`);
    }
  };

  const handleConvertToInvoice = () => {
    const confirmed = window.confirm(
      'Are you sure you want to convert this estimate to an invoice? This action cannot be undone.'
    );
    if (confirmed && onConvertToInvoice) onConvertToInvoice();
  };

  const handleCreatePO = async () => {
    if (!estimate.id) return;
    setIsCreatingPO(true);
    try {
      const result = await generatePurchaseOrderForEstimate(estimate.id);
      if (result.success) {
        alert('Purchase Order created successfully!');
        onUpdate();
      } else {
        alert(`Failed to create Purchase Order: ${result.error}`);
      }
    } catch (error: any) {
      alert(`Error creating Purchase Order: ${error.message}`);
    } finally {
      setIsCreatingPO(false);
    }
  };

  const showSendButton = estimate.estimateState !== 'invoice' && !estimate.clientState;
  const showCreateChangeOrderButton = estimate.clientState === 'accepted' && estimate.estimateState === 'estimate';
  const showConvertToInvoiceButton = estimate.clientState === 'accepted' && estimate.estimateState === 'estimate';
  const showLineItemsLocked = estimate.clientState === 'accepted';
  const showCreatePOButton = estimate.estimateState !== 'invoice';

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 flex flex-col gap-2">
        {showLineItemsLocked && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-800">
            <Lock className="w-3.5 h-3.5" />
            <span className="font-medium">Line Items Locked</span>
          </div>
        )}
        {showSendButton && (
          <button
            onClick={() => setShowSendModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg active:bg-orange-700 text-sm font-medium"
          >
            <Send className="w-4 h-4" />
            Send {estimate.estimateState === 'change-order' ? 'Change Order' : 'Estimate'}
          </button>
        )}
        {showCreateChangeOrderButton && (
          <button
            onClick={onCreateChangeOrder}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg active:bg-orange-700 text-sm font-medium"
          >
            <FileEdit className="w-4 h-4" />
            Create Change Order
          </button>
        )}
        {showConvertToInvoiceButton && (
          <button
            onClick={handleConvertToInvoice}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg active:bg-green-700 text-sm font-medium"
          >
            <DollarSign className="w-4 h-4" />
            Convert to Invoice
          </button>
        )}
        {showCreatePOButton && (
          <button
            onClick={
              estimate.purchaseOrderIds && estimate.purchaseOrderIds.length > 0
                ? () => navigate(`/purchasing?poId=${estimate.purchaseOrderIds![0]}`)
                : handleCreatePO
            }
            disabled={isCreatingPO}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <ShoppingCart className="w-4 h-4" />
            {isCreatingPO ? 'Creating...' : estimate.purchaseOrderIds?.length ? 'View P.O.' : 'Create P.O.'}
          </button>
        )}
      </div>

      {/* Header with Edit Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Details</h2>
          {!isEditing ? (
            <button
              onClick={handleStartEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-orange-600 text-white rounded-lg active:bg-orange-700"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg active:bg-green-700 disabled:bg-gray-400"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg active:bg-gray-300 disabled:bg-gray-100"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="mb-4">
          <FormField label="Estimate Number">
            <InputField value={estimate.estimateNumber || 'N/A'} disabled className="bg-gray-50" />
          </FormField>

          <div className="mt-4">
            <FormField label="Bank Account">
              {!isEditing ? (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                  {selectedAccount ? `${selectedAccount.name} (${selectedAccount.institution || 'Bank'})` : 'No account linked'}
                </div>
              ) : (
                <SelectField
                  value={editForm.accountId}
                  onChange={(e) => handleFormChange('accountId', e.target.value)}
                  options={[
                    { value: '', label: 'No Account selected' },
                    ...bankAccounts.map(acc => ({ value: acc.id || '', label: `${acc.name} (${acc.institution || 'Bank'})` }))
                  ]}
                  placeholder="Select an account for this estimate"
                />
              )}
            </FormField>
          </div>
        </div>

        {/* Customer Information */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Customer</h3>

          {!isEditing ? (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              {estimate.customerName ? (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4.5 h-4.5 text-orange-600" />
                    </div>
                    <h4 className="font-semibold text-gray-900 truncate">{estimate.customerName}</h4>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {estimate.customerEmail && <p className="text-gray-700">{estimate.customerEmail}</p>}
                    {estimate.customerPhone && <p className="text-gray-700">{estimate.customerPhone}</p>}
                    {(estimate.serviceAddress || estimate.serviceCity) && (
                      <p className="text-gray-700 border-t pt-2 mt-1">
                        {estimate.serviceAddress}
                        {estimate.serviceAddress2 && `, ${estimate.serviceAddress2}`}
                        {(estimate.serviceCity || estimate.serviceState || estimate.serviceZipCode) && (
                          <>
                            <br />
                            {estimate.serviceCity}{estimate.serviceCity && (estimate.serviceState || estimate.serviceZipCode) ? ', ' : ''}
                            {estimate.serviceState} {estimate.serviceZipCode}
                          </>
                        )}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-4 text-sm">No customer information</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowClientModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm"
              >
                <UserPlus className="w-4 h-4" />
                Select Client
              </button>

              <FormField label="Customer Name" required>
                <InputField
                  value={editForm.customerName}
                  onChange={(e) => handleFormChange('customerName', e.target.value)}
                  placeholder="Enter customer name"
                />
              </FormField>

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

              <FormField label="Service Address">
                <InputField
                  value={editForm.serviceAddress}
                  onChange={(e) => handleFormChange('serviceAddress', e.target.value)}
                  placeholder="Street Address"
                />
              </FormField>
              <FormField label="Suite / Apt">
                <InputField
                  value={editForm.serviceAddress2}
                  onChange={(e) => handleFormChange('serviceAddress2', e.target.value)}
                  placeholder="Suite, Unit, etc. (Optional)"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="City">
                  <InputField
                    value={editForm.serviceCity}
                    onChange={(e) => handleFormChange('serviceCity', e.target.value)}
                    placeholder="City"
                  />
                </FormField>
                <FormField label="State">
                  <InputField
                    value={editForm.serviceState}
                    onChange={(e) => handleFormChange('serviceState', e.target.value)}
                    placeholder="State"
                  />
                </FormField>
              </div>
              <FormField label="Zip Code">
                <InputField
                  value={editForm.serviceZipCode}
                  onChange={(e) => handleFormChange('serviceZipCode', e.target.value)}
                  placeholder="Zip Code"
                />
              </FormField>
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
          <PictureUploadGrid
            pictures={isEditing ? editForm.pictures : ((estimate as any).pictures || []).map((pic: any, idx: number) => ({
              id: idx.toString(),
              file: null,
              url: pic.url || '',
              description: pic.description || ''
            }))}
            isEditing={isEditing}
            onAdd={addPictureFile}
            onRemove={removePicture}
            onUpdateDescription={(id, description) => updatePicture(id, 'description', description)}
          />
        </div>

        {/* Documents */}
        <div className="border-t pt-4 mt-4">
          <DocumentUploadList
            documents={isEditing ? editForm.documents : ((estimate as any).documents || []).map((doc: any, idx: number) => ({
              id: idx.toString(),
              file: null,
              url: doc.url || '',
              description: doc.description || '',
              fileName: doc.fileName || ''
            }))}
            isEditing={isEditing}
            onAdd={addDocumentFile}
            onRemove={removeDocument}
            onUpdateDescription={(id, description) => updateDocument(id, 'description', description)}
          />
        </div>

        {/* Pricing */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Pricing</h3>

          <div className="space-y-3">
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

            <div className="border-t pt-3">
              <FormField label="Payment Schedule">
                {!isEditing ? (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    {((estimate as any).paymentSchedule?.entries?.length) ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            {(estimate as any).paymentSchedule.mode === 'percentage' ? 'Percentage-based' : 'Amount-based'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(estimate as any).paymentSchedule.entries.length} payment{(estimate as any).paymentSchedule.entries.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {(estimate as any).paymentSchedule.entries.map((entry: any, index: number) => (
                          <div key={entry.id} className="text-sm border-l-2 border-orange-500 pl-3 py-1">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700">{entry.description || `Payment ${index + 1}`}</span>
                              <span className="font-medium text-gray-900">
                                {(estimate as any).paymentSchedule.mode === 'percentage' ? `${entry.value}%` : formatCurrency(entry.value)}
                              </span>
                            </div>
                            {entry.dueDate && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <Calendar className="w-3 h-3" />
                                Due: {new Date(entry.dueDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No payment schedule set</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowPaymentScheduleModal(true)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium"
                      >
                        <Calendar className="w-4 h-4" />
                        {editForm.paymentSchedule?.entries?.length ? 'Edit Schedule' : 'Set Schedule'}
                      </button>
                      {!editForm.paymentSchedule?.entries?.length && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Not set
                        </div>
                      )}
                    </div>

                    {editForm.paymentSchedule && editForm.paymentSchedule.entries.length > 0 && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                        {editForm.paymentSchedule.entries.map((entry, index) => (
                          <div key={entry.id} className="text-sm border-l-2 border-orange-500 pl-3 py-1">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700">{entry.description || `Payment ${index + 1}`}</span>
                              <span className="font-medium text-gray-900">
                                {editForm.paymentSchedule?.mode === 'percentage' ? `${entry.value}%` : formatCurrency(entry.value)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </FormField>
            </div>
          </div>
        </div>

        {/* Valid Until & Notes */}
        <div className="border-t pt-4 mt-4 space-y-4">
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

      {/* Line Items Section (shared with desktop) */}
      <LineItemsSection
        estimate={estimate}
        onUpdate={onUpdate}
        isParentEditing={isEditing}
        onEdit={handleStartEdit}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
        isSaving={isSaving}
      />

      {/* Exit Warning */}
      {showExitWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Unsaved Changes</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              You have unsaved changes. If you exit now, your changes will be lost.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitWarning(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm"
              >
                Continue Editing
              </button>
              <button
                onClick={handleConfirmExit}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium text-sm"
              >
                Lose Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <ClientSelectModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSelectClient={handleSelectClient}
      />

      <PaymentScheduleModal
        isOpen={showPaymentScheduleModal}
        onClose={() => setShowPaymentScheduleModal(false)}
        onSave={(schedule) => handleFormChange('paymentSchedule', schedule)}
        estimateTotal={estimate.total}
        initialSchedule={editForm.paymentSchedule}
      />

      <SendEstimateModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        estimate={estimate}
        onSend={handleSendEstimate}
      />
    </div>
  );
};

export default MobileEstimateTab;
