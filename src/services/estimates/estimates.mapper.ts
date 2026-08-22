// src/services/estimates/estimates.mapper.ts
// Converts between the backend's relational estimate shape (flat row +
// lineItems[]/groups[]/revisionsHistory[]/etc as separate tables, numeric
// SERIAL ids) and the frontend's Estimate shape (embedded arrays, string
// ids), mirroring the old Firestore document layout so callers don't change.
import type {
  Estimate,
  EstimateWithId,
  LineItem,
  EstimateGroup,
  ClientViewSettings,
  Revision,
  Communication,
  ClientComment,
  PaymentRecord,
  Picture,
  EstimateDocument,
} from './estimates.types';

export interface ApiLineItemRow {
  id: number;
  estimateId: number;
  description: string;
  quantity: number | string;
  unitPrice: number | string;
  total: number | string;
  notes?: string | null;
  type?: string | null;
  itemId?: string | null;
  productId?: number | null;
  laborId?: number | null;
  groupId?: number | null;
  collectionId?: number | null;
  collectionName?: string | null;
  sortOrder?: number;
}

export interface ApiGroupRow {
  id: number;
  estimateId: number;
  name: string;
  description?: string | null;
  showPrice: boolean;
  sortOrder?: number;
}

export interface ApiClientViewSettingsRow {
  id: number;
  estimateId: number;
  displayMode: 'list' | 'byType' | 'byGroup';
  showItemPrices: boolean;
  showGroupPrices: boolean;
  showSubtotal: boolean;
  showTax: boolean;
  showTotal: boolean;
  hiddenLineItems?: number[] | string[] | null;
}

export interface ApiPaymentScheduleEntryRow {
  id: number;
  paymentScheduleId: number;
  description: string;
  value: number | string;
  dueDate?: string | null;
  sortOrder?: number;
}

export interface ApiPaymentScheduleRow {
  id: number;
  estimateId: number;
  mode: 'percentage' | 'sum';
  entries?: ApiPaymentScheduleEntryRow[];
}

export interface ApiRevisionRow {
  id: number;
  estimateId: number;
  revisionNumber: number;
  date: string;
  changes: string;
  modifiedBy: string;
  previousTotal: number | string;
  newTotal: number | string;
  changeType?: string | null;
  modifiedByName?: string | null;
  details?: any;
}

export interface ApiCommunicationRow {
  id: number;
  estimateId: number;
  date: string;
  content: string;
  createdBy: string;
  type?: string | null;
  createdByName?: string | null;
}

export interface ApiClientCommentRow {
  id: number;
  estimateId: number;
  date: string;
  text: string;
  authorName: string;
  authorEmail: string;
  isContractor: boolean;
}

export interface ApiPaymentRow {
  id: number;
  estimateId: number;
  amount: number | string;
  date: string;
  method: string;
  notes?: string | null;
  createdBy: string;
  createdAt: string;
}

export interface ApiEstimateRow {
  id: number;
  estimateNumber: string;
  projectId?: string | null;
  customerId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  serviceAddress?: string | null;
  serviceAddress2?: string | null;
  serviceCity?: string | null;
  serviceState?: string | null;
  serviceZipCode?: string | null;
  type?: string | null;
  collectionId?: string | null;
  subtotal: number | string;
  discount: number | string;
  discountType?: string | null;
  tax: number | string;
  taxRate: number | string;
  total: number | string;
  estimateState: string;
  clientState?: string | null;
  parentEstimateId?: number | null;
  status?: string | null;
  sentDate?: string | null;
  viewedDate?: string | null;
  viewCount?: number;
  acceptedDate?: string | null;
  rejectedDate?: string | null;
  deniedDate?: string | null;
  denialReason?: string | null;
  onHoldDate?: string | null;
  onHoldReason?: string | null;
  rejectionReason?: string | null;
  validUntil?: string | null;
  emailToken?: string | null;
  clientViewUrl?: string | null;
  lastEmailSent?: string | null;
  emailSentCount?: number;
  contractorEmail?: string | null;
  clientApprovalStatus?: string | null;
  clientApprovalDate?: string | null;
  clientApprovalBy?: string | null;
  changeOrderTotal?: number | string | null;
  currentRevision?: number;
  createdBy?: number | null;
  userId?: number | null;
  createdDate?: string | null;
  notes?: string | null;
  accountId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;

  // Nested detail (only present on single-record fetches)
  lineItems?: ApiLineItemRow[];
  groups?: ApiGroupRow[];
  clientViewSettings?: ApiClientViewSettingsRow | null;
  paymentSchedule?: ApiPaymentScheduleRow | null;
  revisionsHistory?: ApiRevisionRow[];
  communications?: ApiCommunicationRow[];
  clientComments?: ApiClientCommentRow[];
  payments?: ApiPaymentRow[];
  pictures?: ApiPictureRow[];
  documents?: ApiDocumentRow[];
}

