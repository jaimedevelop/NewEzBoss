import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, AlertCircle, Calendar, Download, Loader2, Check, Lock } from 'lucide-react';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import { formatCurrency, type Estimate } from '../../../../../services/estimates';
import { type Client } from '../../../../../services/clients';
import { subscribeToBankAccounts, type BankAccount } from '../../../../../services/finances/bank';
import { uploadEstimateImages, deleteEstimateImage, uploadEstimateDocuments, deleteEstimateDocument } from '../../../../../services/estimates/estimates.files';
import { FormField } from '../../../../../mainComponents/forms/FormField';
import { SelectField } from '../../../../../mainComponents/forms/SelectField';
import { AutosaveInput, AutosaveSelect, AutosaveControl } from '../../../../../mainComponents/forms/AutosaveInput';
import { AutosaveRegistryContext, useAutosaveField, type SaveResult } from '../../../../../mainComponents/forms/useAutosaveField';
import ClientSelectModal from './ClientSelectModal';
import EstimateClientModal from '../../EstimateClientModal';
import { getLaunchProjects } from '../../../../../services/projects/projects.api';
import LineItemsSection from './LineItemsSection';
import { useEstimateAutosave, type EstimateAutosave, type SaveStatus } from './useEstimateAutosave';
import PaymentScheduleModal, { applyDepositToPaymentSchedule, convertDepositValue, type DepositType } from '../../PaymentScheduleModal';
import { PaymentSchedule } from '../../../../../services/estimates/PaymentScheduleModal.types';
import EstimateActionBox from '../EstimateActionBox';
import { PictureUploadGrid } from '../../../../../components/common/PictureUploadGrid';
import { DocumentUploadList } from '../../../../../components/common/DocumentUploadList';
import { ClientViewDocPreview } from '../clientViewTab/components';
import { downloadElementAsPdf } from '../../../../../utils/pdfExport';
import AutoSaveIndicator from '../../../../settings/components/AutoSaveIndicator';
import { getDocumentIdentity } from '../../../../../services/estimates/documentIdentity';

interface EstimateTabProps {
  estimate: Estimate;
  autosave?: EstimateAutosave;
  onOptimisticUpdate?: (patch: Partial<Estimate>) => void;
  onUpdate: (options?: { showSuccess?: boolean }) => void | Promise<void>;
  onCreateChangeOrder?: () => void;
  onConvertToInvoice?: () => void;
  isIssuingInvoice?: boolean;
  onShareDialogOpenChange?: (open: boolean) => void;
}

type ValidityPeriod = 'twoWeeks' | 'oneMonth' | 'threeMonths';

