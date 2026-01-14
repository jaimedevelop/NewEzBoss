// src/services/clients/clients.types.ts

import { Timestamp } from 'firebase/firestore';

export interface Client {
  id?: string;
  name?: string;
  email?: string;
  phoneMobile?: string;
  phoneOther?: string;
  companyName?: string;
  clientType?: string;
  notes?: string;

  // Billing Address
  billingAddress?: string;
  billingAddress2?: string;
  billingCity?: string;
  billingState?: string;
  billingZipCode?: string;

  // Service Address (optional if same as billing)
  billingEqualToService?: boolean;
  serviceAddress?: string;
  serviceAddress2?: string;
  serviceCity?: string;
  serviceState?: string;
  serviceZipCode?: string;

  // Completeness tracking
  isComplete?: boolean;

  // Metadata
  userId: string;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export interface ClientFilters {
  searchTerm?: string;
  clientType?: string;
}

export interface ClientsResponse {
  clients: Client[];
  hasMore: boolean;
  lastDoc?: any;
}

export interface DatabaseResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}