export interface ApiPictureRow {
  id: number | string;
  url: string;
  description?: string | null;
}

export interface ApiDocumentRow {
  id: number | string;
  url: string;
  description?: string | null;
  fileName?: string | null;
}

const num = (v: number | string | null | undefined, fallback = 0): number =>
  v === null || v === undefined ? fallback : Number(v);

export const apiLineItemToLineItem = (row: ApiLineItemRow): LineItem => ({
  id: String(row.id),
  description: row.description,
  quantity: num(row.quantity, 1),
  unitPrice: num(row.unitPrice, 0),
  total: num(row.total, 0),
  notes: row.notes ?? undefined,
  productId: row.productId != null ? String(row.productId) : undefined,
  laborId: row.laborId != null ? String(row.laborId) : undefined,
  type: (row.type as LineItem['type']) ?? undefined,
  itemId: row.itemId ?? undefined,
  groupId: row.groupId != null ? String(row.groupId) : undefined,
  collectionId: row.collectionId != null ? String(row.collectionId) : undefined,
  collectionName: row.collectionName ?? undefined,
});

export const apiGroupToGroup = (row: ApiGroupRow): EstimateGroup => ({
  id: String(row.id),
  name: row.name,
  description: row.description ?? undefined,
  showPrice: row.showPrice,
});

export const apiClientViewSettingsToSettings = (
  row: ApiClientViewSettingsRow
): ClientViewSettings => ({
  displayMode: row.displayMode,
  showItemPrices: row.showItemPrices,
  showGroupPrices: row.showGroupPrices,
  showSubtotal: row.showSubtotal,
  showTax: row.showTax,
  showTotal: row.showTotal,
  hiddenLineItems: (row.hiddenLineItems ?? []).map((id) => String(id)),
});

export const apiRevisionToRevision = (row: ApiRevisionRow): Revision => ({
  revisionNumber: row.revisionNumber,
  date: row.date,
  changes: row.changes,
  modifiedBy: row.modifiedBy,
  previousTotal: num(row.previousTotal),
  newTotal: num(row.newTotal),
  changeType: (row.changeType as Revision['changeType']) ?? undefined,
  modifiedByName: row.modifiedByName ?? undefined,
  details: row.details ?? undefined,
});

export const apiCommunicationToCommunication = (row: ApiCommunicationRow): Communication => ({
  id: String(row.id),
  date: row.date,
  content: row.content,
  createdBy: row.createdBy,
  type: (row.type as Communication['type']) ?? undefined,
  createdByName: row.createdByName ?? undefined,
});

export const apiClientCommentToClientComment = (row: ApiClientCommentRow): ClientComment => ({
  id: String(row.id),
  date: row.date,
  text: row.text,
  authorName: row.authorName,
  authorEmail: row.authorEmail,
  isContractor: row.isContractor,
});

export const apiPictureToPicture = (row: ApiPictureRow): Picture => ({
  id: String(row.id),
  url: row.url,
  description: row.description ?? '',
});

export const apiDocumentToDocument = (row: ApiDocumentRow): EstimateDocument => ({
  id: String(row.id),
  url: row.url,
  description: row.description ?? '',
  fileName: row.fileName ?? undefined,
});

export const apiPaymentToPayment = (row: ApiPaymentRow): PaymentRecord => ({
  id: String(row.id),
  amount: num(row.amount),
  date: row.date,
  method: row.method as PaymentRecord['method'],
  notes: row.notes ?? undefined,
  createdBy: row.createdBy,
  createdAt: row.createdAt,
});

/**
 * Converts a flat list row (no nested detail) into an EstimateWithId with
 * empty arrays for nested collections. Used for GET / (list) responses.
 */
