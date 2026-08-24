// src/services/clients/index.ts

// Types
export type {
  Client,
  ClientFilters,
  ClientsResponse,
  DatabaseResult,
} from './clients.types';

// Queries
export {
  getClient,
  getClients,
  searchClients,
  getClientsGroupedByLetter,
} from './clients.queries';

// Mutations
export {
  createClient,
  bulkCreateClients,
  updateClient,
  deleteClient,
  validatePhoneNumber,
  formatPhoneNumber,
  validateClientData,
  isClientComplete,
} from './clients.mutations';