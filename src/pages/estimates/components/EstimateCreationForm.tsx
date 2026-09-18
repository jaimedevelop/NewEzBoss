import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, FileText, UserPlus, User, ExternalLink, ShoppingCart, FolderOpen, Package, Briefcase, Wrench, Truck, HelpCircle, PencilRuler, PenTool, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { FormField } from '../../../mainComponents/forms/FormField';
import { InputField } from '../../../mainComponents/forms/InputField';
import { SelectField } from '../../../mainComponents/forms/SelectField';
import { Alert } from '../../../mainComponents//ui/Alert';
import { LoadingButton } from '../../../mainComponents//ui/LoadingButton';
import {
  createEstimateRow,
  createChangeOrder,
  generateChangeOrderNumber,
  getNextEstimateNumber,
  getEstimate,
  updateEstimate,
  type Estimate
} from '../../../services/estimates';
import { useAuthContext } from '../../../contexts/AuthContext';
import { subscribeToBankAccounts, type BankAccount } from '../../../services/finances/bank';
import { getLaunchProjects } from '../../../services/projects/projects.api';
import { uploadEstimateImages, uploadEstimateDocuments, type Document } from '../../../services/estimates/estimates.files';
import ClientSelectModal from './estimateDashboard/estimateTab/ClientSelectModal';
import { type Client } from '../../../services/clients';
import PaymentScheduleModal, { applyDepositToPaymentSchedule } from './PaymentScheduleModal';
import { PictureUploadGrid } from '../../../components/common/PictureUploadGrid';
import { DocumentUploadList } from '../../../components/common/DocumentUploadList';
import { PaymentSchedule } from '../../../services/estimates/PaymentScheduleModal.types';
import { InventoryPickerModal } from './estimateDashboard/estimateTab/InventoryPickerModal';
import { CollectionImportModal } from './estimateDashboard/estimateTab/CollectionImportModal';
import { LineItemsToBottomButton } from './estimateDashboard/estimateTab/LineItemsSection';
// import { convertCollectionToLineItems } from '../../../services/estimates/estimates.inventory';
import ClientsCreationModal from '../../people/clients/components/ClientsCreationModal';
import type { LineItem as ImportedLineItem } from '../../../services/estimates';

interface LineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  total: number;
  notes?: string;
  productId?: string;
  laborId?: string;
  type?: 'product' | 'labor' | 'tool' | 'equipment' | 'custom' | 'manual';
  itemId?: string;
  groupId?: string;
  collectionId?: string;
  collectionName?: string;
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
  createdDate: string;
  validUntil: string;
  notes: string;
  accountId: string;
}