export const apiRowToEstimate = (row: ApiEstimateRow): EstimateWithId => {
  const base: EstimateWithId = {
    id: String(row.id),
    estimateNumber: row.estimateNumber,
    projectId: row.projectId ?? undefined,
    customerId: row.customerId ?? undefined,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone ?? undefined,
    serviceAddress: row.serviceAddress ?? undefined,
    serviceAddress2: row.serviceAddress2 ?? undefined,
    serviceCity: row.serviceCity ?? undefined,
    serviceState: row.serviceState ?? undefined,
    serviceZipCode: row.serviceZipCode ?? undefined,
    type: (row.type as Estimate['type']) ?? undefined,
    lineItems: [],
    collectionId: row.collectionId ?? undefined,
    subtotal: num(row.subtotal),
    discount: num(row.discount),
    discountType: (row.discountType as Estimate['discountType']) ?? undefined,
    tax: num(row.tax),
    taxRate: num(row.taxRate),
    total: num(row.total),
    estimateState: row.estimateState as Estimate['estimateState'],
    clientState: (row.clientState as Estimate['clientState']) ?? undefined,
    parentEstimateId: row.parentEstimateId != null ? String(row.parentEstimateId) : undefined,
    status: (row.status as Estimate['status']) ?? undefined,
    sentDate: row.sentDate ?? undefined,
    viewedDate: row.viewedDate ?? undefined,
    viewCount: row.viewCount ?? 0,
    acceptedDate: row.acceptedDate ?? undefined,
    rejectedDate: row.rejectedDate ?? undefined,
    deniedDate: row.deniedDate ?? undefined,
    denialReason: row.denialReason ?? undefined,
    onHoldDate: row.onHoldDate ?? undefined,
    onHoldReason: row.onHoldReason ?? undefined,
    rejectionReason: row.rejectionReason ?? undefined,
    validUntil: row.validUntil ?? undefined,
    emailToken: row.emailToken ?? undefined,
    clientViewUrl: row.clientViewUrl ?? undefined,
    lastEmailSent: row.lastEmailSent ?? undefined,
    emailSentCount: row.emailSentCount ?? 0,
    contractorEmail: row.contractorEmail ?? undefined,
    clientComments: [],
    clientApprovalStatus: (row.clientApprovalStatus as Estimate['clientApprovalStatus']) ?? undefined,
    clientApprovalDate: row.clientApprovalDate ?? undefined,
    clientApprovalBy: row.clientApprovalBy ?? undefined,
    changeOrders: [],
    changeOrderTotal: row.changeOrderTotal != null ? num(row.changeOrderTotal) : undefined,
    currentRevision: row.currentRevision ?? 0,
    revisionsHistory: [],
    communications: [],
    payments: [],
    createdBy: row.createdBy != null ? String(row.createdBy) : undefined,
    createdAt: row.createdAt ?? undefined,
    updatedAt: row.updatedAt ?? undefined,
    createdDate: row.createdDate ?? undefined,
    notes: row.notes ?? undefined,
    accountId: row.accountId ?? undefined,
    groups: [],
    clientViewSettings: undefined,
    pictures: [],
    documents: [],
  };

  if (row.lineItems) {
    return applyNestedDetail(base, row);
  }

  return base;
};

const applyNestedDetail = (base: EstimateWithId, row: ApiEstimateRow): EstimateWithId => {
  const estimate: EstimateWithId = { ...base };

  estimate.lineItems = (row.lineItems ?? []).map(apiLineItemToLineItem);
  estimate.groups = (row.groups ?? []).map(apiGroupToGroup);
  estimate.clientViewSettings = row.clientViewSettings
    ? apiClientViewSettingsToSettings(row.clientViewSettings)
    : undefined;
  estimate.revisionsHistory = (row.revisionsHistory ?? []).map(apiRevisionToRevision);
  estimate.communications = (row.communications ?? []).map(apiCommunicationToCommunication);
  estimate.clientComments = (row.clientComments ?? []).map(apiClientCommentToClientComment);
  estimate.payments = (row.payments ?? []).map(apiPaymentToPayment);
  estimate.pictures = (row.pictures ?? []).map(apiPictureToPicture);
  estimate.documents = (row.documents ?? []).map(apiDocumentToDocument);

  if (row.paymentSchedule) {
    estimate.paymentSchedule = {
      mode: row.paymentSchedule.mode,
      entries: (row.paymentSchedule.entries ?? []).map((e) => ({
        id: String(e.id),
        description: e.description,
        value: num(e.value),
        dueDate: e.dueDate ?? undefined,
      })),
    };
  }

  return estimate;
};

export const apiDetailRowToEstimate = (row: ApiEstimateRow): EstimateWithId => {
  return apiRowToEstimate(row);
};

/**
 * Builds the { lineItems, groups } portion of a create/update request body
 * from the frontend's LineItem[]/EstimateGroup[] arrays. Frontend-generated
 * string ids (li_..., group ids) are dropped — the backend assigns new
 * SERIAL ids on insert since these are bulk-replace endpoints.
 */
export const lineItemsToApiPayload = (lineItems: LineItem[]) =>
  lineItems.map((li, i) => ({
    description: li.description,
    quantity: li.quantity,
    unitPrice: li.unitPrice,
    total: li.total,
    notes: li.notes ?? null,
    type: li.type ?? null,
    itemId: li.itemId ?? null,
    productId: li.productId ? Number(li.productId) : null,
    laborId: li.laborId ? Number(li.laborId) : null,
    groupId: li.groupId ? Number(li.groupId) : null,
    collectionId: li.collectionId ? Number(li.collectionId) : null,
    collectionName: li.collectionName ?? null,
    sortOrder: i,
  }));

export const groupsToApiPayload = (groups: EstimateGroup[]) =>
  groups.map((g, i) => ({
    name: g.name,
    description: g.description ?? null,
    showPrice: g.showPrice,
    sortOrder: i,
  }));
