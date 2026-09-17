import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Edit, Save, X, Trash2, User, UserPlus, AlertCircle, Calendar, Download, Loader2 } from 'lucide-react';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import { calculateEstimateTotals, updateEstimate, formatCurrency, type Estimate } from '../../../../../services/estimates';
import { type Client } from '../../../../../services/clients';
import { subscribeToBankAccounts, type BankAccount } from '../../../../../services/finances/bank';
import { uploadEstimateImages, deleteEstimateImage, uploadEstimateDocuments, deleteEstimateDocument, type Document } from '../../../../../services/estimates/estimates.files';
import { FormField } from '../../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../../mainComponents/forms/InputField';
import { SelectField } from '../../../../../mainComponents/forms/SelectField';
import ClientSelectModal from './ClientSelectModal';
import LineItemsSection from './LineItemsSection';
import PaymentScheduleModal from '../../PaymentScheduleModal';
import { PaymentSchedule } from '../../../../../services/estimates/PaymentScheduleModal.types';
import EstimateActionBox from '../EstimateActionBox';
import { PictureUploadGrid } from '../../../../../components/common/PictureUploadGrid';
import { DocumentUploadList } from '../../../../../components/common/DocumentUploadList';
import { ClientViewDocPreview } from '../clientViewTab/components';
import { downloadElementAsPdf } from '../../../../../utils/pdfExport';

interface Picture {
  id: string;
  file: File | null;
  url: string;
  description: string;
}

interface DocumentWithFile extends Document {
  file?: File;
}

interface EstimateTabProps {
  estimate: Estimate;
  onUpdate: (options?: { showSuccess?: boolean }) => void;
  onCreateChangeOrder?: () => void;
  onConvertToInvoice?: () => void;
}

