import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, FileText, UserPlus, ExternalLink, FolderOpen, Package, Briefcase, Wrench, Truck, HelpCircle, PencilRuler, PenTool, GripVertical } from 'lucide-react';
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
import PaymentScheduleModal, { applyDepositToPaymentSchedule, convertDepositValue } from './PaymentScheduleModal';
import { PictureUploadGrid } from '../../../components/common/PictureUploadGrid';
import { DocumentUploadList } from '../../../components/common/DocumentUploadList';
import { PaymentSchedule } from '../../../services/estimates/PaymentScheduleModal.types';
import { InventoryPickerModal } from './estimateDashboard/estimateTab/InventoryPickerModal';
import { CollectionImportModal } from './estimateDashboard/estimateTab/CollectionImportModal';
import { LineItemsToBottomButton } from './estimateDashboard/estimateTab/LineItemsSection';
// import { convertCollectionToLineItems } from '../../../services/estimates/estimates.inventory';
import EstimateClientModal from './EstimateClientModal';
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
  poNumber: string;
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
  discountType: 'percentage' | 'fixed';
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

const ItemTypePicker = ({ value, onChange }: { value?: LineItem['type']; onChange: (type: LineItem['type']) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const pickerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const types = [
    { id: 'product', Icon: Package, active: 'bg-orange-50 text-orange-600', title: 'Product' },
    { id: 'labor', Icon: Briefcase, active: 'bg-purple-50 text-purple-600', title: 'Labor' },
    { id: 'tool', Icon: Wrench, active: 'bg-blue-50 text-blue-600', title: 'Tool' },
    { id: 'equipment', Icon: Truck, active: 'bg-green-50 text-green-600', title: 'Equipment' },
    { id: 'manual', Icon: PenTool, active: 'bg-indigo-50 text-indigo-600', title: 'Manual entry' },
    { id: 'custom', Icon: HelpCircle, active: 'bg-gray-50 text-gray-600', title: 'Custom' },
  ] as const;

  const selectedType = types.find((type) => type.id === (value || 'custom')) || types[5];
  const SelectedIcon = selectedType.Icon;

  React.useEffect(() => {
    const closeWhenClickingAway = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!pickerRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', closeWhenClickingAway);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeWhenClickingAway);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const toggleMenu = () => {
    if (isOpen) return setIsOpen(false);
    const bounds = triggerRef.current?.getBoundingClientRect();
    if (bounds) setMenuPosition({ top: bounds.bottom + 8, left: bounds.left });
    setIsOpen(true);
  };

  return <div ref={pickerRef} className="relative inline-flex">
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      ref={triggerRef}
      onClick={toggleMenu}
      aria-label={`Change item type, currently ${selectedType.title}`}
      aria-expanded={isOpen}
      aria-haspopup="menu"
      title={`Change type: ${selectedType.title}`}
      className={`flex h-8 w-8 items-center justify-center rounded ${selectedType.active} transition-transform duration-200 hover:scale-90 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2`}
    >
      <SelectedIcon className="h-4 w-4" />
    </button>
    {isOpen && menuPosition && createPortal(<div ref={menuRef} role="menu" aria-label="Item type" className="fixed z-[100] flex w-max items-center gap-1 rounded-lg border border-gray-100 bg-white p-1 shadow-lg" style={menuPosition}>
      {types.map(({ id, Icon, active, title }) => (
        <button
          key={id}
          type="button"
          role="menuitemradio"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onChange(id);
            setIsOpen(false);
          }}
          aria-checked={(value || 'custom') === id}
          tabIndex={-1}
          className={`flex h-7 w-7 items-center justify-center rounded transition-all ${(value || 'custom') === id ? `${active} ring-1 ring-inset ring-gray-200 shadow-sm` : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
          title={title}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>, document.body)}
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

  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [lineItemsError, setLineItemsError] = useState<string | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [replacementClient, setReplacementClient] = useState<Client | null>(null);
  const [isChangingClient, setIsChangingClient] = useState(false);
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
    poNumber: '',
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
    discountType: 'percentage',
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
    if (isChangeOrder && parentEstimateId) {
      loadParentEstimate();
    } else {
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

    setLoadingParent(true);
    try {
      const parent = await getEstimate(parentEstimateId);

      if (!parent) {
        console.error('Parent estimate not found for ID:', parentEstimateId);
        setAlert({ type: 'error', message: `Parent estimate not found (ID: ${parentEstimateId}).` });
        navigate('/estimates');
        return;
      }

      setParentEstimate(parent);

      // Generate change order number
      const changeOrderNumber = await generateChangeOrderNumber(parentEstimateId, parent.estimateNumber);

      // Pre-populate form with parent data
      setFormData(prev => ({
        ...prev,
        estimateNumber: changeOrderNumber,
        customerName: parent.customerName,
        customerEmail: parent.customerEmail,
        customerPhone: parent.customerPhone || '',
        tax: parent.tax ?? 0,
        discount: parent.discount ?? 0,
        discountType: parent.discountType === 'fixed' ? 'fixed' : 'percentage',
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
    if (isChangingClient) {
      // Do not change the estimate draft until this client's edits are saved.
      setReplacementClient(client);
      setIsChangingClient(false);
      setShowEditClientModal(true);
      return;
    }
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

  const addPictureFile = (file: File) => {
    addPictureFiles([file]);
  };

  const addPictureFiles = (files: File[]) => {
    setFormData(prev => ({
      ...prev,
      pictures: [...prev.pictures, ...files.map((file, index) => ({
        id: `${prev.pictures.length + index + 1}-${Date.now()}-${index}`,
        file,
        url: URL.createObjectURL(file),
        description: ''
      }))]
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

  const getTotals = (lineItems: LineItem[], discount: number, discountType: EstimateFormData['discountType'], tax: number) => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = discountType === 'percentage' ? (subtotal * discount) / 100 : Math.min(discount, subtotal);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * tax) / 100;

    return { subtotal, total: taxableAmount + taxAmount };
  };

  const updateLineItems = (updater: (items: LineItem[]) => LineItem[]) => {
    setFormData(prev => {
      const lineItems = updater(prev.lineItems);
      return { ...prev, lineItems, ...getTotals(lineItems, prev.discount, prev.discountType, prev.tax) };
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
      ...getTotals(prev.lineItems, value, prev.discountType, prev.tax)
    }));
  };

  const handleDiscountTypeChange = (discountType: EstimateFormData['discountType']) => {
    setFormData(prev => ({
      ...prev,
      discountType,
      ...getTotals(prev.lineItems, prev.discount, discountType, prev.tax)
    }));
  };

  const handleTaxChange = (value: number) => {
    setFormData(prev => ({
      ...prev,
      tax: value,
      ...getTotals(prev.lineItems, prev.discount, prev.discountType, value)
    }));
  };

  const handleDepositTypeChange = (depositType: EstimateFormData['depositType']) => {
    setFormData(prev => {
      const depositValue = convertDepositValue(prev.depositValue, prev.depositType, depositType, prev.total);
      return {
        ...prev,
        depositType,
        depositValue,
        paymentSchedule: applyDepositToPaymentSchedule(
          prev.paymentSchedule,
          depositType,
          depositValue,
          prev.total
        )
      };
    });
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
    try {
      if (!formData.customerName.trim()) {
        setAlert({ type: 'error', message: 'Customer name is required.' });
        setLoading(false);
        return;
      }

      if (formData.lineItems.length === 0 || !formData.lineItems.some(item => item.description.trim())) {
        setLineItemsError('Add at least one line item with a description before creating the estimate.');
        return;
      }

      setLoading(true);

      // Step 1: Create estimate data WITHOUT pictures and documents
      const discountAmount = formData.discountType === 'percentage'
        ? (formData.subtotal * formData.discount) / 100
        : Math.min(formData.discount, formData.subtotal);
      const taxableAmount = formData.subtotal - discountAmount;
      const taxAmount = (taxableAmount * formData.tax) / 100;
      const estimateData: any = {
        estimateNumber: !isChangeOrder ? formData.estimateNumber.trim() : undefined,
        poNumber: formData.poNumber.trim(),
        customerId: selectedClient?.id,
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
        discountType: formData.discountType,
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
        await updateEstimate(estimateId, {
          pictures: uploadedPictures,
          documents: uploadedDocuments
        });
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
        saveEstimate('draft');
      }} className="space-y-4">
        {/* Estimate Number and Project Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <FormField label="P.O. Number">
            <InputField
              value={formData.poNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
              placeholder="Enter a P.O. number"
            />
          </FormField>

          {canUseBankAccount && (
            <FormField label="Bank Account">
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
          {!isChangeOrder && canUseProjectSelection && (
            <FormField label="Project">
              <SelectField
                value={formData.projectId}
                onChange={(e) => handleProjectSelection(e.target.value)}
                options={projectOptions}
                placeholder="Select a project or create independent estimate"
              />
            </FormField>
          )}

        </div>

        {/* Estimate Dates */}
        <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Date" required>
            <InputField
              type="date"
              value={formData.createdDate}
              onChange={(e) => setFormData(prev => ({ ...prev, createdDate: e.target.value }))}
            />
          </FormField>

          <FormField label="Valid Until *" className="relative">
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
            <InputField
              type="date"
              value={formData.validUntil}
              onChange={(e) => {
                setSelectedValidityPeriod(null);
                setFormData(prev => ({ ...prev, validUntil: e.target.value }));
              }}
            />
          </FormField>
          <FormField label="Client" required>
            <button type="button" onClick={() => formData.customerName ? setShowEditClientModal(true) : setShowClientModal(true)} disabled={isChangeOrder && !formData.customerName} className="flex w-full items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-left hover:border-orange-500">
              <UserPlus className="h-4 w-4 shrink-0 text-orange-600" />
              <span className="truncate">{formData.customerName || 'Select Client'}</span>
              {formData.customerName && <span className="ml-auto shrink-0 text-xs text-orange-600">{isChangeOrder ? 'View' : 'Edit Client'}</span>}
            </button>
          </FormField>
        </div>

        {/* Project Description */}
        <div className="border-t pt-4">
          <FormField label="Description">
            <textarea
              value={formData.projectDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, projectDescription: e.target.value }))}
              placeholder="Describe the work to be performed..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </FormField>
        </div>

        {/* Line Items */}
        <div ref={lineItemsSectionRef} className="border border-gray-200 rounded-lg bg-white">
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">{formData.lineItems.length} items</span>
            </div>
          </div>

          <div className="p-4">
            {lineItemsError && (
              <div className="mb-4" role="alert">
                <Alert type="error" onClose={() => setLineItemsError(null)}>
                  {lineItemsError}
                </Alert>
              </div>
            )}
            <div className="relative z-20 mb-6 overflow-x-auto">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLineItemsDragEnd} modifiers={[restrictToVerticalAxis]}>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <th className="w-8 pb-3" aria-label="Reorder" />
                      <th className="w-12 pb-3">Type</th>
                      <th className="pb-3">Description</th>
                      <th className="w-20 pb-3">Qty</th>
                      <th className="w-28 pb-3">Unit Price</th>
                      <th className="w-28 pb-3">Total</th>
                      <th className="w-12 pb-3" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <SortableContext items={formData.lineItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
                      {formData.lineItems.map((item) => (
                        <SortableLineItemRow key={item.id} item={item}>
                          <td className="py-3 text-center"><ItemTypePicker value={item.type} onChange={(type) => updateLineItem(item.id, 'type', type || 'custom')} /></td>
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <textarea
                                value={item.description}
                                onChange={(e) => {
                                  updateLineItem(item.id, 'description', e.target.value);
                                  e.currentTarget.style.height = 'auto';
                                  e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                                }}
                                onFocus={(e) => {
                                  e.currentTarget.style.height = 'auto';
                                  e.currentTarget.style.height = `${Math.max(e.currentTarget.scrollHeight, 96)}px`;
                                }}
                                onBlur={(e) => { e.currentTarget.style.height = ''; }}
                                placeholder="Description of work/materials"
                                aria-label="Description"
                                rows={1}
                                className="block w-full min-w-[10rem] resize-y overflow-hidden rounded-md border border-gray-300 bg-white px-3 py-2 leading-5 placeholder-gray-500 focus:min-h-24 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                              />
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

        <div className="border-t pt-3">
          <FormField label="Notes">
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes for this estimate..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </FormField>
        </div>
        {/* Notes and totals */}
        <div className="border-t pt-4">
          <div className="space-y-4">
            <div className="w-full space-y-3">
              <h3 className="font-medium text-gray-900">Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField label={formData.discountType === 'percentage' ? 'Discount (%)' : 'Discount ($)'}>
                  <div className="flex gap-2">
                    <InputField type="number" value={formData.discount || ''} placeholder="0" onChange={e => handleDiscountChange(parseFloat(e.target.value) || 0)} min="0" max={formData.discountType === 'percentage' ? '100' : undefined} step="0.01" />
                    <div className="flex shrink-0 overflow-hidden rounded-md border border-orange-600">
                      {(['percentage', 'fixed'] as const).map(type => <button key={type} type="button" onClick={() => handleDiscountTypeChange(type)} aria-label={`Use ${type === 'percentage' ? 'percentage' : 'dollar'} discount`} className={`w-10 text-lg font-semibold transition-colors ${formData.discountType === type ? 'bg-orange-600 text-white' : 'bg-white text-orange-600 hover:bg-orange-50'}`}>{type === 'percentage' ? '%' : '$'}</button>)}
                    </div>
                  </div>
                </FormField>
                <FormField label="Deposit Type"><SelectField value={formData.depositType} onChange={e => handleDepositTypeChange(e.target.value as EstimateFormData['depositType'])} options={[{ value: 'none', label: 'No Deposit' }, { value: 'percentage', label: 'Percentage' }, { value: 'amount', label: 'Amount' }]} /></FormField>
                {formData.depositType !== 'none' && <FormField label={formData.depositType === 'percentage' ? 'Deposit (%)' : 'Deposit Amount ($)'}><div className="flex gap-2"><InputField type="number" value={formData.depositValue || ''} placeholder="0" onChange={e => handleDepositValueChange(parseFloat(e.target.value) || 0)} min="0" max={formData.depositType === 'percentage' ? 100 : undefined} step="0.01" /><div className="flex shrink-0 overflow-hidden rounded-md border border-orange-600">{(['percentage', 'amount'] as const).map(type => <button key={type} type="button" onClick={() => handleDepositTypeChange(type)} aria-label={`Use ${type === 'percentage' ? 'percentage' : 'dollar'} deposit`} className={`w-10 text-lg font-semibold transition-colors ${formData.depositType === type ? 'bg-orange-600 text-white' : 'bg-white text-orange-600 hover:bg-orange-50'}`}>{type === 'percentage' ? '%' : '$'}</button>)}</div></div></FormField>}
                <FormField label="Tax Rate (%)"><InputField type="number" value={formData.tax || ''} placeholder="0" onChange={e => handleTaxChange(parseFloat(e.target.value) || 0)} min="0" max="100" step="0.01" /></FormField>
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

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">${formData.subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-sm"><span>Tax ({formData.tax}%)</span><span>${((formData.subtotal - (formData.discountType === 'percentage' ? formData.subtotal * formData.discount / 100 : Math.min(formData.discount, formData.subtotal))) * formData.tax / 100).toFixed(2)}</span></div>
              <div className="border-t pt-3">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total:</span>
                  <span>${formData.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
          <div className="min-w-0">
            <PictureUploadGrid
              compact
              pictures={formData.pictures}
              isEditing={true}
              onAdd={addPictureFile}
              onAddMany={addPictureFiles}
              showUploadSuccess
              maxPictures={5}
              onRemove={removePicture}
              onUpdateDescription={(id, description) => updatePicture(id, 'description', description)}
            />
          </div>

          <div className="min-w-0 md:border-l md:pl-4">
            <DocumentUploadList
              compact
              documents={formData.documents}
              isEditing={true}
              onAdd={addDocumentFile}
              onRemove={removeDocument}
              onUpdateDescription={(id, description) => updateDocument(id, 'description', description)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="border-t pt-4 flex justify-end items-center">
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
      {showEditClientModal && <EstimateClientModal
        value={{ ...formData, customerId: replacementClient?.id || selectedClient?.id }}
        readOnly={isChangeOrder}
        onClose={() => { setShowEditClientModal(false); setReplacementClient(null); }}
        onChangeClient={() => {
          setReplacementClient(null);
          setIsChangingClient(true);
          setShowEditClientModal(false);
          setShowClientModal(true);
        }}
        onSave={client => {
          setSelectedClient(client);
          setReplacementClient(null);
          setFormData(prev => ({
            ...prev,
            customerName: client.name || '',
            customerEmail: client.email || '',
            customerPhone: client.phoneMobile || client.phoneOther || '',
            serviceAddress: client.serviceAddress || client.billingAddress || '',
            serviceAddress2: client.serviceAddress2 || client.billingAddress2 || '',
            serviceCity: client.serviceCity || client.billingCity || '',
            serviceState: client.serviceState || client.billingState || '',
            serviceZipCode: client.serviceZipCode || client.billingZipCode || '',
          }));
          return true;
        }}
      />}
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