interface EstimateCreationFormProps {
  onEstimateCreated?: (estimateId: string) => void;
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

const LineItemTypeBadge = ({ type }: { type?: LineItem['type'] }) => {
  const styles = {
    product: { Icon: Package, className: 'bg-orange-50 text-orange-600', title: 'Product' },
    labor: { Icon: Briefcase, className: 'bg-purple-50 text-purple-600', title: 'Labor' },
    tool: { Icon: Wrench, className: 'bg-blue-50 text-blue-600', title: 'Tool' },
    equipment: { Icon: Truck, className: 'bg-green-50 text-green-600', title: 'Equipment' },
    manual: { Icon: PencilRuler, className: 'bg-yellow-50 text-yellow-600', title: 'Manual entry' },
    custom: { Icon: HelpCircle, className: 'bg-gray-50 text-gray-600', title: 'Custom / other' },
  } as const;
  const { Icon, className, title } = styles[type || 'custom'] || styles.custom;

  return <div className={`flex h-8 w-8 items-center justify-center rounded ${className}`} title={title}><Icon className="h-4 w-4" /></div>;
};

const ItemTypeSelector = ({ value, onChange }: { value?: LineItem['type']; onChange: (type: LineItem['type']) => void }) => {
  const types = [
    { id: 'product', Icon: Package, active: 'bg-orange-50 text-orange-600', title: 'Product' },
    { id: 'labor', Icon: Briefcase, active: 'bg-purple-50 text-purple-600', title: 'Labor' },
    { id: 'tool', Icon: Wrench, active: 'bg-blue-50 text-blue-600', title: 'Tool' },
    { id: 'equipment', Icon: Truck, active: 'bg-green-50 text-green-600', title: 'Equipment' },
    { id: 'manual', Icon: PenTool, active: 'bg-indigo-50 text-indigo-600', title: 'Manual entry' },
    { id: 'custom', Icon: HelpCircle, active: 'bg-gray-50 text-gray-600', title: 'Custom' },
  ] as const;

  return <div className="flex w-fit items-center gap-1 rounded-lg border border-gray-100 bg-white p-1 shadow-sm">
    {types.map(({ id, Icon, active, title }) => (
      <button key={id} type="button" onClick={() => onChange(id)} className={`flex h-7 w-7 items-center justify-center rounded transition-all ${(value || 'custom') === id ? `${active} ring-1 ring-inset ring-gray-200 shadow-sm` : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`} title={title}>
        <Icon className="h-3.5 w-3.5" />
      </button>
    ))}
  </div>;
};

const SortableLineItemRow = ({ item, children }: { item: LineItem; children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const collectionColors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500', 'bg-teal-500', 'bg-orange-500', 'bg-emerald-500'];
  const collectionColor = item.collectionId
    ? collectionColors[Math.abs([...item.collectionId].reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0)) % collectionColors.length]
    : undefined;

  return <tr ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition: transition ?? 'none', zIndex: isDragging ? 50 : undefined, position: 'relative', backgroundColor: isDragging ? '#fff7ed' : undefined }} className={`group/row text-sm ${isDragging ? 'shadow-lg ring-1 ring-orange-200' : ''}`}>
    <td className="relative w-8 px-2 py-3">
      {collectionColor && <><div className={`absolute bottom-0 left-0 top-0 w-1.5 ${collectionColor}`} title={`Imported from: ${item.collectionName || 'Collection'}`} /><div className="pointer-events-none absolute left-8 top-1/2 z-50 flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded border border-white/10 bg-gray-900 px-2 py-1 text-[10px] text-white opacity-0 shadow-xl transition-all group-hover/row:opacity-100"><FolderOpen className="h-3.5 w-3.5 text-orange-400" /><span className="font-medium">{item.collectionName || 'From Collection'}</span></div></>}
      <button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} className="touch-none select-none text-gray-400 transition-colors hover:text-orange-600 cursor-grab active:cursor-grabbing" aria-label={`Reorder ${item.description || 'line item'}`} title="Drag to reorder"><GripVertical className="h-4 w-4" /></button>
    </td>
    {children}
  </tr>;
};

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
  const [lineItemsError, setLineItemsError] = useState<string | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showPaymentScheduleModal, setShowPaymentScheduleModal] = useState(false);
  const [estimateCreated, setEstimateCreated] = useState(false);
  const [parentEstimate, setParentEstimate] = useState<Estimate | null>(null);
  const [loadingParent, setLoadingParent] = useState(false);
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);
  const [showCollectionImport, setShowCollectionImport] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const { currentUser, userProfile, canAccessFeature } = useAuthContext();
  const canUseProjectSelection = canAccessFeature('estimates.projectSelection');
  const canUseBankAccount = canAccessFeature('estimates.bankAccount');
  const canUseInventoryPicker = canAccessFeature('estimates.inventoryPicker');
  const canUseCollectionPicker = canAccessFeature('estimates.collectionPicker');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingEstimateNumber, setLoadingEstimateNumber] = useState(false);
  const [selectedValidityPeriod, setSelectedValidityPeriod] = useState<ValidityPeriod | null>('oneMonth');
  const estimateNumberEditedRef = React.useRef(false);
  const lineItemsSectionRef = React.useRef<HTMLDivElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [formData, setFormData] = useState<EstimateFormData>({
    estimateNumber: '',
    projectId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    serviceAddress: '',
    serviceAddress2: '',
    serviceCity: '',
    serviceState: '',
    serviceZipCode: '',
    projectDescription: '',
    lineItems: [],
    pictures: [],
    documents: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    depositType: 'none',
    depositValue: 0,
    paymentSchedule: null,
    total: 0,
    createdDate: '',
    validUntil: '',
    notes: '',
    accountId: ''
  });

  useEffect(() => {
    console.log('useEffect triggered with:', { isChangeOrder, parentEstimateId });

    if (isChangeOrder && parentEstimateId) {
      console.log('Calling loadParentEstimate...');
      loadParentEstimate();
    } else {
      console.log('Calling previewEstimateNumber...');
      previewEstimateNumber();
    }
    if (canUseProjectSelection) {
      loadProjects();
    }
    setDefaultEstimateDates();

    // Subscribe to bank accounts
    if (currentUser?.uid) {
      const unsubscribe = subscribeToBankAccounts(currentUser.uid, (accounts) => {
        setBankAccounts(accounts);
      });
      return () => unsubscribe();
    }
  }, [isChangeOrder, parentEstimateId, currentUser?.uid]);

  useEffect(() => {
    if (!isChangeOrder && userProfile?.defaultTaxRate != null) {
      setFormData(prev => ({ ...prev, tax: userProfile.defaultTaxRate as number }));
    }
  }, [isChangeOrder, userProfile?.defaultTaxRate]);

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
      const changeOrderNumber = await generateChangeOrderNumber(parentEstimateId, parent.estimateNumber);
      console.log('Generated change order number:', changeOrderNumber);

      // Pre-populate form with parent data
      setFormData(prev => ({
        ...prev,
        estimateNumber: changeOrderNumber,
        customerName: parent.customerName,
        customerEmail: parent.customerEmail,
        customerPhone: parent.customerPhone || '',
        tax: parent.tax ?? 0,
        discount: parent.discount ?? 0,
        accountId: parent.accountId || ''
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

  const previewEstimateNumber = async () => {
    setLoadingEstimateNumber(true);
    try {
      const estimateNumber = await getNextEstimateNumber();
      // Don't clobber a number the user already started editing while this
      // (cheap, but still async) request was in flight.
      if (!estimateNumberEditedRef.current) {
        setFormData(prev => ({ ...prev, estimateNumber }));
      }
    } catch (error) {
      console.error('Error previewing estimate number:', error);
    } finally {
      setLoadingEstimateNumber(false);
    }
  };

  const loadProjects = async () => {
    try {
      const result = await getLaunchProjects();
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

  const setDefaultEstimateDates = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({
      ...prev,
      createdDate: today,
      validUntil: getValidUntilDate(today, 'oneMonth')
    }));
  };

  const applyValidityPeriod = (period: ValidityPeriod) => {
    setSelectedValidityPeriod(period);
    setFormData(prev => ({
      ...prev,
      validUntil: getValidUntilDate(prev.createdDate, period)
    }));
  };

  // const [showCreateProjectOption, setShowCreateProjectOption] = useState(false);

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
      // setShowCreateProjectOption(false);
    } else {
      setFormData(prev => ({
        ...prev,
        projectId: '',
        customerName: '',
        customerEmail: '',
        customerPhone: ''
      }));
      // setShowCreateProjectOption(true);
    }
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

  const removePicture = async (id: string) => {
    // In this create flow, files aren't uploaded to the backend until after
    // the estimate itself is created (see saveEstimate), so there's no
    // estimate id to scope a delete call to yet — nothing to clean up here.

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

  const addDocumentFile = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB for documents
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

  const removeDocument = async (id: string) => {
    // Same as removePicture: no estimate id exists yet during the create
    // flow, so a removed document here was never uploaded to the backend.

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

  const createLineItemId = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `line-item-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const getTotals = (lineItems: LineItem[], discount: number, tax: number) => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = (subtotal * discount) / 100;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * tax) / 100;

    return { subtotal, total: taxableAmount + taxAmount };
  };

  const updateLineItems = (updater: (items: LineItem[]) => LineItem[]) => {
    setFormData(prev => {
      const lineItems = updater(prev.lineItems);
      return { ...prev, lineItems, ...getTotals(lineItems, prev.discount, prev.tax) };
    });
  };

  const addLineItem = () => {
    setLineItemsError(null);
    updateLineItems(items => [
      ...items,
      { id: createLineItemId(), description: '', quantity: '1', unitPrice: '', total: 0, type: 'manual' }
    ]);
  };

  const removeLineItem = (id: string) => {
    updateLineItems(items => items.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    if (field === 'description' && typeof value === 'string' && value.trim()) {
      setLineItemsError(null);
    }
    updateLineItems(items => {
      return items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'unitPrice') {
            const qty = parseFloat(updatedItem.quantity as string) || 0;
            const price = parseFloat(updatedItem.unitPrice as string) || 0;
            updatedItem.total = qty * price;
          }
          return updatedItem;
        }
        return item;
      });
    });
  };

  const handleLineItemsDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    updateLineItems(items => {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      return oldIndex === -1 || newIndex === -1 ? items : arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleDiscountChange = (value: number) => {
    setFormData(prev => ({
      ...prev,
      discount: value,
      ...getTotals(prev.lineItems, value, prev.tax)
    }));
  };

  const handleTaxChange = (value: number) => {
    setFormData(prev => ({
      ...prev,
      tax: value,
      ...getTotals(prev.lineItems, prev.discount, value)
    }));
  };

  const handleDepositTypeChange = (depositType: EstimateFormData['depositType']) => {
    setFormData(prev => ({
      ...prev,
      depositType,
      paymentSchedule: applyDepositToPaymentSchedule(
        prev.paymentSchedule,
        depositType,
        prev.depositValue,
        prev.total
      )
    }));
  };

  const handleDepositValueChange = (depositValue: number) => {
    setFormData(prev => ({
      ...prev,
      depositValue,
      paymentSchedule: applyDepositToPaymentSchedule(
        prev.paymentSchedule,
        prev.depositType,
        depositValue,
        prev.total
      )
    }));
  };

  const appendImportedLineItems = (items: ImportedLineItem[]) => {
    if (items.length === 0) return;

    setLineItemsError(null);
    updateLineItems(existingItems => [
      ...existingItems,
      ...items.map(item => ({
        ...item,
        id: createLineItemId(),
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        total: item.quantity * item.unitPrice,
        // itemId is a generic inventory identifier. Product/labor foreign
        // keys are populated by the typed converters, never inferred here.
        productId: item.productId,
        laborId: item.laborId,
      }))
    ]);
  };



  const saveEstimate = async (status: 'draft' | 'sent' = 'draft') => {
    console.log('=== SAVE ESTIMATE DEBUG ===');
    console.log('Status:', status);
    console.log('Customer Name:', formData.customerName);
    console.log('Customer Email:', formData.customerEmail);
    console.log('Line Items:', formData.lineItems);
    console.log('Loading state:', loading);
    console.log('Selected Client:', selectedClient);

    try {
      if (!formData.customerName.trim()) {
        console.log('ERROR: Customer name is empty');
        setAlert({ type: 'error', message: 'Customer name is required.' });
        setLoading(false);
        return;
      }

      if (formData.lineItems.length === 0 || !formData.lineItems.some(item => item.description.trim())) {
        console.log('ERROR: No valid line items');
        setLineItemsError('Add at least one line item with a description before creating the estimate.');
        return;
      }

      setLoading(true);
      console.log('Validation passed, proceeding with save...');

      // Step 1: Create estimate data WITHOUT pictures and documents
      const discountAmount = (formData.subtotal * formData.discount) / 100;
      const taxableAmount = formData.subtotal - discountAmount;
      const taxAmount = (taxableAmount * formData.tax) / 100;
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
        pictures: [], // Will be updated after upload
        documents: [], // Will be updated after upload
        subtotal: formData.subtotal,
        discount: formData.discount,
        // The discount input is expressed as a percentage. Persist its type so
        // the server applies 18 as 18%, rather than treating it as $18.
        discountType: 'percentage',
        tax: taxAmount,
        taxRate: formData.tax, // Tax rate as percentage
        depositType: formData.depositType,
        depositValue: formData.depositValue,
        paymentSchedule: formData.paymentSchedule,
        total: formData.total,
        createdDate: formData.createdDate,
        validUntil: formData.validUntil,
        notes: formData.notes.trim(),
        status,
        estimateState: status === 'draft' ? 'draft' as const : 'estimate' as const,
        accountId: formData.accountId || undefined
      };

      // Only include projectId when one was selected.
      if (formData.projectId) {
        estimateData.projectId = formData.projectId;
      }

      // Step 2: Create the estimate to get the actual estimate ID
      let estimateId: string;
      let estimateNumber = formData.estimateNumber;

      if (isChangeOrder && parentEstimateId) {
        // Create as Change Order
        estimateId = await createChangeOrder(parentEstimateId, estimateData);
      } else {
        // Create as regular Estimate; capture the server-assigned number
        // for display since we never generated one client-side.
        const row = await createEstimateRow(estimateData);
        estimateId = String(row.id);
        estimateNumber = row.estimateNumber;
        setFormData(prev => ({ ...prev, estimateNumber: row.estimateNumber }));
      }

      console.log('Estimate created with ID:', estimateId);

      // Step 3: Upload pictures and documents in parallel using the actual estimate ID
      const [uploadedPictures, uploadedDocuments] = await Promise.all([
        formData.pictures.length > 0
          ? uploadEstimateImages(formData.pictures, estimateId)
          : Promise.resolve([] as any[]),
        formData.documents.length > 0
          ? uploadEstimateDocuments(formData.documents, estimateId)
          : Promise.resolve([] as any[]),
      ]);

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
        message: `${entityType} ${estimateNumber} ${status === 'draft' ? 'saved as draft' : 'created'} successfully!`
      });

      setEstimateCreated(true);

      // Notify parent component
      if (onEstimateCreated) {
        onEstimateCreated(estimateId);
      }

      // Auto-navigate to the dashboard
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

  const projectOptions = [
    { value: '', label: 'Independent Estimate (No Project)' },
    ...projects.map(project => ({ value: project.id, label: project.name }))
  ];

  return (
    <div className="w-full p-6 bg-white rounded-lg shadow-sm border">
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
        <div className="mb-6">
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
              onChange={isChangeOrder ? undefined : (e) => {
                estimateNumberEditedRef.current = true;
                setFormData(prev => ({ ...prev, estimateNumber: e.target.value }));
              }}
              disabled={isChangeOrder}
              placeholder={loadingEstimateNumber ? 'Loading...' : undefined}
              className={isChangeOrder ? 'bg-orange-50' : ''}
            />
          </FormField>

          {!isChangeOrder && canUseProjectSelection && (
            <FormField label="Project" required>
              <SelectField
                value={formData.projectId}
                onChange={(e) => handleProjectSelection(e.target.value)}
                options={projectOptions}
                placeholder="Select a project or create independent estimate"
              />
            </FormField>
          )}

          {canUseBankAccount && (
            <FormField label="Bank Account (Optional)">
              <SelectField
                value={formData.accountId}
                onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                options={[
                  { value: '', label: 'No Account selected' },
                  ...bankAccounts.map(acc => ({
                    value: acc.id || '',
                    label: `${acc.name} (${acc.institution || 'Bank'})`
                  }))
                ]}
                placeholder="Select an account for this estimate"
              />
            </FormField>
          )}
        </div>

        {/* Estimate Dates */}
        <div className="border-t pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Date" required>
            <InputField
              type="date"
              value={formData.createdDate}
              onChange={(e) => setFormData(prev => ({ ...prev, createdDate: e.target.value }))}
            />
          </FormField>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-medium text-gray-700">
                Valid Until <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1" role="group" aria-label="Estimate validity period">
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
            </div>
            <InputField
              type="date"
              value={formData.validUntil}
              onChange={(e) => {
                setSelectedValidityPeriod(null);
                setFormData(prev => ({ ...prev, validUntil: e.target.value }));
              }}
            />
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </FormField>
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

                  <div className="mt-4 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setShowClientModal(true)}
                      className="text-sm text-orange-600 hover:text-orange-800 font-medium"
                    >
                      Change Client
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => setShowEditClientModal(true)}
                      className="text-sm text-orange-600 hover:text-orange-800 font-medium"
                    >
                      Edit Client
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Pictures */}
        <div className="border-t pt-6">
          <PictureUploadGrid
            pictures={formData.pictures}
            isEditing={true}
            onAdd={addPictureFile}
            onRemove={removePicture}
            onUpdateDescription={(id, description) => updatePicture(id, 'description', description)}
          />
        </div>

        {/* Documents */}
        <div className="border-t pt-6">
          <DocumentUploadList
            documents={formData.documents}
            isEditing={true}
            onAdd={addDocumentFile}
            onRemove={removeDocument}
            onUpdateDescription={(id, description) => updateDocument(id, 'description', description)}
          />
        </div>

        {/* Line Items */}
        <div ref={lineItemsSectionRef} className="border border-gray-200 rounded-lg bg-white">
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">{formData.lineItems.length} items</span>
            </div>
          </div>

          <div className="p-6">
            {lineItemsError && (
              <div className="mb-4" role="alert">
                <Alert type="error" onClose={() => setLineItemsError(null)}>
                  {lineItemsError}
                </Alert>
              </div>
            )}
            <div className="mb-6 overflow-x-auto">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLineItemsDragEnd} modifiers={[restrictToVerticalAxis]}>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <th className="w-8 pb-3" aria-label="Reorder" />
                      <th className="w-12 pb-3 text-center">Type</th>
                      <th className="pb-3">Description</th>
                      <th className="w-20 pb-3 text-right">Qty</th>
                      <th className="w-28 pb-3 text-right">Unit Price</th>
                      <th className="w-28 pb-3 text-right">Total</th>
                      <th className="w-12 pb-3" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <SortableContext items={formData.lineItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                      {formData.lineItems.map((item) => (
                        <SortableLineItemRow key={item.id} item={item}>
                          <td className="py-3 text-center"><LineItemTypeBadge type={item.type} /></td>
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <InputField value={item.description} onChange={(e) => updateLineItem(item.id, 'description', e.target.value)} placeholder="Description of work/materials" />
                              <ItemTypeSelector value={item.type} onChange={(type) => updateLineItem(item.id, 'type', type)} />
                            </div>
                          </td>
                          <td className="py-2 text-right"><InputField type="text" inputMode="numeric" value={item.quantity} onChange={(e) => { const val = e.target.value; if (val === '' || /^\d+$/.test(val)) updateLineItem(item.id, 'quantity', val); }} placeholder="0" className="w-full text-right" /></td>
                          <td className="py-2 text-right"><InputField type="text" inputMode="decimal" value={item.unitPrice} onChange={(e) => { const val = e.target.value; if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) updateLineItem(item.id, 'unitPrice', val); }} placeholder="0.00" className="w-full text-right" /></td>
                          <td className="py-3 text-right font-medium text-gray-900">${item.total.toFixed(2)}</td>
                          <td className="py-3 text-right"><button type="button" onClick={() => removeLineItem(item.id)} className="p-1 text-gray-400 transition-colors hover:text-red-600" title="Delete item" aria-label={`Delete ${item.description || 'line item'}`}><Trash2 className="h-4 w-4" /></button></td>
                        </SortableLineItemRow>
                      ))}
                    </SortableContext>
                    {formData.lineItems.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-sm text-gray-500">No line items yet. Add one below, or bring in inventory and collections.</td></tr>}
                  </tbody>
                </table>
              </DndContext>
            </div>

          {/* Action Buttons */}
          <div className={`grid gap-3 ${1 + (canUseInventoryPicker ? 1 : 0) + (canUseCollectionPicker ? 1 : 0) === 3 ? 'grid-cols-1 sm:grid-cols-3' : 1 + (canUseInventoryPicker ? 1 : 0) + (canUseCollectionPicker ? 1 : 0) === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            <button
              type="button"
              onClick={addLineItem}
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-2 text-sm text-gray-600 transition-colors hover:border-orange-500 hover:text-orange-600"
            >
              <Plus className="w-4 h-4" />
              Add Line Item
            </button>

            {canUseInventoryPicker && (
              <button
                type="button"
                onClick={() => setShowInventoryPicker(true)}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-green-300 py-2 text-sm text-green-700 transition-colors hover:border-green-500 hover:bg-green-50 hover:text-green-800"
              >
                <Plus className="w-4 h-4" />
                Add From Inventory
              </button>
            )}

            {canUseCollectionPicker && (
              <button
                type="button"
                onClick={() => setShowCollectionImport(true)}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-indigo-300 py-2 text-sm text-indigo-700 transition-colors hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-800"
              >
                <Plus className="w-4 h-4" />
                Import Collection
              </button>
            )}
          </div>
          </div>
          <LineItemsToBottomButton sectionRef={lineItemsSectionRef} />
        </div>

        {/* Notes and totals */}
        <div className="border-t pt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField label="Notes">
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes for this estimate..."
                rows={8}
                className="h-full w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </FormField>

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
                      onChange={(e) => handleDepositTypeChange(e.target.value as EstimateFormData['depositType'])}
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
                        onChange={(e) => handleDepositValueChange(parseFloat(e.target.value) || 0)}
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
        estimateDate={formData.createdDate}
        initialSchedule={formData.paymentSchedule}
        depositType={formData.depositType}
        depositValue={formData.depositValue}
      />
      {canUseInventoryPicker && (
      <InventoryPickerModal
        isOpen={showInventoryPicker}
        onClose={() => setShowInventoryPicker(false)}
        onAddItems={appendImportedLineItems}
      />
      )}
      {canUseCollectionPicker && (
      <CollectionImportModal
        isOpen={showCollectionImport}
        onClose={() => setShowCollectionImport(false)}
        onImport={appendImportedLineItems}
      />
      )}
    </div>
  );
};