const EstimateTab: React.FC<EstimateTabProps> = ({ estimate, onUpdate, onCreateChangeOrder, onConvertToInvoice }) => {
  const { currentUser, userProfile, canAccessFeature } = useAuthContext();

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const docPreviewRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!docPreviewRef.current || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      await downloadElementAsPdf(docPreviewRef.current, `Estimate-${estimate.estimateNumber || 'download'}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.alert('Unable to download the PDF. Please check that the company logo loads and try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Note: currentUser is available for future use (e.g., audit logging)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const tabRef = useRef<HTMLDivElement>(null);
  const actionButtonsAnchorRef = useRef<HTMLDivElement>(null);
  const actionButtonsRef = useRef<HTMLDivElement>(null);
  const actionButtonsTrackRef = useRef<HTMLDivElement>(null);
  const actionButtonsEndRef = useRef<HTMLDivElement>(null);
  const pendingScrollRef = useRef<{ element: HTMLElement; top: number; left: number }[]>([]);

  // Size a stationary track only when layout changes. CSS sticky handles all
  // scrolling, including compositor-driven scrolling, without JS position updates.
  useLayoutEffect(() => {
    const anchor = actionButtonsAnchorRef.current;
    const button = actionButtonsRef.current;
    const track = actionButtonsTrackRef.current;
    const end = actionButtonsEndRef.current;
    const tab = tabRef.current;
    if (!anchor || !button || !track || !end || !tab) return;

    const updateTrack = () => {
      const tabRect = tab.getBoundingClientRect();
      const anchorRect = anchor.getBoundingClientRect();
      const endRect = end.getBoundingClientRect();
      const buttonHeight = button.offsetHeight;
      const endTop = endRect.top + (endRect.height - buttonHeight) / 2;
      track.style.top = `${anchorRect.top - tabRect.top}px`;
      track.style.left = `${anchorRect.left - tabRect.left}px`;
      track.style.width = `${anchorRect.width}px`;
      track.style.height = `${Math.max(buttonHeight, endTop - anchorRect.top + buttonHeight)}px`;
    };

    updateTrack();
    const observer = new ResizeObserver(updateTrack);
    observer.observe(tab);
    observer.observe(anchor);
    observer.observe(end);
    observer.observe(button);
    return () => observer.disconnect();
  }, [isEditing]);

  useLayoutEffect(() => {
    if (!isEditing || !pendingScrollRef.current.length) return;
    const restoreScroll = () => {
      pendingScrollRef.current.forEach(({ element, top, left }) => {
        element.scrollTop = top;
        element.scrollLeft = left;
      });
    };
    restoreScroll();
    // Restore again after the populated form has committed, before the next paint.
    const frame = requestAnimationFrame(() => {
      restoreScroll();
      pendingScrollRef.current = [];
    });
    return () => cancelAnimationFrame(frame);
  }, [isEditing]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitWarning, setShowExitWarning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if we've already populated the form to avoid resetting it on estimate updates
  const formPopulatedRef = React.useRef(false);

  // Client modal state
  const [showClientModal, setShowClientModal] = useState(false);
  const [showPaymentScheduleModal, setShowPaymentScheduleModal] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Form state
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
    createdDate: '',
    validUntil: '',
    notes: '',
    accountId: ''
  });

  // Populate form when entering edit mode (only once)
  useLayoutEffect(() => {
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
        createdDate: estimate.createdDate || '',
        validUntil: estimate.validUntil || '',
        notes: estimate.notes || '',
        accountId: estimate.accountId || ''
      });
      setHasUnsavedChanges(false);
      formPopulatedRef.current = true;
    } else if (!isEditing) {
      // Reset the flag when exiting edit mode
      formPopulatedRef.current = false;
    }
  }, [isEditing, estimate]);

  // Subscribe to bank accounts
  useEffect(() => {
    if (currentUser?.uid) {
      const unsubscribe = subscribeToBankAccounts(currentUser.uid, (accounts) => {
        setBankAccounts(accounts);
      });
      return () => unsubscribe();
    }
  }, [currentUser?.uid]);

  // Track changes
  const handleFormChange = <K extends keyof typeof editForm>(field: K, value: typeof editForm[K]) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  // Picture management
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

  // Document management
  const addDocumentFile = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB for documents
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
    handleFormChange('documents', updatedDocuments);
  };

  // Client selection
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

  // Edit mode controls
  const handleStartEdit = () => {
    const positions = [];
    let element = tabRef.current?.parentElement ?? null;
    while (element) {
      positions.push({ element, top: element.scrollTop, left: element.scrollLeft });
      element = element.parentElement;
    }
    pendingScrollRef.current = positions;
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
      // taxRate is stored as a percentage (7 means 7%), while tax is the
      // resulting currency amount. Always send the calculated values together
      // so editing an estimate cannot leave a stale tax amount behind.
      const totals = calculateEstimateTotals(
        estimate.lineItems || [],
        editForm.discount,
        editForm.discountType === 'amount' ? 'fixed' : 'percentage',
        editForm.taxRate
      );

      // Upload new pictures
      let uploadedPictures: any[] = [];
      if (editForm.pictures.length > 0) {
        uploadedPictures = await uploadEstimateImages(editForm.pictures, estimate.id);
      }

      // Upload new documents
      let uploadedDocuments: any[] = [];
      if (editForm.documents.length > 0) {
        uploadedDocuments = await uploadEstimateDocuments(editForm.documents, estimate.id);
      }

      // Prepare update data
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
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        depositType: editForm.depositType,
        depositValue: editForm.depositValue,
        paymentSchedule: editForm.paymentSchedule,
        createdDate: editForm.createdDate,
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

  const actionButtons = isEditing ? (
    <>
      <button
        onClick={handleSaveEdit}
        disabled={isSaving}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
      >
        <Save className="w-4 h-4" />
        {isSaving ? 'Saving...' : 'Save Estimate'}
      </button>
      <button
        onClick={handleCancelEdit}
        disabled={isSaving}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 transition-colors"
      >
        <X className="w-4 h-4" />
        Cancel
      </button>
    </>
  ) : (
    <button
      type="button"
      onClick={handleStartEdit}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium whitespace-nowrap bg-orange-600 text-white rounded-lg shadow-md hover:bg-orange-700 transition-colors"
    >
      <Edit className="w-4 h-4" />
      Edit Estimate
    </button>
  );

  return (
    <div ref={tabRef} className="relative space-y-6" style={{ overflowAnchor: 'none' }}>
      {/* Estimate Action Box */}
      <EstimateActionBox
        estimate={estimate}
        onCreateChangeOrder={onCreateChangeOrder}
        onConvertToInvoice={onConvertToInvoice}
        onUpdate={onUpdate}
      />

      {/* Header with Edit Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Estimate Details</h2>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {downloadingPdf ? 'Preparing...' : 'Download PDF'}
              </button>
            )}
            <div
              ref={actionButtonsAnchorRef}
              aria-hidden="true"
              className="invisible flex shrink-0 items-center gap-2 whitespace-nowrap"
            >
              {actionButtons}
            </div>
            <div
              ref={actionButtonsTrackRef}
              className="absolute z-20 flex flex-col items-start pointer-events-none"
            >
              <div
                ref={actionButtonsRef}
                className="sticky top-4 pointer-events-auto flex items-center gap-2 whitespace-nowrap"
              >
                {actionButtons}
              </div>
            </div>
          </div>
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

          {canAccessFeature('estimates.bankAccount') && (
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
                      ...bankAccounts.map(acc => ({
                        value: acc.id || '',
                        label: `${acc.name} (${acc.institution || 'Bank'})`
                      }))
                    ]}
                    placeholder="Select an account for this estimate"
                  />
                )}
              </FormField>
            </div>
          )}
        </div>

        {/* Estimate Dates */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Date">
              {!isEditing ? (
                <div className="p-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                  {estimate.createdDate ? new Date(`${estimate.createdDate}T00:00:00`).toLocaleDateString() : 'Not set'}
                </div>
              ) : (
                <InputField
                  type="date"
                  value={editForm.createdDate}
                  onChange={(e) => handleFormChange('createdDate', e.target.value)}
                />
              )}
            </FormField>

            <FormField label="Valid Until">
              {!isEditing ? (
                <div className="p-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                  {estimate.validUntil ? new Date(`${estimate.validUntil}T00:00:00`).toLocaleDateString() : 'Not set'}
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
                    {(estimate.serviceAddress || estimate.serviceCity) && (
                      <div className="md:col-span-2 border-t pt-2 mt-1">
                        <p className="text-xs text-gray-500">Service Address</p>
                        <p className="text-gray-900">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <FormField label="Zip Code">
                  <InputField
                    value={editForm.serviceZipCode}
                    onChange={(e) => handleFormChange('serviceZipCode', e.target.value)}
                    placeholder="Zip Code"
                  />
                </FormField>
              </div>
            </div>
          )}
        </div>

        {/* Pictures */}
        <div className="border-t pt-4 mt-4">
          <PictureUploadGrid
            pictures={isEditing ? editForm.pictures : ((estimate as any).pictures || []).map((pic: any, idx: number) => ({ id: pic.id ?? idx.toString(), file: null, url: pic.url || '', description: pic.description || '' }))}
            isEditing={isEditing}
            onAdd={addPictureFile}
            onRemove={removePicture}
            onUpdateDescription={(id, description) => updatePicture(id, 'description', description)}
          />
        </div>

        {/* Documents */}
        <div className="border-t pt-4 mt-4">
          <DocumentUploadList
            documents={isEditing ? editForm.documents : ((estimate as any).documents || []).map((doc: any, idx: number) => ({ id: doc.id ?? idx.toString(), file: null, url: doc.url || '', fileName: doc.fileName || '', description: doc.description || '' }))}
            isEditing={isEditing}
            onAdd={addDocumentFile}
            onRemove={removeDocument}
            onUpdateDescription={(id, description) => updateDocument(id, 'description', description)}
          />
        </div>

        {/* Notes and totals */}
        <div className="border-t pt-4 mt-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField label="Notes">
              {!isEditing ? (
                <div className="min-h-48 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
                  {estimate.notes || 'No notes'}
                </div>
              ) : (
                <textarea
                  value={editForm.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  placeholder="Additional notes for this estimate..."
                  rows={8}
                  className="h-full w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              )}
            </FormField>

            <div>
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

            <div className="border-t pt-3">
              <FormField label="Payment Schedule">
                {!isEditing ? (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    {((estimate as any).paymentSchedule?.entries?.length) ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            {(estimate as any).paymentSchedule.mode === 'percentage' ? 'Percentage-based' : 'Amount-based'} Schedule
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
                                {(estimate as any).paymentSchedule.mode === 'percentage'
                                  ? `${entry.value}%`
                                  : formatCurrency(entry.value)
                                }
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
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowPaymentScheduleModal(true)}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                      >
                        <Calendar className="w-4 h-4" />
                        {editForm.paymentSchedule?.entries?.length ? 'Edit Payment Schedule' : 'Set Payment Schedule'}
                      </button>

                      {!editForm.paymentSchedule?.entries?.length && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Not set
                        </div>
                      )}
                    </div>

                    {editForm.paymentSchedule && editForm.paymentSchedule.entries.length > 0 ? (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-700">
                            {editForm.paymentSchedule.mode === 'percentage' ? 'Percentage-based' : 'Amount-based'} Schedule
                          </span>
                          <span className="text-xs text-gray-500">
                            {editForm.paymentSchedule.entries.length} payment{editForm.paymentSchedule.entries.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {editForm.paymentSchedule.entries.map((entry, index) => (
                          <div key={entry.id} className="text-sm border-l-2 border-orange-500 pl-3 py-1">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-700">{entry.description || `Payment ${index + 1}`}</span>
                              <span className="font-medium text-gray-900">
                                {editForm.paymentSchedule?.mode === 'percentage'
                                  ? `${entry.value}%`
                                  : formatCurrency(entry.value)
                                }
                              </span>
                            </div>
                            {entry.dueDate && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <Calendar className="w-3 h-3" />
                                Due: {new Date(entry.dueDate + 'T00:00:00').toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </FormField>
            </div>
          </div>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Section */}
      <LineItemsSection
        estimate={estimate}
        onUpdate={onUpdate}
        isParentEditing={isEditing}
        onEdit={handleStartEdit}
        hideEditButton
        hideParentEditButtons
        actionHeaderRef={actionButtonsEndRef}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
        isSaving={isSaving}
      />

      {/* Second Estimate Action Box at the bottom */}
      <div className="mt-6">
        <EstimateActionBox
          estimate={estimate}
          onCreateChangeOrder={onCreateChangeOrder}
          onConvertToInvoice={onConvertToInvoice}
          onUpdate={onUpdate}
        />
      </div>

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

      {/* Hidden client-view document used to generate the downloadable PDF */}
      <div className="fixed left-[-9999px] top-0 w-[850px]" aria-hidden="true">
        <div ref={docPreviewRef}>
          <ClientViewDocPreview
            estimate={estimate}
            settings={estimate.clientViewSettings || {
              displayMode: 'list',
              showItemPrices: true,
              showGroupPrices: true,
              showSubtotal: true,
              showTax: true,
              showTotal: true,
              hiddenLineItems: []
            }}
            groups={estimate.groups || []}
            companyInfo={{
              companyName: userProfile?.company,
              address: userProfile?.address,
              city: userProfile?.city,
              state: userProfile?.state,
              zipCode: userProfile?.zipCode,
              logoUrl: userProfile?.companyLogo,
              phone: userProfile?.phone,
              website: userProfile?.website,
              email: userProfile?.email,
              licenses: userProfile?.licenses
            }}
          />
        </div>
      </div>

      {/* Client Select Modal */}
      <ClientSelectModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSelectClient={handleSelectClient}
      />

      {/* Payment Schedule Modal */}
      <PaymentScheduleModal
        isOpen={showPaymentScheduleModal}
        onClose={() => setShowPaymentScheduleModal(false)}
        onSave={(schedule) => handleFormChange('paymentSchedule', schedule)}
        estimateTotal={estimate.total}
        initialSchedule={editForm.paymentSchedule}
      />
    </div>
  );
};

export default EstimateTab;
