// src/firebase/database.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  DocumentReference,
  CollectionReference,
  QuerySnapshot,
  DocumentSnapshot,
  Unsubscribe,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { db } from './config';

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  PROJECTS: 'projects',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  ESTIMATES: 'estimates',
  INVOICES: 'invoices',
  LINE_ITEMS: 'lineItems',
  PROJECT_ITEMS: 'projectItems',
  TEMPLATES: 'templates',
  FILES: 'files',
} as const;

// Types
export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  id?: string;
}

export interface UserProfile {
  id?: string;
  email: string;
  displayName: string;
  role: string;
  companyName?: string;
  businessType?: string;
  phone?: string;
  location?: string;
  timezone?: string;
  currency?: string;
  dateFormat?: string;
  onboardingCompleted?: boolean;
  profileCompleted?: boolean;
  isActive: boolean;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export interface Project {
  id?: string;
  name: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  address?: string;
  description?: string;
  project_type?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  estimated_cost?: number;
  actual_cost?: number;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

// Updated Product interface with Trade hierarchy
export interface Product {
  id?: string;
  name: string;
  description?: string;
  sku?: string;
  trade?: string; // NEW - Top level of hierarchy
  section?: string; // Now under trade
  category?: string;
  subcategory?: string;
  unit_price?: number;
  quantity_on_hand?: number;
  product_type?: 'tool' | 'material' | 'equipment' | 'rental';
  is_rental?: boolean;
  rental_daily_rate?: number;
  supplier_info?: string;
  createdAt?: Timestamp | string;
}

export interface Estimate {
  id?: string;
  projectId?: string | null;
  estimateNumber?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  projectDescription?: string;
  lineItems: LineItem[];
  pictures?: Picture[];
  subtotal: number;
  discount: number;
  tax: number;
  depositType: 'none' | 'percentage' | 'amount';
  depositValue: number;
  requestSchedule: boolean;
  total: number;
  validUntil: string;
  notes?: string;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
  createdDate?: string;
}

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Picture {
  id: string;
  url: string;
  description: string;
}

export interface ProjectFilters {
  status?: string;
}

// Updated ProductFilters with trade
export interface ProductFilters {
  trade?: string; // NEW
  category?: string;
  productType?: string;
}

export interface EstimateFilters {
  status?: string;
  projectId?: string;
}

export interface BatchUpdate {
  id: string;
  data: Partial<Project>;
}

// === USER OPERATIONS ===
export const createUserProfile = async (uid: string, userData: Partial<UserProfile>): Promise<DatabaseResult> => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(userRef, {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    // If document doesn't exist, create it
    try {
      const userRef = doc(db, COLLECTIONS.USERS, uid);
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    } catch (createError) {
      console.error('Error creating user profile:', createError);
      return { success: false, error: createError };
    }
  }
};

export const getUserProfile = async (uid: string): Promise<DatabaseResult<UserProfile>> => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const userSnap: DocumentSnapshot = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { success: true, data: { id: userSnap.id, ...userSnap.data() } as UserProfile };
    } else {
      return { success: false, error: 'User profile not found' };
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, error };
  }
};

export const updateUserProfile = async (uid: string, userData: Partial<UserProfile>): Promise<DatabaseResult> => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error };
  }
};

