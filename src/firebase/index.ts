// src/firebase/index.ts
// Central export file for all Firebase functionality

// Firebase config and services
export { auth, db, storage } from './config';

// Authentication functions
export {
  signUp,
  signIn,
  signOutUser,
  resetPassword,
  onAuthStateChange,
  getCurrentUser,
  isAuthenticated,
  type UserData,
  type AuthResult,
  type AuthError,
} from './auth';

// Database operations
export {
  COLLECTIONS,
  
  // User operations
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  
  // Project operations
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  
  // Product operations
  createProduct,
  getProducts,
  
  // Estimate operations
  createEstimate,
  getEstimates,
  
  // Real-time listeners
  subscribeToProjects,
  
  // Batch operations
  batchUpdateProjects,
  
  // Utility functions
  generateDocumentNumber,
  
  // Types
  type DatabaseResult,
  type UserProfile,
  type Project,
  type Product,
  type Estimate,
  type LineItem,
  type Picture,
  type ProjectFilters,
  type ProductFilters,
  type EstimateFilters,
  type BatchUpdate,
} from './database';

// Storage operations
export {
  uploadEstimateImage,
  deleteEstimateImage,
  uploadEstimateImages,
} from './storage';