const getValidUntilDate = (estimateDate: string, period: ValidityPeriod) => {
  const date = estimateDate ? new Date(`${estimateDate}T00:00:00`) : new Date();

  if (period === 'twoWeeks') {
    date.setDate(date.getDate() + 14);
  } else {
    date.setMonth(date.getMonth() + (period === 'oneMonth' ? 1 : 3));
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Numeric drafts stay strings while typing so "1." isn't rewritten.
const decimalFilter = (value: string) => value === '' || /^\d*\.?\d{0,2}$/.test(value);
const clampTo = (max?: number) => (draft: string) => {
  const parsed = parseFloat(draft);
  if (!Number.isFinite(parsed)) return '0';
  return String(Math.min(max ?? Infinity, Math.max(0, parsed)));
};

const clampToPlaceholder = (max?: number) => (draft: string) => {
  const value = clampTo(max)(draft);
  return value === '0' ? '' : value;
};

const scheduleKey = (schedule: PaymentSchedule | null | undefined) =>
  schedule ? JSON.stringify([schedule.mode, schedule.entries.map(e => [e.description, e.value, e.dueDate || ''])]) : 'none';

// A picked file shows immediately (blob URL) and is swapped for the server copy.
interface LocalFile {
  id: string;
  file: File | null;
  url: string;
  description: string;
  fileName?: string;
}

const SaveIndicator: React.FC<{ status: SaveStatus; message: string | null; onRetry: () => void }> = ({ status, message, onRetry }) => (
  <div role="status" aria-live="polite" className="text-xs">
    {status === 'saving' && (
      <span className="inline-flex items-center gap-1.5 text-gray-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Saving…
      </span>
    )}
    {status === 'saved' && (
      <span className="inline-flex items-center gap-1.5 text-green-600">
        <Check className="w-3.5 h-3.5" />
        Saved
      </span>
    )}
    {status === 'error' && (
      <span className="text-red-600" title={message ?? undefined}>
        Couldn't save –{' '}
        <button type="button" onClick={onRetry} className="font-medium underline hover:text-red-800">
          Retry
        </button>
      </span>
    )}
  </div>
);

const EstimateTab: React.FC<EstimateTabProps> = ({ estimate, onUpdate, autosave: sharedAutosave, onOptimisticUpdate, onCreateChangeOrder, onConvertToInvoice, isIssuingInvoice, onShareDialogOpenChange }) => {
  const { currentUser, userProfile, canAccessFeature } = useAuthContext();
  const ownAutosave = useEstimateAutosave(estimate.id, onUpdate, onOptimisticUpdate);
  const autosave = sharedAutosave ?? ownAutosave;
  const sectionStatus = (...fields: string[]): SaveStatus => {
    const statuses = fields.map(field => autosave.fieldStatuses[field] ?? 'idle');
    return statuses.includes('saving') ? 'saving' : statuses.includes('error') ? 'error' : statuses.includes('saved') ? 'saved' : 'idle';
  };

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const docPreviewRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!docPreviewRef.current || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      await downloadElementAsPdf(docPreviewRef.current, getDocumentIdentity(estimate).exportFilename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      window.alert('Unable to download the PDF. Please check that the company logo loads and try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Sent/approved documents remain editable while reapproval is being redesigned.
  const readOnly = Boolean(estimate.archivedAt);
  const financialLocked = readOnly;

  // Client modal state
  const [showClientModal, setShowClientModal] = useState(false);
  const [replacementClient, setReplacementClient] = useState<Client | null>(null);
  const [isChangingClient, setIsChangingClient] = useState(false);
  const [showPaymentScheduleModal, setShowPaymentScheduleModal] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [projectsError, setProjectsError] = useState(false);
  useEffect(() => {
    if (!canAccessFeature('estimates.projectSelection')) return;
    let active = true;
    getLaunchProjects().then(result => {
      if (!active) return;
      if (result.success) setProjects(result.data || []);
      else setProjectsError(true);
    }).catch(() => { if (active) setProjectsError(true); });
    return () => { active = false; };
  }, [currentUser?.uid, canAccessFeature]);

  // Subscribe to bank accounts
  useEffect(() => {
    if (currentUser?.uid) {
      const unsubscribe = subscribeToBankAccounts(currentUser.uid, (accounts) => {
        setBankAccounts(accounts);
      });
      return () => unsubscribe();
    }
  }, [currentUser?.uid]);

  // A text field that saves one column on blur.
  const commitField = (field: string, toValue: (draft: string) => unknown = (draft) => draft) =>
    (draft: string): Promise<SaveResult> => autosave.save({ [field]: toValue(draft) });

  // Dates: the validity buttons and the date inputs share one draft.
  const createdDateField = useAutosaveField({
    value: estimate.createdDate || '',
    onCommit: commitField('createdDate'),
    validate: (next) => (next ? null : 'A date is required.'),
    debounceMs: 700,
    disabled: readOnly
  });
  const validUntilField = useAutosaveField({
    value: estimate.validUntil || '',
    onCommit: commitField('validUntil', (draft) => draft || null),
    debounceMs: 700,
    disabled: readOnly
  });
  const selectedValidityPeriod = (['twoWeeks', 'oneMonth', 'threeMonths'] as const)
    .find(period => getValidUntilDate(createdDateField.draft, period) === validUntilField.draft) ?? null;

  const applyValidityPeriod = (period: ValidityPeriod) => {
    validUntilField.commitValue(getValidUntilDate(createdDateField.draft, period));
  };

  // Deposit type and value aren't stored on the estimate; they live in the
  // payment schedule's "Deposit" entry, so they are derived from it.
  const schedule: PaymentSchedule | null = estimate.paymentSchedule ?? null;
  const depositEntry = schedule?.entries.find(entry => entry.description.trim().toLowerCase() === 'deposit');
  const derivedDepositType: DepositType = depositEntry ? (schedule?.mode === 'percentage' ? 'percentage' : 'amount') : 'none';
  const derivedDepositValue = depositEntry?.value ?? 0;
  const [depositType, setDepositType] = useState<DepositType>(derivedDepositType);
  useEffect(() => {
    if (autosave.status !== 'saving') setDepositType(derivedDepositType);
  }, [derivedDepositType, autosave.status]);

  const saveDeposit = (type: DepositType, value: number): Promise<SaveResult> => {
    // Send the re-derived schedule; the server checks it sums to the total.
    const next = applyDepositToPaymentSchedule(schedule, type, value, estimate.total);
    if (scheduleKey(next) === scheduleKey(schedule)) return Promise.resolve({ ok: true, skipped: true });
    return autosave.save({ paymentSchedule: next });
  };

  const changeDepositType = (type: DepositType) => {
    const value = convertDepositValue(derivedDepositValue, derivedDepositType, type, estimate.total);
    setDepositType(type);
    void saveDeposit(type, value);
  };

  // Pictures and documents upload as soon as they're picked.
  const [pendingPictures, setPendingPictures] = useState<LocalFile[]>([]);
  const [pictureOrder, setPictureOrder] = useState<string[] | null>(null);
  const pictureOrderRef = useRef<string[] | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<LocalFile[]>([]);
  const [removedFileIds, setRemovedFileIds] = useState<Set<string>>(new Set());
  const cancelledUploads = useRef(new Set<string>());
  const descriptionOverrides = useRef<Record<string, string>>({});
  const [, forceRender] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const serverPictures = estimate.pictures ?? [];
  const serverDocuments = estimate.documents ?? [];

  // Once a refetch includes a file (or an override), the local copy can go.
  useEffect(() => {
    setPendingPictures(prev => {
      const next = prev.filter(p => !serverPictures.some(sp => sp.id === p.id));
      return next.length === prev.length ? prev : next;
    });
    setPendingDocuments(prev => {
      const next = prev.filter(d => !serverDocuments.some(sd => sd.id === d.id));
      return next.length === prev.length ? prev : next;
    });
    setRemovedFileIds(prev => {
      const stillThere = new Set([...serverPictures, ...serverDocuments].map(f => f.id));
      const next = new Set([...prev].filter(id => stillThere.has(id)));
      return next.size === prev.size ? prev : next;
    });
    const desiredOrder = pictureOrderRef.current;
    if (desiredOrder) {
      const desiredServerOrder = desiredOrder.filter(id => !id.startsWith('tmp-') && serverPictures.some(picture => picture.id === id));
      const serverOrder = serverPictures.map(picture => picture.id);
      if (desiredServerOrder.length === serverOrder.length && desiredServerOrder.every((id, index) => id === serverOrder[index])) {
        pictureOrderRef.current = null;
        setPictureOrder(null);
      }
    }
    const overrides = descriptionOverrides.current;
    Object.keys(overrides).forEach((key) => {
      const [kind, id] = [key[0], key.slice(2)];
      const file = (kind === 'p' ? serverPictures : serverDocuments).find(f => f.id === id);
      if (!file || file.description === overrides[key]) delete overrides[key];
    });
  }, [estimate.pictures, estimate.documents]);

  const withOverrides = <T extends LocalFile>(kind: 'p' | 'd', files: T[]): T[] =>
    files
      .filter(file => !removedFileIds.has(file.id))
      .map(file => {
        const override = descriptionOverrides.current[`${kind}:${file.id}`];
        return override === undefined ? file : { ...file, description: override };
      });

  const pictures = withOverrides<LocalFile>('p', [
    ...serverPictures.map(p => ({ id: p.id, file: null, url: p.url, description: p.description })),
    // A refetch can land before the prune effect below has run.
    ...pendingPictures.filter(p => !serverPictures.some(sp => sp.id === p.id))
  ]).sort((a, b) => {
    if (!pictureOrder) return 0;
    const aIndex = pictureOrder.indexOf(a.id);
    const bIndex = pictureOrder.indexOf(b.id);
    return (aIndex < 0 ? Number.MAX_SAFE_INTEGER : aIndex) - (bIndex < 0 ? Number.MAX_SAFE_INTEGER : bIndex);
  });
  const documents = withOverrides<LocalFile>('d', [
    ...serverDocuments.map(d => ({ id: d.id, file: null, url: d.url, description: d.description, fileName: d.fileName })),
    ...pendingDocuments.filter(d => !serverDocuments.some(sd => sd.id === d.id))
  ]);

  const uploadFiles = (kind: 'picture' | 'document', files: File[]) => {
    if (!estimate.id || files.length === 0) return;
    const stamp = Date.now();
    const entries: LocalFile[] = files.map((file, index) => ({
      id: `tmp-${stamp}-${index}`,
      // Preserve the selected File on the optimistic entry so its upload
      // confirmation can appear as soon as the preview is added.
      file,
      url: URL.createObjectURL(file),
      description: '',
      fileName: kind === 'document' ? file.name : undefined
    }));
    const setPending = kind === 'picture' ? setPendingPictures : setPendingDocuments;
    setPending(prev => [...prev, ...entries]);
    setUploadError(null);

    void autosave.run(`upload-${kind}-${entries[0].id}`, async () => {
      const live = entries.map((entry, index) => ({ entry, file: files[index] })).filter(({ entry }) => !cancelledUploads.current.has(entry.id));
      if (live.length === 0) return { ok: true, skipped: true };
      try {
        const payload = live.map(({ entry, file }) => ({ id: entry.id, file, url: entry.url, description: '', fileName: entry.fileName }));
        const uploaded = kind === 'picture'
          ? await uploadEstimateImages(payload, estimate.id!)
          : await uploadEstimateDocuments(payload, estimate.id!);
        setPending(prev => prev.map((existing) => {
          const index = live.findIndex(({ entry }) => entry.id === existing.id);
          const result = index >= 0 ? uploaded[index] : undefined;
          if (!result) return existing;
          URL.revokeObjectURL(existing.url);
          // Keeping the File lets the grid show its brief "uploaded" badge.
          // The API returns the raw row, so the id is a number at runtime.
          const serverId = String(result.id);
          if (kind === 'picture' && pictureOrderRef.current?.includes(existing.id)) {
            const nextOrder = pictureOrderRef.current.map(id => id === existing.id ? serverId : id);
            pictureOrderRef.current = nextOrder;
            setPictureOrder(nextOrder);
          }
          return { id: serverId, file: live[index].file, url: result.url, description: '', fileName: (result as { fileName?: string }).fileName ?? existing.fileName };
        }));
        setUploadError(null);
        return { ok: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setUploadError(`Couldn't upload ${kind === 'picture' ? 'the picture' : 'the document'}: ${message}`);
        return { ok: false, message };
      }
    });
  };

  const removeFile = (kind: 'picture' | 'document', id: string) => {
    const list = kind === 'picture' ? pictures : documents;
    const file = list.find(f => f.id === id);
    if (!file) return;
    const setPending = kind === 'picture' ? setPendingPictures : setPendingDocuments;
    if (id.startsWith('tmp-')) {
      // Still uploading (or failed): drop it and skip the upload.
      cancelledUploads.current.add(id);
      setPending(prev => prev.filter(p => p.id !== id));
      return;
    }
    setPending(prev => prev.filter(p => p.id !== id));
    setRemovedFileIds(prev => new Set(prev).add(id));
    if (!estimate.id) return;
    void autosave.run(`remove-${kind}-${id}`, async () => {
      if (kind === 'picture') await deleteEstimateImage(file.url, estimate.id!);
      else await deleteEstimateDocument(file.url, estimate.id!);
      return { ok: true };
    });
  };

  const updateFileDescription = (kind: 'picture' | 'document', id: string, description: string) => {
    if (id.startsWith('tmp-')) return;
    const key = kind === 'picture' ? 'p' : 'd';
    descriptionOverrides.current[`${key}:${id}`] = description;
    forceRender(n => n + 1);
    // The API only syncs descriptions for files that already exist.
    const list = (kind === 'picture' ? withOverrides('p', pictures) : withOverrides('d', documents)).filter(f => !f.id.startsWith('tmp-'));
    if (kind === 'picture') {
      void autosave.save({ pictures: list.map((f, sortOrder) => ({ id: f.id, url: f.url, description: f.description, sortOrder })) });
    } else {
      void autosave.save({ documents: list.map(f => ({ id: f.id, url: f.url, description: f.description, fileName: f.fileName })) });
    }
  };

  const reorderPictures = (activeId: string, overId: string, edge: 'before' | 'after') => {
    const from = pictures.findIndex(picture => picture.id === activeId);
    const to = pictures.findIndex(picture => picture.id === overId);
    if (from < 0 || to < 0 || from === to) return;
    const reordered = [...pictures];
    const [moved] = reordered.splice(from, 1);
    const targetIndex = reordered.findIndex(picture => picture.id === overId);
    reordered.splice(targetIndex + (edge === 'after' ? 1 : 0), 0, moved);
    const persisted = reordered.filter(picture => !picture.id.startsWith('tmp-'));
    if (persisted.length < 2) return;
    // Reorder optimistically while the PATCH and subsequent refetch complete.
    const nextOrder = reordered.map(picture => picture.id);
    pictureOrderRef.current = nextOrder;
    setPictureOrder(nextOrder);
    void autosave.save({ pictures: reordered
      .filter(picture => !picture.id.startsWith('tmp-'))
      .map((picture, sortOrder) => ({ id: picture.id, url: picture.url, description: picture.description, sortOrder })) });
  };

  const addDocumentFile = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB for documents
    if (file.size > maxSize) {
      setUploadError('Document file size must be less than 10MB.');
      return;
    }
    uploadFiles('document', [file]);
  };

  // Client selection saves every customer column as one PATCH.
  const handleSelectClient = (client: Client) => {
    if (isChangingClient) {
      // Start the estimate reassignment now so the tab refreshes behind the
      // editor. The editor remains open until its own client update is saved.
      void autosave.save({
        customerId: client.id,
        customerName: client.name || '',
        customerEmail: client.email || '',
        customerPhone: client.phoneMobile || client.phoneOther || '',
        serviceAddress: client.serviceAddress || client.billingAddress || '',
        serviceAddress2: client.serviceAddress2 || client.billingAddress2 || '',
        serviceCity: client.serviceCity || client.billingCity || '',
        serviceState: client.serviceState || client.billingState || '',
        serviceZipCode: client.serviceZipCode || client.billingZipCode || '',
      });
      setReplacementClient(client);
      setIsChangingClient(false);
      setShowEditClientModal(true);
      return;
    }
    void autosave.save({
      customerId: client.id,
      customerName: client.name || '',
      customerEmail: client.email || '',
      customerPhone: client.phoneMobile || client.phoneOther || '',
      serviceAddress: client.serviceAddress || client.billingAddress || '',
      serviceAddress2: client.serviceAddress2 || client.billingAddress2 || '',
      serviceCity: client.serviceCity || client.billingCity || '',
      serviceState: client.serviceState || client.billingState || '',
      serviceZipCode: client.serviceZipCode || client.billingZipCode || ''
    });
    setShowClientModal(false);
  };

  const discountTypeField = useAutosaveField({
    value: estimate.discountType || 'percentage',
    onCommit: commitField('discountType'), disabled: financialLocked,
  });
  const discountIsPercent = discountTypeField.draft !== 'fixed';
  const discountField = useAutosaveField({
    value: estimate.discount ? String(estimate.discount) : '', onCommit: commitField('discount', Number),
    normalize: clampToPlaceholder(discountIsPercent ? 100 : undefined), disabled: financialLocked,
  });
  const [taxRateInputError, setTaxRateInputError] = useState<string | null>(null);
  const taxRateField = useAutosaveField({
    value: estimate.taxRate ? String(estimate.taxRate) : '', onCommit: commitField('taxRate', Number),
    validate: next => Number.isFinite(Number(next)) && Number(next) >= 0 && Number(next) <= 100
      ? null : 'Tax rate amount must be within 0-100.',
    disabled: financialLocked,
  });
  const discount = Number(clampTo(discountIsPercent ? 100 : undefined)(discountField.draft));
  const taxRate = Number(clampTo(100)(taxRateField.draft));
  const discountAmount = discountIsPercent ? estimate.subtotal * discount / 100 : discount;
  const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
  const tax = money((estimate.subtotal - discountAmount) * taxRate / 100);
  const total = money(estimate.subtotal - discountAmount + tax);
  const isInvoice = estimate.estimateState === 'invoice';
  const documentNumberField = isInvoice ? 'invoiceNumber' : 'estimateNumber';
  const documentNumberLabel = isInvoice ? 'Invoice Number' : 'Estimate Number';
  const documentNumberPlaceholder = isInvoice ? 'Enter an invoice number' : 'Enter an estimate number';
  const scheduleEntries = schedule?.entries ?? [];
  const saveDiscountType = (discountType: 'percentage' | 'fixed') =>
    discountTypeField.commitValue(discountType);

  return (
    <AutosaveRegistryContext.Provider value={autosave.registerFlusher}>
    <div className="relative space-y-4" style={{ overflowAnchor: 'none' }}>
      {/* Keep the document status and primary actions available above the details. */}
      <EstimateActionBox
        estimate={estimate}
        onCreateChangeOrder={onCreateChangeOrder}
        onConvertToInvoice={onConvertToInvoice}
        isIssuingInvoice={isIssuingInvoice}
        onShareDialogOpenChange={onShareDialogOpenChange}
        onUpdate={onUpdate}
      />

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{isInvoice ? 'Invoice Details' : 'Estimate Details'}</h2>
          <div className="flex items-center gap-3">
            <SaveIndicator status={autosave.status} message={autosave.errorMessage} onRetry={autosave.retry} />
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloadingPdf ? 'Preparing...' : 'Download PDF'}
            </button>
          </div>
        </div>

        {readOnly && (
          <div className="mb-4 flex items-start gap-3 p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800">
            <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            This document is archived, so it can no longer be edited.
          </div>
        )}
        {uploadError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {uploadError}
            {autosave.status === 'error' && (
              <button type="button" onClick={autosave.retry} className="ml-2 font-medium underline">Retry</button>
            )}
          </div>
        )}

        {/* Document Number */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label={documentNumberLabel}>
            <AutosaveInput
              value={isInvoice ? estimate.invoiceNumber || '' : estimate.estimateNumber || ''}
              onCommit={commitField(documentNumberField, (draft) => draft.trim())}
              validate={(next) => (next.trim() ? null : `${isInvoice ? 'Invoice' : 'Estimate'} number is required.`)}
              placeholder={documentNumberPlaceholder}
              readOnly={readOnly}
            />
          </FormField>

          <FormField label="P.O. Number">
            <AutosaveInput
              value={estimate.poNumber || ''}
              onCommit={commitField('poNumber', (draft) => draft.trim())}
              placeholder="Enter a P.O. number"
              readOnly={readOnly}
            />
          </FormField>

          {canAccessFeature('estimates.bankAccount') && (
            <div>
              <FormField label="Bank Account">
                <AutosaveSelect
                  value={estimate.accountId || ''}
                  onCommit={commitField('accountId', (draft) => draft || null)}
                  options={[
                    { value: '', label: 'No Account selected' },
                    ...bankAccounts.map(acc => ({
                      value: acc.id || '',
                      label: `${acc.name} (${acc.institution || 'Bank'})`
                    }))
                  ]}
                  placeholder="Select an account for this estimate"
                  readOnly={readOnly}
                />
              </FormField>
            </div>
          )}
          {canAccessFeature('estimates.projectSelection') && <FormField label="Project">
            <AutosaveSelect value={estimate.projectId || ''} onCommit={commitField('projectId', draft => draft || null)} readOnly={readOnly || projectsError} options={[
              { value: '', label: 'Independent Estimate (No Project)' },
              ...(estimate.projectId && !projects.some(project => project.id === estimate.projectId) ? [{ value: estimate.projectId, label: 'Current project' }] : []),
              ...projects.map(project => ({ value: project.id, label: project.name }))
            ]} />
            {projectsError && <p className="text-xs text-red-600">Unable to load projects. Refresh to try again.</p>}
          </FormField>}
        </div>

        {/* Estimate Dates */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Date">
              <AutosaveControl field={createdDateField} type="date" readOnly={readOnly} />
            </FormField>

            <FormField label="Valid Until" className="relative">
                {!readOnly && (
                  <div className="absolute -top-2 right-0 flex items-center gap-1" role="group" aria-label="Estimate validity period">
                    {([
                      ['twoWeeks', '2 Weeks'],
                      ['oneMonth', '1 Month'],
                      ['threeMonths', '3 Months']
                    ] as const).map(([period, label]) => {
                      const isSelected = selectedValidityPeriod === period;
                      return (
                        <button
                          key={period}
                          type="button"
                          onClick={() => applyValidityPeriod(period)}
                          aria-pressed={isSelected}
                          className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${isSelected
                            ? 'border-orange-500 bg-white text-orange-600 hover:bg-orange-50'
                            : 'border-transparent bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              <AutosaveControl field={validUntilField} type="date" readOnly={readOnly} />
            </FormField>
            <FormField label="Client">
              <button type="button" onClick={() => estimate.customerName ? setShowEditClientModal(true) : setShowClientModal(true)} disabled={readOnly && !estimate.customerName} className="flex w-full items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-left hover:border-orange-500 disabled:opacity-50">
                <UserPlus className="h-4 w-4 shrink-0 text-orange-600" />
                <span className="truncate">{estimate.customerName || 'Select Client'}</span>
                {estimate.customerName && <span className="ml-auto shrink-0 text-xs text-orange-600">{readOnly ? 'View' : 'Edit Client'}</span>}
              </button>
            </FormField>
          </div>
        </div>

        {/* Project Description */}
        <div className="border-t pt-4 mt-4">
          <FormField label="Description">
            <AutosaveInput
              multiline
              value={estimate.projectDescription || ''}
              onCommit={commitField('projectDescription')}
              placeholder="Describe the work to be performed..."
              rows={2}
              readOnly={readOnly}
            />
          </FormField>
        </div>

      </div>
      {/* Line Items Section */}
      <LineItemsSection
        estimate={estimate}
        onUpdate={onUpdate}
        autosave={autosave}
        onOptimisticUpdate={onOptimisticUpdate}
        showTotals={false}
      />

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div>
          <div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium text-gray-700">Notes</span><AutoSaveIndicator status={sectionStatus('notes')} /></div>
          <FormField label="">
            <AutosaveInput
              multiline
              value={estimate.notes || ''}
              onCommit={commitField('notes')}
              placeholder="Additional notes for this estimate..."
              rows={2}
              readOnly={readOnly}
            />
          </FormField>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
        <section>
          <h3 className="text-md mb-4 font-medium text-gray-900">Pricing<AutoSaveIndicator status={sectionStatus('discount', 'discountType', 'taxRate', 'paymentSchedule')} /></h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {/* The server derives subtotal, tax and total from these; only the inputs are sent. */}
                  <FormField label={discountIsPercent ? 'Discount (%)' : 'Discount ($)'}>
                    <div className="flex gap-2">
                      <AutosaveControl
                        inputMode="decimal"
                        field={discountField}
                        placeholder="0"
                        filter={decimalFilter}
                        readOnly={financialLocked}
                      />
                      <div className="flex shrink-0 overflow-hidden rounded-md border border-orange-600">
                        {(['percentage', 'fixed'] as const).map(type => (
                          <button key={type} type="button" disabled={financialLocked} onClick={() => { void saveDiscountType(type); }} aria-label={`Use ${type === 'percentage' ? 'percentage' : 'dollar'} discount`} className={`w-10 text-lg font-semibold transition-colors ${discountIsPercent === (type === 'percentage') ? 'bg-orange-600 text-white' : 'bg-white text-orange-600 hover:bg-orange-50'} disabled:cursor-default disabled:opacity-60`}>
                            {type === 'percentage' ? '%' : '$'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </FormField>

                  <FormField label="Deposit Type">
                    <SelectField
                      value={depositType}
                      disabled={financialLocked}
                      onChange={(e) => {
                        const type = e.target.value as DepositType;
                        changeDepositType(type);
                      }}
                      className={financialLocked ? 'bg-gray-50 text-gray-700 cursor-default' : 'hover:border-gray-400'}
                      options={[
                        { value: 'none', label: 'No Deposit' },
                        { value: 'percentage', label: 'Percentage' },
                        { value: 'amount', label: 'Amount' }
                      ]}
                    />
                  </FormField>

                  {depositType !== 'none' && (
                    <FormField label={depositType === 'percentage' ? 'Deposit (%)' : 'Deposit Amount ($)'}>
                      <div className="flex gap-2">
                        <AutosaveInput
                          inputMode="decimal"
                          value={derivedDepositValue ? String(derivedDepositValue) : ''}
                          placeholder="0"
                          onCommit={(draft) => saveDeposit(depositType, Number(draft))}
                          normalize={clampToPlaceholder(depositType === 'percentage' ? 100 : estimate.total)}
                          filter={decimalFilter}
                          readOnly={financialLocked}
                        />
                        <div className="flex shrink-0 overflow-hidden rounded-md border border-orange-600">
                          {(['percentage', 'amount'] as const).map(type => (
                            <button key={type} type="button" disabled={financialLocked} onClick={() => changeDepositType(type)} aria-label={`Use ${type === 'percentage' ? 'percentage' : 'dollar'} deposit`} className={`w-10 text-lg font-semibold transition-colors ${depositType === type ? 'bg-orange-600 text-white' : 'bg-white text-orange-600 hover:bg-orange-50'} disabled:cursor-default disabled:opacity-60`}>
                              {type === 'percentage' ? '%' : '$'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </FormField>
                  )}

                  <FormField label="Tax Rate (%)">
                    <AutosaveControl
                      inputMode="decimal"
                      field={{ ...taxRateField, error: taxRateInputError || taxRateField.error,
                        canRetry: !taxRateInputError && taxRateField.canRetry }}
                      placeholder="0"
                      filter={next => {
                        if (next.length > 3 || !Number.isFinite(Number(next)) || Number(next) < 0 || Number(next) > 100) {
                          setTaxRateInputError('Tax rate amount must be within 0-100.');
                          return false;
                        }
                        if (!decimalFilter(next)) return false;
                        setTaxRateInputError(null);
                        return true;
                      }}
                      readOnly={financialLocked}
                    />
                  </FormField>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-6 border-t pt-6 lg:grid-cols-2">
          <section className="min-w-0">
            <h3 className="text-md mb-4 font-medium text-gray-900">Payment Schedule<AutoSaveIndicator status={sectionStatus('paymentSchedule')} /></h3>
            <div className="space-y-4">
                      {!financialLocked && (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setShowPaymentScheduleModal(true)}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                          >
                            <Calendar className="w-4 h-4" />
                            {scheduleEntries.length ? 'Edit Payment Schedule' : 'Set Payment Schedule'}
                          </button>

                          {!scheduleEntries.length && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Not set
                            </div>
                          )}
                        </div>
                      )}

                      {schedule && scheduleEntries.length > 0 ? (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                          <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
                            <span className="text-sm font-medium text-gray-700">
                              {schedule.mode === 'percentage' ? 'Percentage-based' : 'Amount-based'} Schedule
                            </span>
                            <span className="text-xs text-gray-500">
                              {scheduleEntries.length} payment{scheduleEntries.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          {scheduleEntries.map((entry, index) => (
                            <div key={entry.id} className="text-sm border-l-2 border-orange-500 pl-3 py-1">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-700">{entry.description || `Payment ${index + 1}`}</span>
                                <span className="font-medium text-gray-900">
                                  {schedule.mode === 'percentage'
                                    ? `${entry.value}%`
                                    : formatCurrency(entry.value)
                                  }
                                  {schedule.mode === 'percentage' && (
                                    <span className="ml-2 text-gray-500">
                                      (${(total * entry.value / 100).toFixed(2)})
                                    </span>
                                  )}
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
                      ) : financialLocked ? (
                        <p className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">No payment schedule set</p>
                      ) : null}
            </div>
          </section>
          <section className="min-w-0 rounded-lg bg-gray-50 p-4 text-sm lg:border-l lg:border-gray-200 lg:bg-transparent lg:pl-6">
            <h3 className="text-md font-medium text-gray-900 mb-4">Totals<AutoSaveIndicator status={sectionStatus('discount', 'discountType', 'taxRate', 'lineItems')} /></h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(estimate.subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}
              <div className="flex justify-between"><span>Tax ({taxRate}%)</span><span>{formatCurrency(tax)}</span></div>
              <div className="flex justify-between border-t pt-2 text-lg font-semibold"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>
          </section>
        </div>
      </div>

      <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
        <div className="mb-2 flex justify-end"><AutoSaveIndicator status={sectionStatus('pictures', 'documents')} /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="min-w-0">
            <PictureUploadGrid
              compact
              pictures={pictures}
              isEditing={!readOnly}
              onAdd={(file) => uploadFiles('picture', [file])}
              onAddMany={(files) => uploadFiles('picture', files)}
              showUploadSuccess
              maxPictures={5}
              onRemove={(id) => removeFile('picture', id)}
              onReorder={reorderPictures}
              onUpdateDescription={(id, description) => updateFileDescription('picture', id, description)}
            />
          </div>

          <div className="min-w-0 md:border-l md:pl-4">
            <DocumentUploadList
              compact
              documents={documents}
              isEditing={!readOnly}
              onAdd={addDocumentFile}
              onRemove={(id) => removeFile('document', id)}
              onUpdateDescription={(id, description) => updateFileDescription('document', id, description)}
            />
          </div>
        </div>
      </div>
      {/* Second Estimate Action Box at the bottom */}
      <div className="mt-6">
        <EstimateActionBox
          estimate={estimate}
          onCreateChangeOrder={onCreateChangeOrder}
          onConvertToInvoice={onConvertToInvoice}
          isIssuingInvoice={isIssuingInvoice}
          onShareDialogOpenChange={onShareDialogOpenChange}
          onUpdate={onUpdate}
        />
      </div>

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
              hiddenLineItems: [],
              addImagesToEstimate: false,
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

      {showEditClientModal && <EstimateClientModal
        value={{ ...estimate, customerId: replacementClient?.id || estimate.customerId }}
        readOnly={readOnly}
        onClose={() => { setShowEditClientModal(false); setReplacementClient(null); }}
        onChangeClient={() => {
          setReplacementClient(null);
          setIsChangingClient(true);
          setShowEditClientModal(false);
          setShowClientModal(true);
        }}
        onSave={async client => (await autosave.save({
          customerId: client.id,
          customerName: client.name || '',
          customerEmail: client.email || '',
          customerPhone: client.phoneMobile || client.phoneOther || '',
          serviceAddress: client.serviceAddress || client.billingAddress || '',
          serviceAddress2: client.serviceAddress2 || client.billingAddress2 || '',
          serviceCity: client.serviceCity || client.billingCity || '',
          serviceState: client.serviceState || client.billingState || '',
          serviceZipCode: client.serviceZipCode || client.billingZipCode || '',
        })).ok}
      />}
      {/* Client Select Modal */}
      <ClientSelectModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSelectClient={handleSelectClient}
      />

      {/* Payment Schedule Modal: its own Save is the confirmation, so it saves straight away. */}
      <PaymentScheduleModal
        isOpen={showPaymentScheduleModal}
        onClose={() => setShowPaymentScheduleModal(false)}
        onSave={async (next) => (await autosave.save({ paymentSchedule: next })).ok}
        estimateTotal={estimate.total}
        estimateDate={createdDateField.draft}
        initialSchedule={schedule}
        depositType={depositType}
        depositValue={derivedDepositValue}
      />
    </div>
    </AutosaveRegistryContext.Provider>
  );
};

export default EstimateTab;