// === PROJECTS OPERATIONS ===
export const createProject = async (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<DatabaseResult> => {
  try {
    const projectRef: DocumentReference = await addDoc(collection(db, COLLECTIONS.PROJECTS), {
      ...projectData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, id: projectRef.id };
  } catch (error) {
    console.error('Error creating project:', error);
    return { success: false, error };
  }
};

export const getProjects = async (userId?: string, filters: ProjectFilters = {}): Promise<DatabaseResult<Project[]>> => {
  try {
    let q = collection(db, COLLECTIONS.PROJECTS);
    
    // Add filters
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    // Order by creation date (newest first)
    q = query(q, orderBy('createdAt', 'desc'));
    
    const querySnapshot: QuerySnapshot = await getDocs(q);
    const projects: Project[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Project[];
    
    return { success: true, data: projects };
  } catch (error) {
    console.error('Error getting projects:', error);
    return { success: false, error };
  }
};

export const getProject = async (projectId: string): Promise<DatabaseResult<Project>> => {
  try {
    const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectSnap: DocumentSnapshot = await getDoc(projectRef);
    
    if (projectSnap.exists()) {
      return { success: true, data: { id: projectSnap.id, ...projectSnap.data() } as Project };
    } else {
      return { success: false, error: 'Project not found' };
    }
  } catch (error) {
    console.error('Error getting project:', error);
    return { success: false, error };
  }
};

export const updateProject = async (projectId: string, projectData: Partial<Project>): Promise<DatabaseResult> => {
  try {
    const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    await updateDoc(projectRef, {
      ...projectData,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating project:', error);
    return { success: false, error };
  }
};

export const deleteProject = async (projectId: string): Promise<DatabaseResult> => {
  try {
    const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    await deleteDoc(projectRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting project:', error);
    return { success: false, error };
  }
};

// === PRODUCTS OPERATIONS ===
export const createProduct = async (productData: Omit<Product, 'id' | 'createdAt'>): Promise<DatabaseResult> => {
  try {
    const productRef: DocumentReference = await addDoc(collection(db, COLLECTIONS.PRODUCTS), {
      ...productData,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: productRef.id };
  } catch (error) {
    console.error('Error creating product:', error);
    return { success: false, error };
  }
};

export const getProducts = async (filters: ProductFilters = {}): Promise<DatabaseResult<Product[]>> => {
  try {
    let q = collection(db, COLLECTIONS.PRODUCTS);
    
    // Updated filters with trade
    if (filters.trade) {
      q = query(q, where('trade', '==', filters.trade));
    }
    
    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }
    
    if (filters.productType) {
      q = query(q, where('productType', '==', filters.productType));
    }
    
    q = query(q, orderBy('name', 'asc'));
    
    const querySnapshot: QuerySnapshot = await getDocs(q);
    const products: Product[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Product[];
    
    return { success: true, data: products };
  } catch (error) {
    console.error('Error getting products:', error);
    return { success: false, error };
  }
};

// === ESTIMATES OPERATIONS ===
export const createEstimate = async (estimateData: Omit<Estimate, 'id' | 'createdAt'>): Promise<DatabaseResult> => {
  try {
    const estimateRef: DocumentReference = await addDoc(collection(db, COLLECTIONS.ESTIMATES), {
      ...estimateData,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: estimateRef.id };
  } catch (error) {
    console.error('Error creating estimate:', error);
    return { success: false, error };
  }
};

export const getEstimates = async (filters: EstimateFilters = {}): Promise<DatabaseResult<Estimate[]>> => {
  try {
    let q = collection(db, COLLECTIONS.ESTIMATES);
    
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    if (filters.projectId) {
      q = query(q, where('projectId', '==', filters.projectId));
    }
    
    q = query(q, orderBy('createdAt', 'desc'));
    
    const querySnapshot: QuerySnapshot = await getDocs(q);
    const estimates: Estimate[] = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Estimate[];
    
    return { success: true, data: estimates };
  } catch (error) {
    console.error('Error getting estimates:', error);
    return { success: false, error };
  }
};

// === REAL-TIME LISTENERS ===
export const subscribeToProjects = (callback: (projects: Project[]) => void, filters: ProjectFilters = {}): Unsubscribe | null => {
  try {
    let q = collection(db, COLLECTIONS.PROJECTS);
    
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    q = query(q, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (querySnapshot: QuerySnapshot) => {
      const projects: Project[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Project[];
      callback(projects);
    });
  } catch (error) {
    console.error('Error subscribing to projects:', error);
    return null;
  }
};

// === BATCH OPERATIONS ===
export const batchUpdateProjects = async (updates: BatchUpdate[]): Promise<DatabaseResult> => {
  try {
    const batch = writeBatch(db);
    
    updates.forEach(({ id, data }) => {
      const projectRef = doc(db, COLLECTIONS.PROJECTS, id);
      batch.update(projectRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    });
    
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error batch updating projects:', error);
    return { success: false, error };
  }
};

// === UTILITY FUNCTIONS ===
export const generateDocumentNumber = async (collectionName: string, prefix: string = ''): Promise<string> => {
  try {
    const q = query(collection(db, collectionName), orderBy('createdAt', 'desc'), limit(1));
    const querySnapshot: QuerySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return `${prefix}001`;
    }
    
    const lastDoc = querySnapshot.docs[0];
    const lastNumber = lastDoc.data().number || `${prefix}000`;
    const numberPart = parseInt(lastNumber.replace(prefix, '')) + 1;
    
    return `${prefix}${numberPart.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating document number:', error);
    return `${prefix}${Date.now()}`;
  }
};